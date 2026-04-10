import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { SiteAnalysis, ClaudeGeneratedOutput } from '../interfaces/types';

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /* ─── public entry point ─── */

  async generateTests(
    url: string,
    testContext: string,
    siteAnalysis: SiteAnalysis,
    hasCredentials: boolean,
  ): Promise<ClaudeGeneratedOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      url,
      testContext,
      siteAnalysis,
      hasCredentials,
    );

    this.logger.log('Calling Claude to generate test plan + code …');

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return this.parseResponse(text);
  }

  /* ─── system prompt ─── */

  //   private buildSystemPrompt(): string {
  //     return `You are an expert QA automation engineer who writes Playwright tests in TypeScript.

  // HARD RULES — follow every one:
  // 1.  Import ONLY from "@playwright/test", "path", and "fs".
  // 2.  Read the target URL from  process.env.BASE_URL  (never hard-code it).
  // 3.  If credentials are needed, read them from
  //       process.env.TEST_USERNAME   and   process.env.TEST_PASSWORD
  //     NEVER hard-code credentials.
  // 4.  Include the EXACT screenshot helper shown below at the top of the file.
  // 5.  Call  takeScreenshot(page, '<descriptive-step-name>')  after EVERY
  //     significant action (navigation, click, fill, assert, etc.).
  // 6.  Wrap the body of every test(...) in try/catch.
  //     In the catch block:
  //       a) await takeScreenshot(page, 'ERROR-<test-name>');
  //       b) re-throw the error.
  // 7.  Use Playwright best practices: role-based locators
  //     (getByRole, getByLabel, getByText, getByPlaceholder),
  //     web-first assertions (expect(locator).toBeVisible(), etc.).
  // 8.  Each test must be independent.
  // 9.  Use  test.describe(...)  to group related tests.
  // 10. Keep tests realistic — only test things that make sense for the page structure provided.

  // SCREENSHOT HELPER — paste this verbatim at the top of the generated file:

  // \`\`\`
  // import { test, expect, Page } from '@playwright/test';
  // import path from 'path';
  // import fs from 'fs';

  // const BASE_URL = process.env.BASE_URL || '';
  // const ARTIFACT_DIR = process.env.ARTIFACT_DIR || './screenshots';

  // function ensureDir(dir: string) {
  //   if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // }

  // let screenshotCounter = 0;
  // async function takeScreenshot(page: Page, stepName: string) {
  //   ensureDir(ARTIFACT_DIR);
  //   screenshotCounter++;
  //   const safeName = stepName.replace(/[^a-zA-Z0-9_-]/g, '_');
  //   const fileName = \\\`\\\${String(screenshotCounter).padStart(3,'0')}_\\\${safeName}.png\\\`;
  //   await page.screenshot({
  //     path: path.join(ARTIFACT_DIR, fileName),
  //     fullPage: true,
  //   });
  // }
  // \`\`\`

  // OUTPUT FORMAT — return ONLY raw JSON (no markdown fences, no explanation outside JSON):
  // {
  //   "testPlan": [
  //     {
  //       "id": "TC-001",
  //       "title": "...",
  //       "description": "...",
  //       "steps": ["Step 1", "Step 2"],
  //       "expectedResult": "..."
  //     }
  //   ],
  //   "playwrightCode": "<full TypeScript file as a single string>"
  // }`;
  //   }

  private buildSystemPrompt(): string {
    return `Expert QA automation engineer. Write Playwright tests in TypeScript.

HARD RULES:
1.  Import ONLY from "@playwright/test", "path", "fs".
2.  Read target URL from process.env.BASE_URL — never hard-code.
3.  Credentials from process.env.TEST_USERNAME and process.env.TEST_PASSWORD — never hard-code.
4.  Include EXACT screenshot helper below at top of file.
5.  Call takeScreenshot(page, '<descriptive-step-name>') after EVERY significant action (navigation, click, fill, assert).
6.  Wrap every test(...) body in try/catch.
    Catch block:
      a) await takeScreenshot(page, 'ERROR-<test-name>');
      b) re-throw error.
7.  Use role-based locators (getByRole, getByLabel, getByText, getByPlaceholder), web-first assertions (expect(locator).toBeVisible()).
8.  Each test must be independent.
9.  Use test.describe(...) to group related tests.
10. Only test things that make sense for page structure provided.

SCREENSHOT HELPER — paste verbatim at top of generated file:

\`\`\`
import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || '';
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || './screenshots';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let screenshotCounter = 0;
async function takeScreenshot(page: Page, stepName: string) {
  ensureDir(ARTIFACT_DIR);
  screenshotCounter++;
  const safeName = stepName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = \\\`\\\${String(screenshotCounter).padStart(3,'0')}_\\\${safeName}.png\\\`;
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, fileName),
    fullPage: true,
  });
}
\`\`\`

OUTPUT — return ONLY raw JSON (no markdown, no explanation outside JSON):
{
  "testPlan": [
    {
      "id": "TC-001",
      "title": "...",
      "description": "...",
      "steps": ["Step 1", "Step 2"],
      "expectedResult": "..."
    }
  ],
  "playwrightCode": "<full TypeScript file as single string>"
}`;
  }

  /* ─── user prompt ─── */

  private buildUserPrompt(
    url: string,
    testContext: string,
    site: SiteAnalysis,
    hasCredentials: boolean,
  ): string {
    return `
Generate Playwright tests for the following:

TARGET URL : ${url}
TEST CONTEXT : ${testContext}
CREDENTIALS AVAILABLE : ${hasCredentials ? 'Yes — use process.env.TEST_USERNAME / TEST_PASSWORD' : 'No'}

PAGE ANALYSIS (scraped from the live site):
  Title         : ${site.title}
  Meta desc     : ${site.metaDescription}
  Headings      : ${JSON.stringify(site.headings.slice(0, 15))}
  Buttons       : ${JSON.stringify(site.buttons.slice(0, 15))}
  Input fields  : ${JSON.stringify(site.inputs.slice(0, 15))}
  Forms         : ${JSON.stringify(site.forms.slice(0, 10))}
  Links (sample): ${JSON.stringify(site.links.slice(0, 15))}
  Nav items     : ${JSON.stringify(site.navigationItems.slice(0, 10))}
  Visible text  : ${site.visibleText.substring(0, 2000)}

Based on the TEST CONTEXT and the PAGE ANALYSIS above, generate a comprehensive
set of tests.  Return the JSON object described in the system prompt — nothing else.`;
  }

  /* ─── response parser ─── */

  private parseResponse(raw: string): ClaudeGeneratedOutput {
    try {
      // Claude sometimes wraps JSON in ```json ... ```. Strip that.
      let cleaned = raw.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned
          .replace(/^```(?:json)?\n?/, '')
          .replace(/\n?```$/, '');
      }
      const parsed = JSON.parse(cleaned);

      if (!parsed.testPlan || !parsed.playwrightCode) {
        throw new Error(
          'Claude response missing testPlan or playwrightCode fields',
        );
      }

      return {
        testPlan: parsed.testPlan,
        playwrightCode: parsed.playwrightCode,
      };
    } catch (err) {
      this.logger.error('Failed to parse Claude response', raw);
      // Fallback: try to extract code block from raw text
      const codeMatch = raw.match(
        /```(?:typescript|ts)?\n([\s\S]*?)```/,
      );
      return {
        testPlan: [
          {
            id: 'TC-001',
            title: 'Auto-generated test',
            description: 'Parsed from raw Claude response (fallback)',
            steps: [],
            expectedResult: 'See generated code',
          },
        ],
        playwrightCode: codeMatch ? codeMatch[1] : raw,
      };
    }
  }
}