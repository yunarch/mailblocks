import { useCallback, useEffect, useState } from 'react';
import { MdRefresh } from 'react-icons/md';
import { useAppContext } from '@/providers/AppContextProvider';
import { LintingRow } from '@/types/linter';
import { Button } from '@/ui/Button';
import { Stack } from '@/ui/Stack';
import { Tabs } from '@/ui/Tabs';
import { Tag } from '@/ui/Tag';
import { Typography } from '@/ui/Typography';
import { lintEmailMarkup } from '@/utils/lintEmailMarkup';
import {
  CompatibilityResult,
  LinterCompatibility,
} from './components/LinterCompatibility';
import { LinterMarkup } from './components/LinterMarkup';
import { LinterSpam, SpamCheckingResult } from './components/LinterSpam';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

const compatibilityResults: CompatibilityResult[] = [
  {
    title: 'background-image',
    unsupportedClients: ['Outlook 2019', 'Outlook 2021', 'Windows Mail'],
    url: 'https://www.caniemail.com/features/css-background-image/',
    location: { line: 18, column: 6 },
  },
  {
    title: 'border-radius',
    unsupportedClients: ['Outlook 2019', 'Outlook 2021'],
    url: 'https://www.caniemail.com/features/css-border-radius/',
    location: { line: 27, column: 10 },
  },
];

const spamResult: SpamCheckingResult = {
  checks: [
    {
      name: 'HTML_MESSAGE',
      description: 'HTML included in message',
      points: 0,
    },
    {
      name: 'MIME_HTML_ONLY',
      description: 'Message only has text/html MIME parts',
      points: 0.1,
    },
    {
      name: 'HTML_IMAGE_RATIO_02',
      description: 'HTML has a low ratio of text to image area',
      points: 0.7,
    },
    {
      name: 'MISSING_HEADERS',
      description: 'Missing To: header',
      points: 0.5,
    },
  ],
  isSpam: false,
  points: 1.3,
};

// Component
export const EmailLinterPanel = () => {
  const { editorRef, selectedTemplate } = useAppContext();
  const [activeTab, setActiveTab] = useState(0);
  const [lintingRows, setLintingRows] = useState<LintingRow[] | undefined>();
  const [linterLoading, setLinterLoading] = useState(false);

  const runLinter = useCallback(async () => {
    if (!editorRef.current) {
      setLintingRows(undefined);
      return;
    }

    setLinterLoading(true);
    try {
      const markup = await editorRef.current.getEmailHTML();
      setLintingRows(lintEmailMarkup(markup));
    } finally {
      setLinterLoading(false);
    }
  }, [editorRef]);

  useEffect(() => {
    if (activeTab !== 0) return;
    void runLinter();
  }, [activeTab, runLinter, selectedTemplate.id]);

  return (
    <Stack className="h-52 border-t border-gray-200 dark:border-white/10">
      <Stack className="flex-row items-center justify-between border-b border-gray-200 pr-4 dark:border-white/10">
        <Tabs
          activeItem={activeTab}
          items={[
            {
              label: 'Lint Markup',
              trailingContent: <Tag label={String(lintingRows?.length ?? 0)} />,
            },
            {
              label: 'Compatibility',
              trailingContent: (
                <Tag label={String(compatibilityResults.length)} />
              ),
            },
            {
              label: 'Spam',
              trailingContent: (
                <Tag label={`${(10 - spamResult.points).toFixed(1)}/10`} />
              ),
            },
          ]}
          onChange={(index) => {
            setActiveTab(index);
          }}
        />
        <Stack className="flex-row items-center gap-2">
          <Typography variant="bodySm" tone="muted">
            Generated output checks
          </Typography>
          <Button
            aria-label="Refresh linter"
            title="Refresh linter"
            variant="ghost"
            disabled={linterLoading}
            onClick={() => {
              void runLinter();
            }}
          >
            <MdRefresh />
          </Button>
        </Stack>
      </Stack>
      <Stack className="flex-1 overflow-y-auto px-4 py-2">
        {activeTab === 0 && (
          <LinterMarkup rows={lintingRows} loading={linterLoading} />
        )}
        {activeTab === 1 && (
          <LinterCompatibility results={compatibilityResults} />
        )}
        {activeTab === 2 && <LinterSpam result={spamResult} />}
      </Stack>
    </Stack>
  );
};
