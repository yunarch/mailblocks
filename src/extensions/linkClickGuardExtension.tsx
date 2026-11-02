import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Cancels the browser's default navigation when a link inside the editor is
 * activated, either by click, modifier-click or middle-click.
 *
 * @param view - The editor view.
 * @param event - The mouse event dispatched on the editor.
 * @returns Always `false`, so the editor still handles selection.
 */
function preventLinkNavigation(view: { dom: HTMLElement }, event: MouseEvent) {
  if (!(event.target instanceof Element)) return false;
  const anchor = event.target.closest('a[href]');
  if (anchor && view.dom.contains(anchor)) event.preventDefault();
  return false;
}

/**
 * Prevents links in the editor canvas (text, buttons and linked images) from
 * navigating when clicked, so untrusted template links are never followed
 * while editing. Links stay intact in the exported HTML.
 */
export const LinkClickGuard = Extension.create({
  name: 'linkClickGuard',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('linkClickGuard'),
        props: {
          handleDOMEvents: {
            click: preventLinkNavigation,
            auxclick: preventLinkNavigation,
          },
        },
      }),
    ];
  },
});
