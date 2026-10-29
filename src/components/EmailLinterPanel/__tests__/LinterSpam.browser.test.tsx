import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import type { SpamCheckingResult } from '@/types/linter';
import { LinterSpam } from '../components/LinterSpam';

// Builds a spam result whose checks add up to the given points.
const result = (...points: number[]): SpamCheckingResult => {
  const checks = points.map((value, index) => ({
    name: `CHECK_${String(index + 1)}`,
    description: `Check ${String(index + 1)} description.`,
    points: value,
  }));
  const total = points.reduce((sum, value) => sum + value, 0);
  return { checks, points: total, isSpam: total >= 5 };
};

// Tests
describe('<LinterSpam />', () => {
  it('shows the progress and empty states', async () => {
    const loading = await render(<LinterSpam result={undefined} loading />);
    await expect
      .element(loading.getByText('Running client-side spam checks...'))
      .toBeVisible();
    const idle = await render(<LinterSpam result={undefined} />);
    await expect
      .element(idle.getByText(/Open or refresh spam checks/))
      .toBeVisible();
  });

  it('shows a clean score when no checks are triggered', async () => {
    const screen = await render(<LinterSpam result={result()} />);
    await expect.element(screen.getByText('10.0')).toBeVisible();
    await expect.element(screen.getByText('Clean')).toBeVisible();
    await expect
      .element(screen.getByText('No abuse indicators found.'))
      .toBeVisible();
    await expect.element(screen.getByRole('table')).not.toBeInTheDocument();
  });

  it.each([
    [[1.5], '8.5', 'Low risk', '1 check triggered.'],
    [[2, 1], '7.0', 'Some risk', '2 checks triggered.'],
    [[3, 1.9], '5.1', 'High risk', '2 checks triggered.'],
    [[3, 2], '5.0', 'Likely spam', '2 checks triggered.'],
    [[6, 6], '0.0', 'Likely spam', '2 checks triggered.'],
  ])('rates %j points as %s/10 (%s)', async (points, score, level, summary) => {
    const screen = await render(<LinterSpam result={result(...points)} />);
    await expect
      .element(screen.getByText(score, { exact: true }))
      .toBeVisible();
    await expect.element(screen.getByText(level)).toBeVisible();
    await expect
      .element(screen.getByText(new RegExp(`^${summary}`)))
      .toBeVisible();
  });

  it('lists the triggered checks from most to least points', async () => {
    const screen = await render(<LinterSpam result={result(0.4, 2.5, 1.2)} />);
    const rows = screen.getByRole('row').elements();
    expect(rows.map((row) => row.textContent)).toEqual([
      'CHECK_2Check 2 description.-2.5',
      'CHECK_3Check 3 description.-1.2',
      'CHECK_1Check 1 description.-0.4',
    ]);
  });
});
