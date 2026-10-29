import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Typography } from '../Typography';

describe('<Typography />', () => {
  it.each([
    [undefined, 'P'],
    ['h1', 'H1'],
    ['h6', 'H6'],
    ['caption', 'SPAN'],
    ['code', 'CODE'],
  ] as const)('renders the %s variant as <%s>', async (variant, tagName) => {
    const screen = await render(
      <Typography variant={variant}>Text</Typography>
    );
    expect(screen.getByText('Text').element().tagName).toBe(tagName);
  });

  it('renders a custom element with the requested styles', async () => {
    const screen = await render(
      <Typography
        as="label"
        variant="h1"
        tone="danger"
        leading="none"
        truncate
        uppercase
        className="custom"
      >
        Text
      </Typography>
    );
    const text = screen.getByText('Text');
    expect(text.element().tagName).toBe('LABEL');
    await expect
      .element(text)
      .toHaveClass(
        'ui-typography',
        'text-3xl',
        'text-red-500',
        'leading-none',
        'truncate',
        'uppercase',
        'custom'
      );
  });

  it('renders links as anchors', async () => {
    const screen = await render(
      <Typography link href="https://example.com" variant="h2">
        Docs
      </Typography>
    );
    const link = screen.getByRole('link', { name: 'Docs' });
    await expect.element(link).toHaveAttribute('href', 'https://example.com');
    await expect.element(link).toHaveClass('hover:underline');
  });
});
