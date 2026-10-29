import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';
import { Menu } from '../Menu';

const renderMenu = async (checked = false) => {
  const onChange = vi.fn();
  const screen = await render(
    <Menu label="Email clients" trigger="Clients" className="custom">
      <Menu.CheckboxItem checked={checked} onChange={onChange}>
        Gmail
      </Menu.CheckboxItem>
    </Menu>
  );
  const trigger = screen.getByRole('button', { name: 'Email clients' });
  return { onChange, screen, trigger };
};

describe('<Menu />', () => {
  it('opens a labelled menu positioned below its trigger', async () => {
    const { screen, trigger } = await renderMenu();
    await expect.element(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    const menu = screen.getByRole('menu', { name: 'Email clients' });
    await expect.element(menu).toBeVisible();
    await expect.element(menu).toHaveClass('custom');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    const { bottom } = trigger.element().getBoundingClientRect();
    expect(menu.element()).toHaveStyle({ top: `${bottom + 4}px`, left: '8px' });
  });

  it.each([
    [false, true],
    [true, false],
  ])(
    'toggles a checked=%s item to %s and closes the menu',
    async (checked, expected) => {
      const { onChange, screen, trigger } = await renderMenu(checked);
      await trigger.click();
      const item = screen.getByRole('menuitemcheckbox', { name: 'Gmail' });
      await expect
        .element(item)
        .toHaveAttribute('aria-checked', String(checked));
      await item.click();
      expect(onChange).toHaveBeenCalledExactlyOnceWith(expected);
      await expect.element(screen.getByRole('menu')).not.toBeInTheDocument();
    }
  );

  it.each(['scroll', 'resize'])(
    'closes when the window fires %s',
    async (type) => {
      const { screen, trigger } = await renderMenu();
      await trigger.click();
      await expect.element(screen.getByRole('menu')).toBeVisible();
      dispatchEvent(new Event(type));
      await expect.element(screen.getByRole('menu')).not.toBeInTheDocument();
      await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    }
  );

  it('closes with Escape', async () => {
    const { screen, trigger } = await renderMenu();
    await trigger.click();
    await expect.element(screen.getByRole('menu')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(screen.getByRole('menu')).not.toBeInTheDocument();
  });
});
