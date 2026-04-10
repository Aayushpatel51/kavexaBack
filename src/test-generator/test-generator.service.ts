import { Injectable, Logger, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { ClaudeService } from './services/claude.service';
import { PlaywrightService } from './services/playwright.service';
import { TestRequestDto } from './dto/test-request.dto';
import { TestRunResponse } from './interfaces/types';
import { PrismaService } from 'src/prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import archiver from 'archiver';
import { Response } from 'express';
import { ChatHistory } from 'generated/prisma/client';
import { ChatHistoryResponseDto } from './dto/get-chat-history.dto';

@Injectable()
export class TestGeneratorService {
  private readonly logger = new Logger(TestGeneratorService.name);
  private readonly runsDir = path.join(process.cwd(), 'test-runs');


  constructor(
    private readonly claude: ClaudeService,
    private readonly pw: PlaywrightService,
    private readonly prismaService: PrismaService
  ) { }

  async generateAndRun(dto: TestRequestDto, userId: number): Promise<TestRunResponse> {
    const { url, testContext, credentials, browser } = dto;


    /* ── 1. create isolated run directory ── */
    const { runId, runDir } = this.pw.createRunDir();
    this.logger.log(`Run ${runId} started for ${url}`, userId);

    /* ── 2. analyse the live site ── */
    let siteAnalysis;
    try {
      siteAnalysis = await this.pw.analyzeSite(url);
    } catch (err) {
      throw new HttpException(
        `Could not reach the site: ${(err as Error).message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }


    /* ── 3. ask Claude to generate tests ── */
    const generated = await this.claude.generateTests(
      url,
      testContext,
      siteAnalysis,
      !!credentials,
    );

    /* ── 4. execute generated tests ── */
    const { testCases, screenshots, errors } = await this.pw.executeTests(
      runDir,
      generated.playwrightCode,
      url,
      credentials,
      browser || 'chromium',
    );

    /* ── 5. build response ── */
    const passed = testCases.filter((t) => t.status === 'passed').length;
    const failed = testCases.filter((t) => t.status === 'failed').length;
    const skipped = testCases.filter((t) => t.status === 'skipped').length;

    const response: TestRunResponse = {
      data: {
        runId,
        summary: {
          total: testCases.length,
          passed,
          failed,
          skipped,
          durationMs: testCases.reduce((s, t) => s + t.duration, 0),
        },
        testCases,
        testPlan: generated.testPlan,
        screenshots,
        generatedScript: generated.playwrightCode,
        localRunInstructions: this.buildLocalInstructions(url, !!credentials),
      },
      success: failed === 0 && errors.length === 0,
      errors,
    };

   await this.prismaService.testReport.create({
      data: {
        runId: parseInt(runId),
        totalTest: testCases.length,
        passedTest: passed,
        failedTest: failed,
        skipped,
        userId
      }
    })

    await this.prismaService.chatHistory.create({
      data: {
        userId,
        userMessage: `URL: ${url}\nContext: ${testContext}\nCredentials provided: ${!!credentials}`,
        AiMessage: JSON.parse(JSON.stringify(response.data))       
      }
    })


    this.logger.log(
      `Run ${runId} finished — ${passed} passed, ${failed} failed`,
    );
    return response;
  }

  /* ─── markdown instructions so the user can re-run locally ─── */

  private buildLocalInstructions(
    url: string,
    hasCredentials: boolean,
  ): string {
    return `
      ## Run locally

      \`\`\`bash
      # 1. Save the "generatedScript" field to a file
      mkdir my-tests && cd my-tests
      # paste the code into generated.spec.ts

      # 2. Init project & install deps
      npm init -y
      npm install -D @playwright/test
      npx playwright install chromium

      # 3. Create playwright.config.ts
      cat <<'EOF' > playwright.config.ts
      import { defineConfig } from "@playwright/test";
      export default defineConfig({
        testMatch: "*.spec.ts",
        timeout: 60000,
        use: { headless: false },          // set true for CI
        reporter: [["html", { open: "never" }]],
      });
      EOF

      # 4. Set env vars
      export BASE_URL="${url}"
      export ARTIFACT_DIR="./screenshots"
      ${hasCredentials ? 'export TEST_USERNAME="your_username"\nexport TEST_PASSWORD="your_password"' : ''}

      # 5. Run
      npx playwright test generated.spec.ts

      # 6. View report
      npx playwright show-report
      \`\`\`
      `.trim();
  }

  async getDashboardStats(userId: number) {
    const result = await this.prismaService.testReport.aggregate({
      where: {
        userId: userId,
      },
      _sum: {
        totalTest: true,
        passedTest: true,
        failedTest: true,
        skipped: true,
      },
    });

    return {
      totalTest: result._sum.totalTest || 0,
      passedTest: result._sum.passedTest || 0,
      failedTest: result._sum.failedTest || 0,
      skipped: result._sum.skipped || 0,
    };
  }

  async streamZip(id: string, res: Response): Promise<void> {
    const runDir = path.join(this.runsDir, id);

    // Guard: check folder exists
    if (!fs.existsSync(runDir)) {
      throw new NotFoundException(`Run with id ${id} not found`);
    }

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="run-${id}.zip"`);

    // Create zip archive and pipe to response
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    // Add entire folder contents into zip
    archive.directory(runDir, false);

    await archive.finalize();
  }

  async getChatHistoryByUser(userId: number): Promise<ChatHistoryResponseDto> {
    const data = await this.prismaService.chatHistory.findMany({
      where: { userId },
      orderBy: { created_at: 'asc' },
    });
  
    return {
      success: true,
      status: 200,
      data,
    };
  }
}