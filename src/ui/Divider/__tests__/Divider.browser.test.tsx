import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Divider } from '../Divider';

describe('<Divider />', () => {
  it('renders a horizontal span by default', async () => {
    const screen = await render(<Divider data-testid="divider" />);
    const divider = screen.getByTestId('divider');
    expect(divider.element().tagName).toBe('SPAN');
    await expect.element(divider).toHaveClass('ui-divider', 'w-full', 'h-px');
  });

  it('renders the requested element and orientation', async () => {
    const screen = await render(
      <Divider as="hr" orientation="vertical" className="custom" />
    );
    await expect
      .element(screen.getByRole('separator'))
      .toHaveClass('h-full', 'w-px', 'custom');
  });
});
