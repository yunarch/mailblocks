import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { Switch } from '../Switch';

describe('<Switch />', () => {
  it.each([
    [false, true],
    [true, false],
  ])('when checked is %s, requests %s on click', async (checked, expected) => {
    const onChange = vi.fn();
    const screen = await render(
      <Switch checked={checked} onChange={onChange} label="Dark mode" />
    );
    const toggle = screen.getByRole('switch', { name: 'Dark mode' });
    await expect
      .element(toggle)
      .toHaveAttribute('aria-checked', String(checked));
    await toggle.click();
    expect(onChange).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('does not toggle while disabled', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <Switch checked={false} onChange={onChange} disabled aria-label="Sync" />
    );
    const toggle = screen.getByRole('switch', { name: 'Sync' });
    await expect.element(toggle).toBeDisabled();
    toggle.element().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
