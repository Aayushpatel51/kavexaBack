/* ───── Site analysis (fed to Claude for better selectors) ───── */

export interface SiteAnalysis {
  url: string;
  title: string;
  metaDescription: string;
  headings: { level: string; text: string }[];
  links: { text: string; href: string }[];
  buttons: { text: string; type: string; ariaLabel: string }[];
  inputs: {
    type: string;
    name: string;
    placeholder: string;
    label: string;
    required: boolean;
  }[];
  forms: { id: string; action: string; method: string }[];
  navigationItems: string[];
  visibleText: string; // truncated
}

/* ───── Claude response ───── */

export interface TestPlanItem {
  id: string;
  title: string;
  description: string;
  steps: string[];
  expectedResult: string;
}

export interface ClaudeGeneratedOutput {
  testPlan: TestPlanItem[];
  playwrightCode: string;
}

/* ───── Final API response ───── */

export interface ScreenshotData {
  name: string;
  base64: string;
}

export interface TestCaseResult {
  title: string;
  status: 'passed' | 'failed' | 'timedOut' | 'skipped';
  duration: number;
  error?: string;
}

export interface TestRunResponse {
  data: {
    runId: string;
    summary: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      durationMs: number;
    };
    testCases: TestCaseResult[];
    testPlan: TestPlanItem[];
    screenshots: ScreenshotData[];
    generatedScript: string;
    localRunInstructions: string;
    
  }
  success: boolean;
  errors: string[];
}