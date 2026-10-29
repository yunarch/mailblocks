import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button } from '../Button';
import { ButtonGroup } from '../ButtonGroup';

describe('<ButtonGroup />', () => {
  it('wraps only element children and highlights the active item', async () => {
    const screen = await render(
      <ButtonGroup aria-label="Viewport" activeItem={1}>
        <Button>XL</Button>
        text
        {null}
        <Button>L</Button>
      </ButtonGroup>
    );
    const group = screen.getByLabelText('Viewport');
    const items = group.element().querySelectorAll('.ui-button-group__item');
    expect(group.element().textContent).toBe('XLL');
    expect(items).toHaveLength(2);
    expect(items[0]).not.toHaveClass('*:bg-white');
    expect(items[1]).toHaveClass('*:bg-white');
  });

  it('supports vertical orientation and custom classes', async () => {
    const screen = await render(
      <ButtonGroup
        aria-label="Actions"
        orientation="vertical"
        className="custom"
      >
        <Button>Up</Button>
      </ButtonGroup>
    );
    await expect
      .element(screen.getByLabelText('Actions'))
      .toHaveClass('ui-button-group', 'flex-col', 'custom');
  });
});
