import { useCallback, useEffect, useState } from 'react';
import { MdRefresh } from 'react-icons/md';
import { useAppContext } from '@/providers/AppContextProvider';
import type {
  CompatibilityResult,
  LintingRow,
  SpamCheckingResult,
} from '@/types/linter';
import { Button } from '@/ui/Button';
import { ResizablePanel } from '@/ui/ResizablePanel';
import { Stack } from '@/ui/Stack';
import { Tabs } from '@/ui/Tabs';
import { Tag } from '@/ui/Tag';
import { Typography } from '@/ui/Typography';
import {
  DEFAULT_EMAIL_CLIENTS,
  lintEmailCompatibility,
} from '@/utils/lintEmailCompatibility';
import { lintEmailMarkup } from '@/utils/lintEmailMarkup';
import { lintEmailSpam } from '@/utils/lintEmailSpam';
import { LinterCompatibility } from './components/LinterCompatibility';
import { LinterMarkup } from './components/LinterMarkup';
import { LinterSpam } from './components/LinterSpam';

/**
 * Computes the maximum panel height so the editor above keeps usable space.
 *
 * @returns The maximum panel height in pixels.
 */
function getMaxPanelHeight() {
  return window.innerHeight * 0.7;
}

// Component
export const EmailLinterPanel = () => {
  const { editorRef, editorVersion } = useAppContext();
  const [activeTab, setActiveTab] = useState(0);
  const [lintingRows, setLintingRows] = useState<LintingRow[] | undefined>();
  const [linterLoading, setLinterLoading] = useState(false);
  const [compatibilityResults, setCompatibilityResults] = useState<
    CompatibilityResult[] | undefined
  >();
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);
  const [spamResult, setSpamResult] = useState<
    SpamCheckingResult | undefined
  >();
  const [spamLoading, setSpamLoading] = useState(false);
  const [selectedEmailClients, setSelectedEmailClients] = useState(
    () => new Set(DEFAULT_EMAIL_CLIENTS)
  );
  const isActiveTabLoading =
    (activeTab === 0 && linterLoading) ||
    (activeTab === 1 && compatibilityLoading) ||
    (activeTab === 2 && spamLoading);

  // Methods
  const runLinterMarkup = useCallback(async () => {
    try {
      if (!editorRef.current?.editor) {
        setLintingRows(undefined);
        return;
      }
      setLinterLoading(true);
      const markup = await editorRef.current.getEmailHTML();
      setLintingRows(lintEmailMarkup(markup));
    } finally {
      setLinterLoading(false);
    }
  }, [editorRef]);
  const runLinterCompatibility = useCallback(async () => {
    try {
      if (!editorRef.current?.editor) {
        setCompatibilityResults(undefined);
        return;
      }
      setCompatibilityLoading(true);
      const markup = await editorRef.current.getEmailHTML();
      setCompatibilityResults(
        lintEmailCompatibility(markup, selectedEmailClients)
      );
    } finally {
      setCompatibilityLoading(false);
    }
  }, [editorRef, selectedEmailClients]);
  const runLinterSpam = useCallback(async () => {
    try {
      if (!editorRef.current?.editor) {
        setSpamResult(undefined);
        return;
      }
      setSpamLoading(true);
      const email = await editorRef.current.getEmail();
      setSpamResult(lintEmailSpam(email));
    } finally {
      setSpamLoading(false);
    }
  }, [editorRef]);
  const toggleEmailClient = useCallback((key: string) => {
    setSelectedEmailClients((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Effects
  useEffect(() => {
    void runLinterMarkup();
  }, [runLinterMarkup, editorVersion]);

  useEffect(() => {
    void runLinterCompatibility();
  }, [runLinterCompatibility, editorVersion]);

  useEffect(() => {
    void runLinterSpam();
  }, [runLinterSpam, editorVersion]);

  // Render
  return (
    <ResizablePanel
      edge="top"
      defaultSize={224}
      minSize={120}
      maxSize={getMaxPanelHeight}
      handleLabel="Resize checks panel"
      className="flex flex-col border-t border-gray-200 dark:border-white/10"
    >
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
                <Tag label={String(compatibilityResults?.length ?? 0)} />
              ),
            },
            {
              label: 'Spam',
              trailingContent: (
                <Tag
                  label={
                    spamResult
                      ? `${Math.max(0, 10 - spamResult.points).toFixed(1)}/10`
                      : '-'
                  }
                />
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
            disabled={isActiveTabLoading}
            onClick={() => {
              runLinterMarkup();
              runLinterCompatibility();
              runLinterSpam();
            }}
          >
            <MdRefresh />
          </Button>
        </Stack>
      </Stack>
      <Stack className="flex-1 overflow-y-auto px-4 py-2">
        {activeTab === 0 && (
          <LinterMarkup results={lintingRows} loading={linterLoading} />
        )}
        {activeTab === 1 && (
          <LinterCompatibility
            results={compatibilityResults}
            loading={compatibilityLoading}
            selectedEmailClients={selectedEmailClients}
            onToggleEmailClient={toggleEmailClient}
          />
        )}
        {activeTab === 2 && (
          <LinterSpam result={spamResult} loading={spamLoading} />
        )}
      </Stack>
    </ResizablePanel>
  );
};
