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
      result: {
        status: LintStatus;
        link: string;
        codeLocation: CodeLocation;
        checks: LintCheck[];
      };
    }
  | {
      source: 'image';
      result: {
        status: LintStatus;
        source: string;
        codeLocation: CodeLocation;
        checks: LintCheck[];
      };
    }
  | {
      source: 'markup';
      result: {
        status: LintStatus;
        label: string;
        codeLocation: CodeLocation;
        checks: LintCheck[];
      };
    };

export type CompatibilityResult = {
  title: string;
  category: 'css' | 'html' | 'image' | 'others';
  unsupportedClients: string[];
  url: string;
  source: string;
  location: CodeLocation;
};
