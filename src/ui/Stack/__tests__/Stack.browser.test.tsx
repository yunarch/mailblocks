import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Stack } from '../Stack';

describe('<Stack />', () => {
  it('renders all children unchanged without a separator', async () => {
    const screen = await render(
      <Stack data-testid="stack" className="custom">
        text
        <span>A</span>
      </Stack>
    );
    const stack = screen.getByTestId('stack');
    expect(stack.element().tagName).toBe('DIV');
    await expect.element(stack).toHaveClass('ui-stack', 'flex-col', 'custom');
    await expect.element(stack).toHaveTextContent('textA');
  });

  it('places the separator only between element children', async () => {
    const screen = await render(
      <Stack as="ul" separator={<li role="separator" />}>
        <li>A</li>
        text
        {null}
        <li>B</li>
        <li>C</li>
      </Stack>
    );
    const list = screen.getByRole('list').element();
    expect(
      Array.from(list.children, (child) => child.textContent || '|')
    ).toEqual(['A', '|', 'B', '|', 'C']);
  });
});
