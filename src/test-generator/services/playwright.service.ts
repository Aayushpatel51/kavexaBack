import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';
import {
  SiteAnalysis,
  TestCaseResult,
  ScreenshotData,
} from '../interfaces/types';

@Injectable()
export class PlaywrightService {
  private readonly logger = new Logger(PlaywrightService.name);
  private readonly runsDir: string;

  constructor() {
    this.runsDir = path.resolve(process.env.RUNS_DIR || './test-runs');
    fs.mkdirSync(this.runsDir, { recursive: true });
  }

  /* ═══════════════════════════════════════════════════════
     1.  SITE ANALYSIS — scrape the live page so Claude
         can generate accurate selectors
     ═══════════════════════════════════════════════════════ */

  async analyzeSite(url: string): Promise<SiteAnalysis> {
    this.logger.log(`Analyzing site: ${url}`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      // give JS a moment to render
      await page.waitForTimeout(2000);

      const analysis: SiteAnalysis = await page.evaluate(() => {
        const txt = (el: Element | null) => el?.textContent?.trim() || '';

        /* headings */
        const headings = Array.from(
          document.querySelectorAll('h1,h2,h3'),
        ).map((h) => ({ level: h.tagName, text: txt(h) }));

        /* links */
        const links = Array.from(document.querySelectorAll('a[href]'))
          .map((a) => ({
            text: txt(a),
            href: a.getAttribute('href') || '',
          }))
          .filter((l) => l.text);

        /* buttons */
        const buttons = Array.from(
          document.querySelectorAll(
            'button, input[type="submit"], input[type="button"], [role="button"]',
          ),
        ).map((b) => ({
          text: txt(b) || (b as HTMLInputElement).value || '',
          type: b.getAttribute('type') || 'button',
          ariaLabel: b.getAttribute('aria-label') || '',
        }));

        /* inputs */
        const inputs = Array.from(
          document.querySelectorAll('input,textarea,select'),
        )
          .map((el) => {
            const i = el as HTMLInputElement;
            const lbl =
              document.querySelector(`label[for="${i.id}"]`)?.textContent?.trim() ||
              '';
            return {
              type: i.type || el.tagName.toLowerCase(),
              name: i.name || '',
              placeholder: i.placeholder || '',
              label: lbl,
              required: i.required,
            };
          })
          .filter((i) => !['hidden'].includes(i.type));

        /* forms */
        const forms = Array.from(document.querySelectorAll('form')).map(
          (f) => ({
            id: f.id || '',
            action: f.action || '',
            method: f.method || 'GET',
          }),
        );

        /* nav items */
        const navigationItems = Array.from(
          document.querySelectorAll('nav a, [role="navigation"] a'),
        )
          .map((a) => txt(a))
          .filter(Boolean);

        return {
          url: window.location.href,
          title: document.title,
          metaDescription:
            document
              .querySelector('meta[name="description"]')
              ?.getAttribute('content') || '',
          headings: headings.slice(0, 20),
          links: links.slice(0, 30),
          buttons: buttons.slice(0, 20),
          inputs: inputs.slice(0, 20),
          forms: forms.slice(0, 10),
          navigationItems: navigationItems.slice(0, 15),
          visibleText: document.body.innerText.substring(0, 3000),
        };
      });

      return analysis;
    } finally {
      await browser.close();
    }
  }

  /* ═══════════════════════════════════════════════════════
     2.  TEST EXECUTION
     ═══════════════════════════════════════════════════════ */

  createRunDir(): { runId: string; runDir: string } {
    const runId = uuid();
    const runDir = path.join(this.runsDir, runId);
    const ssDir = path.join(runDir, 'screenshots');
    fs.mkdirSync(ssDir, { recursive: true });
    return { runId, runDir };
  }

  async executeTests(
    runDir: string,
    playwrightCode: string,
    url: string,
    credentials?: { username: string; password: string },
    browserName = 'chromium',
  ): Promise<{ testCases: TestCaseResult[]; screenshots: ScreenshotData[]; errors: string[] }> {
    /* ── write spec file ── */
    const specPath = path.join(runDir, 'generated.spec.ts');
    fs.writeFileSync(specPath, playwrightCode, 'utf-8');

    /* ── write playwright config ── */
    const configContent = this.buildPlaywrightConfig(browserName);
    const configPath = path.join(runDir, 'playwright.config.ts');
    fs.writeFileSync(configPath, configContent, 'utf-8');

    /* ── build env ── */
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      BASE_URL: url,
      ARTIFACT_DIR: path.join(runDir, 'screenshots'),
    };
    if (credentials) {
      env.TEST_USERNAME = credentials.username;
      env.TEST_PASSWORD = credentials.password;
    }

    /* ── run playwright ── */
    this.logger.log('Running Playwright tests …');
    const { exitCode, stdout, stderr } = await this.runPlaywrightCLI(
      runDir,
      configPath,
      env,
    );
    this.logger.log(`Playwright exited with code ${exitCode}`);

    /* ── parse results ── */
    const reportPath = path.join(runDir, 'report.json');
    const testCases = this.parseJsonReport(reportPath);
    const screenshots = this.collectScreenshots(
      path.join(runDir, 'screenshots'),
    );

    const errors: string[] = [];
    if (exitCode !== 0 && testCases.length === 0) {
      // Playwright itself crashed (compilation error, etc.)
      errors.push(stderr || stdout || `Playwright exited with code ${exitCode}`);
    }

    return { testCases, screenshots, errors };
  }

  /* ─── helpers ─── */

  private buildPlaywrightConfig(browserName: string): string {
    return `
    import { defineConfig } from '@playwright/test';
    
    export default defineConfig({
      testDir: '.',
      testMatch: '*.spec.ts',
      timeout: 60_000,
      expect: { timeout: 10_000 },
      fullyParallel: false,
      retries: 0,
      workers: 1,
      reporter: [['json', { outputFile: 'report.json' }]],
      use: {
        headless: true,
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
        screenshot: 'off',        // we handle screenshots manually
        trace: 'retain-on-failure',
      },
      projects: [
        {
          name: '${browserName}',
          use: { browserName: '${browserName}' },
        },
      ],
    });
    `;
  }

  private runPlaywrightCLI(
    cwd: string,
    configPath: string,
    env: Record<string, string>,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const proc = spawn(
        'npx',
        ['playwright', 'test', `--config=${configPath}`],
        { cwd, env, shell: true },
      );

      proc.stdout.on('data', (d) => (stdout += d.toString()));
      proc.stderr.on('data', (d) => (stderr += d.toString()));

      proc.on('close', (code) =>
        resolve({ exitCode: code ?? 1, stdout, stderr }),
      );

      // hard kill after 3 min
      setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch {}
      }, 180_000);
    });
  }

  /* ─── JSON report parser ─── */

  private parseJsonReport(reportPath: string): TestCaseResult[] {
    if (!fs.existsSync(reportPath)) {
      this.logger.warn('report.json not found — Playwright may have crashed');
      return [];
    }

    try {
      const raw = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      const results: TestCaseResult[] = [];

      const walkSuites = (suites: any[]) => {
        for (const suite of suites) {
          if (suite.specs) {
            for (const spec of suite.specs) {
              for (const t of spec.tests || []) {
                const r = t.results?.[0];
                results.push({
                  title: spec.title,
                  status: r?.status || 'skipped',
                  duration: r?.duration || 0,
                  error: r?.errors?.map((e: any) => e.message).join('\n') || undefined,
                });
              }
            }
          }
          if (suite.suites) walkSuites(suite.suites);
        }
      };

      walkSuites(raw.suites || []);
      return results;
    } catch (err) {
      this.logger.error('Failed to parse report.json', err);
      return [];
    }
  }

  /* ─── screenshot collector ─── */

  private collectScreenshots(dir: string): ScreenshotData[] {
    if (!fs.existsSync(dir)) return [];

    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.png'))
      .sort()
      .map((f) => ({
        name: f,
        base64: fs.readFileSync(path.join(dir, f)).toString('base64'),
      }));
  }
}