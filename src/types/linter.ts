type LinkLintResult = {
  status: LintStatus;
  link: string;
  codeLocation: CodeLocation;
  checks: LintCheck[];
};

type ImageLintResult = {
  status: LintStatus;
  source: string;
  codeLocation: CodeLocation;
  checks: LintCheck[];
};

type MarkupLintResult = {
  status: LintStatus;
  label: string;
  codeLocation: CodeLocation;
  checks: LintCheck[];
};

export type CodeLocation = {
  line: number;
  column: number;
};

export type LintStatus = 'error' | 'warning' | 'info' | 'success';

export type LintCheck = {
  passed: boolean;
  type:
    | 'accessibility'
    | 'client_limit'
    | 'email_best_practice'
    | 'image_size'
    | 'security'
    | 'syntax';
  metadata?: {
    byteCount?: number;
    detail?: string;
  };
};

export type LintingRow =
  | {
      source: 'link';
      result: LinkLintResult;
    }
  | {
      source: 'image';
      result: ImageLintResult;
    }
  | {
      source: 'markup';
      result: MarkupLintResult;
    };
