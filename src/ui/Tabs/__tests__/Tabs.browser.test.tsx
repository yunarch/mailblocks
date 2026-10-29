import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { Tabs } from '../Tabs';

const items = [
  { label: 'Markup', leadingContent: <span>!</span> },
  { label: 'Spam', trailingContent: <span>3</span> },
];

describe('<Tabs />', () => {
  it('marks only the active tab as selected and focusable', async () => {
    const screen = await render(
      <Tabs aria-label="Linters" activeItem={1} items={items} />
    );
    const markup = screen.getByRole('tab', { name: /Markup/ });
    const spam = screen.getByRole('tab', { name: /Spam/ });
    await expect
      .element(screen.getByRole('tablist', { name: 'Linters' }))
      .toBeVisible();
    await expect.element(markup).toHaveTextContent('!Markup');
    await expect.element(spam).toHaveTextContent('Spam3');
    await expect.element(markup).toHaveAttribute('aria-selected', 'false');
    await expect.element(markup).toHaveAttribute('tabindex', '-1');
    await expect.element(spam).toHaveAttribute('aria-selected', 'true');
    await expect.element(spam).toHaveAttribute('tabindex', '0');
    expect(
      spam.element().querySelector('.ui-tabs__item-indicator')
    ).not.toBeNull();
    expect(
      markup.element().querySelector('.ui-tabs__item-indicator')
    ).toBeNull();
  });

  it('reports the clicked tab index and item', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <Tabs activeItem={1} items={items} onChange={onChange} />
    );
    await screen.getByRole('tab', { name: /Markup/ }).click();
    expect(onChange).toHaveBeenCalledExactlyOnceWith(0, items[0]);
  });

  it('can be clicked without a change handler', async () => {
    const screen = await render(<Tabs activeItem={0} items={items} />);
    await screen.getByRole('tab', { name: /Spam/ }).click();
    await expect
      .element(screen.getByRole('tab', { name: /Markup/ }))
      .toHaveAttribute('aria-selected', 'true');
  });
});
