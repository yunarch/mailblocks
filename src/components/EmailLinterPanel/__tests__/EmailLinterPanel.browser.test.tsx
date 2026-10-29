import { describe, expect, it } from 'vitest';
import { renderApp } from '@/__tests__/test-utils';

// Utility functions
const tab = (
  screen: Awaited<ReturnType<typeof renderApp>>['screen'],
  name: string
) => {
  return screen.getByRole('tab', { name: new RegExp(name) });
};

// Tests
describe('generated output checks', () => {
  it('checks the email as soon as the editor is ready', async () => {
    const { screen } = await renderApp();
    await expect
      .element(tab(screen, 'Lint Markup'))
      .toHaveTextContent('Lint Markup0');
    await expect.element(tab(screen, 'Spam')).toHaveTextContent('Spam9.2/10');
    await expect
      .element(screen.getByText('No linting issues found.'))
      .toBeVisible();
    await tab(screen, 'Spam').click();
    await expect.element(screen.getByText('MISSING_UNSUBSCRIBE')).toBeVisible();
    await expect
      .element(
        screen.getByText('No unsubscribe or email preferences link was found.')
      )
      .toBeVisible();
    await tab(screen, 'Compatibility').click();
    await expect.element(screen.getByText('4 selected')).toBeVisible();
    await expect
      .element(screen.getByText(/^Not supported in/).first())
      .toBeVisible();
  });

  it('re-checks the edited email when refreshed', async () => {
    const { screen, getEditor } = await renderApp();
    await expect.element(tab(screen, 'Spam')).toHaveTextContent('Spam9.2/10');
    getEditor().commands.setContent(
      // eslint-disable-next-line unicorn/prefer-https -- An HTTP link is the issue under test.
      '<p>Here is your monthly account summary with recent activity and tips.</p><p><a href="http://example.com/unsubscribe">Unsubscribe</a></p>'
    );
    await expect
      .element(tab(screen, 'Lint Markup'))
      .toHaveTextContent('Lint Markup0');
    await screen.getByRole('button', { name: 'Refresh linter' }).click();
    await expect
      .element(tab(screen, 'Lint Markup'))
      .toHaveTextContent('Lint Markup1');
    await expect
      .element(screen.getByText(/Use HTTPS instead of HTTP/))
      .toBeVisible();
    await expect.element(tab(screen, 'Spam')).toHaveTextContent('Spam10.0/10');
  });

  it('checks compatibility only for the selected email clients', async () => {
    const { screen } = await renderApp();
    await tab(screen, 'Compatibility').click();
    await expect
      .element(screen.getByText(/^Not supported in/).first())
      .toBeVisible();
    await screen.getByText('Email clients').click();
    for (const client of ['Apple Mail', 'Gmail', 'Outlook', 'Yahoo! Mail']) {
      await screen.getByRole('button', { name: client, exact: true }).click();
    }
    await expect.element(screen.getByText('0 selected')).toBeVisible();
    await expect
      .element(
        screen.getByText(
          'Select at least one client to run compatibility checks.'
        )
      )
      .toBeVisible();
    await expect
      .element(screen.getByText('No compatibility issues found.'))
      .toBeVisible();
    await expect
      .element(tab(screen, 'Compatibility'))
      .toHaveTextContent('Compatibility0');
    await screen.getByRole('button', { name: 'Outlook', exact: true }).click();
    await expect.element(screen.getByText('1 selected')).toBeVisible();
    await expect
      .element(screen.getByText(/^Not supported in Outlook/).first())
      .toBeVisible();
  });
});
