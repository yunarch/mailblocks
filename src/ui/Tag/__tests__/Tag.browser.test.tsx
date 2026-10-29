import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Tag } from '../Tag';

describe('<Tag />', () => {
  it('renders its label with forwarded attributes', async () => {
    const screen = await render(
      <Tag label="HTML" title="Category" className="custom" />
    );
    const tag = screen.getByTitle('Category');
    await expect.element(tag).toHaveTextContent('HTML');
    await expect.element(tag).toHaveClass('ui-tag', 'custom');
  });
});
