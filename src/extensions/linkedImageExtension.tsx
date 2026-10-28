import { EmailNode } from '@react-email/editor/core';
import type { CommandProps, Editor, JSONContent } from '@tiptap/core';

type LinkedImageOptions = {
  uploadImage: (file: File) => Promise<{ url: string }>;
};

type ImageAttributes = {
  alt?: string | null;
  height?: string | null;
  href?: string | null;
  linkClass?: string | null;
  linkRel?: string | null;
  linkStyle?: string | null;
  linkTarget?: string | null;
  src?: string | null;
  style?: string | null;
  width?: string | null;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (attrs: ImageAttributes) => ReturnType;
      uploadImage: () => ReturnType;
    };
  }
}

/**
 * Converts an inline CSS string into a React style object.
 *
 * @param cssText - The inline CSS declarations to convert.
 * @returns The React style object, or `undefined` when no CSS is provided.
 */
function cssTextToReactStyle(cssText?: string | null) {
  if (!cssText) return;

  return Object.fromEntries(
    cssText
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const separatorIndex = declaration.indexOf(':');
        if (separatorIndex === -1) return null;

        const property = declaration
          .slice(0, separatorIndex)
          .trim()
          .replaceAll(/-(?<letter>[a-z])/g, (_, letter: string) =>
            letter.toUpperCase()
          );
        const value = declaration.slice(separatorIndex + 1).trim();

        return property && value ? [property, value] : null;
      })
      .filter((entry): entry is [string, string] => Boolean(entry))
  );
}

/**
 * Reads the image attributes from an `img` element and its optional parent link.
 *
 * @param element - The parsed `img` element.
 * @returns The image node attributes.
 */
function getImageAttributes(element: HTMLElement): ImageAttributes {
  const anchor =
    element.parentElement?.tagName.toLowerCase() === 'a'
      ? element.parentElement
      : null;

  return {
    alt: element.getAttribute('alt') ?? '',
    height: element.getAttribute('height') ?? 'auto',
    href: anchor?.getAttribute('href') ?? element.getAttribute('href'),
    linkClass: anchor?.getAttribute('class'),
    linkRel: anchor?.getAttribute('rel'),
    linkStyle: anchor?.getAttribute('style'),
    linkTarget: anchor?.getAttribute('target'),
    src: element.getAttribute('src') ?? '',
    style: element.getAttribute('style'),
    width: element.getAttribute('width') ?? 'auto',
  };
}

/**
 * Builds the HTML attributes for the rendered `img` element.
 *
 * @param attrs - The image node attributes.
 * @returns The non-empty `img` HTML attributes.
 */
function getImageHtmlAttributes(attrs: ImageAttributes) {
  return {
    alt: attrs.alt ?? '',
    src: attrs.src ?? '',
    ...removeEmptyAttributes({
      height: attrs.height === 'auto' ? undefined : attrs.height,
      style: attrs.style,
      width: attrs.width === 'auto' ? undefined : attrs.width,
    }),
  };
}

/**
 * Builds the HTML attributes for the wrapping `a` element.
 *
 * @param attrs - The image node attributes.
 * @returns The non-empty `a` HTML attributes.
 */
function getLinkHtmlAttributes(attrs: ImageAttributes) {
  return removeEmptyAttributes({
    class: attrs.linkClass,
    href: attrs.href,
    rel: attrs.linkRel,
    style: attrs.linkStyle,
    target: attrs.linkTarget,
  });
}

/**
 * Removes attributes with empty, `null` or `undefined` values.
 *
 * @param attributes - The attributes to filter.
 * @returns The attributes that have a non-empty value.
 */
function removeEmptyAttributes(
  attributes: Record<string, string | null | undefined>
) {
  return Object.fromEntries(
    Object.entries(attributes).filter((entry): entry is [string, string] =>
      Boolean(entry[1])
    )
  );
}

/**
 * Replaces the `src` of every image node matching `src`, or removes them when no `newSrc` is given.
 *
 * @param editor - The editor instance.
 * @param src - The image source to match.
 * @param newSrc - The replacement image source; matching images are removed when omitted.
 */
function updateImagesBySrc(editor: Editor, src: string, newSrc?: string) {
  const { state, view } = editor;
  const transaction = state.tr;

  state.doc.descendants((node, pos) => {
    if (node.type.name !== 'image' || node.attrs.src !== src) return;
    if (newSrc) {
      transaction.setNodeMarkup(pos, undefined, { ...node.attrs, src: newSrc });
    } else {
      const mappedPos = transaction.mapping.map(pos);
      transaction.delete(mappedPos, mappedPos + node.nodeSize);
    }
  });

  if (transaction.docChanged) {
    view.dispatch(transaction);
  }
}

/**
 * Inserts a temporary image preview, uploads the file and swaps in the final URL.
 *
 * @param editor - The editor instance.
 * @param file - The image file to upload.
 * @param uploadImage - The function that uploads the image and returns its URL.
 */
async function executeUploadFlow(
  editor: Editor,
  file: File,
  uploadImage: LinkedImageOptions['uploadImage']
) {
  const blobUrl = URL.createObjectURL(file);
  editor.chain().focus().setImage({ src: blobUrl }).run();
  try {
    const { url } = await uploadImage(file);
    updateImagesBySrc(editor, blobUrl, url);
  } catch {
    updateImagesBySrc(editor, blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Creates an image extension that supports wrapping images in links and uploading files.
 *
 * @param options - Configuration with the handler used to upload image files.
 * @returns The linked image email node extension.
 */
export function createLinkedImageExtension(options: LinkedImageOptions) {
  const uploadImageCommand = ({ editor }: Pick<CommandProps, 'editor'>) => {
    const input = document.createElement('input');
    input.accept = 'image/*';
    input.type = 'file';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) void executeUploadFlow(editor, file, options.uploadImage);
    });
    input.click();
    return true;
  };

  return EmailNode.create({
    name: 'image',
    group: 'block',
    atom: true,
    draggable: true,
    addAttributes() {
      return {
        alt: { default: '' },
        height: { default: 'auto' },
        href: { default: null },
        linkClass: { default: null },
        linkRel: { default: null },
        linkStyle: { default: null },
        linkTarget: { default: null },
        src: { default: '' },
        style: { default: null },
        width: { default: 'auto' },
      };
    },
    parseHTML() {
      return [
        {
          tag: 'img[src]',
          getAttrs: (node) => {
            if (typeof node === 'string') return false;
            return getImageAttributes(node);
          },
        },
      ];
    },
    renderHTML({ node }) {
      const attrs = node.attrs as ImageAttributes;
      const image = ['img', getImageHtmlAttributes(attrs)];

      if (attrs.href) {
        return ['a', getLinkHtmlAttributes(attrs), image];
      }

      return image;
    },
    addCommands() {
      return {
        setImage:
          (attrs: ImageAttributes) =>
          ({ commands }) => {
            return commands.insertContent({
              type: 'image',
              attrs,
            });
          },
        uploadImage: () => uploadImageCommand,
      };
    },
    renderToReactEmail: ({ node, style }) => {
      const attrs = node.attrs as JSONContent['attrs'] & ImageAttributes;
      const img = (
        <img
          alt={attrs.alt ?? ''}
          height={
            attrs.height === 'auto' ? undefined : (attrs.height ?? undefined)
          }
          src={attrs.src ?? ''}
          style={{
            ...style,
            ...cssTextToReactStyle(attrs.style),
          }}
          width={
            attrs.width === 'auto' ? undefined : (attrs.width ?? undefined)
          }
        />
      );

      if (!attrs.href) return img;

      return (
        <a
          className={attrs.linkClass ?? undefined}
          href={attrs.href}
          rel={attrs.linkRel ?? undefined}
          style={cssTextToReactStyle(attrs.linkStyle)}
          target={attrs.linkTarget ?? undefined}
        >
          {img}
        </a>
      );
    },
  });
}
