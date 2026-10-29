import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button } from '../Button';

describe('<Button />', () => {
  it('renders a non-submitting button that forwards props and its ref', async () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    const screen = await render(
      <Button ref={ref} className="custom" onClick={onClick}>
        Save
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Save' });
    await expect.element(button).toHaveAttribute('type', 'button');
    await expect.element(button).toHaveClass('ui-button', 'custom');
    expect(ref.current).toBe(button.element());
    await button.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('keeps an explicit button type', async () => {
    const screen = await render(<Button type="submit">Send</Button>);
    await expect
      .element(screen.getByRole('button'))
      .toHaveAttribute('type', 'submit');
  });

  it('applies the requested variant and size', async () => {
    const screen = await render(
      <Button variant="outline" size="md">
        Outline
      </Button>
    );
    await expect
      .element(screen.getByRole('button'))
      .toHaveClass('border', 'h-9');
  });

  it('disables a button', async () => {
    const onClick = vi.fn();
    const screen = await render(
      <Button disabled onClick={onClick}>
        Save
      </Button>
    );
    const button = screen.getByRole('button');
    await expect.element(button).toBeDisabled();
    await expect.element(button).toHaveAttribute('aria-disabled', 'true');
    button.element().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders a link without button-only attributes', async () => {
    const ref = createRef<HTMLAnchorElement>();
    const screen = await render(
      <Button ref={ref} link href="https://example.com" disabled>
        Docs
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Docs' });
    await expect.element(link).toHaveAttribute('href', 'https://example.com');
    await expect.element(link).toHaveAttribute('aria-disabled', 'true');
    await expect.element(link).not.toHaveAttribute('type');
    await expect.element(link).not.toHaveAttribute('disabled');
    expect(ref.current).toBe(link.element());
  });
});
