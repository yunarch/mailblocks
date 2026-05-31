import { useState } from 'react';
import { Stack } from '@/ui/Stack';
import { Tabs } from '@/ui/Tabs';
import { Tag } from '@/ui/Tag';
import { Typography } from '@/ui/Typography';
import {
  Compatibility,
  type CompatibilityResult,
} from './components/Compatibility';
import { Linter, type LintingRow } from './components/Linter';
import { Spam, type SpamCheckingResult } from './components/Spam';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

const lintingRows: LintingRow[] = [
  {
    source: 'link',
    result: {
      status: 'error',
      link: 'http://example.com/unsubscribe',
      failingCheck: { type: 'security' },
      codeLocation: { line: 31, column: 8 },
    },
  },
  {
    source: 'image',
    result: {
      status: 'warning',
      src: '/images/hero-banner.png',
      failingCheck: { type: 'accessibility' },
      codeLocation: { line: 12, column: 4 },
    },
  },
  {
    source: 'image',
    result: {
      status: 'warning',
      src: '/images/promo-bg.jpg',
      failingCheck: { type: 'image_size' },
      byteCount: 1_572_864,
      codeLocation: { line: 44, column: 2 },
    },
  },
];

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
export const EmailChecksPanel = () => {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <Stack className="h-52 border-t border-gray-200 dark:border-white/10">
      <Stack className="flex-row items-center justify-between border-b border-gray-200 pr-4 dark:border-white/10">
        <Tabs
          activeItem={activeTab}
          items={[
            {
              label: 'Linter',
              trailingContent: <Tag label={String(lintingRows.length)} />,
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
        <Typography variant="bodySm" tone="muted">
          Generated output checks
        </Typography>
      </Stack>
      <Stack className="flex-1 overflow-y-auto px-4 py-2">
        {activeTab === 0 && <Linter rows={lintingRows} />}
        {activeTab === 1 && <Compatibility results={compatibilityResults} />}
        {activeTab === 2 && <Spam result={spamResult} />}
      </Stack>
    </Stack>
  );
};
