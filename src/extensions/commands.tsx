import {
  defaultSlashCommands,
  ImageIcon,
  type SlashCommandItem,
} from '@react-email/editor/ui';
import { BLOCK_COMMANDS } from '@/extensions/blocks';

// Command definitions
const IMAGE_COMMAND: SlashCommandItem = {
  title: 'Image',
  description: 'Upload an image',
  icon: <ImageIcon size={20} />,
  category: 'Layout',
  searchTerms: ['image', 'photo', 'picture', 'upload'],
  command: ({ editor, range }) => {
    const chain = editor.chain().focus().deleteRange(range) as unknown as {
      uploadImage: () => {
        run: () => boolean;
      };
    };
    chain.uploadImage().run();
  },
};

/**
 * Adds a custom "Image" command to the React Email Editor's default slash commands.
 * This command allows users to upload images directly from the editor interface.
 */
function addImageCommand() {
  const imageCommandIndex = defaultSlashCommands.findIndex(
    (item) => item.title === IMAGE_COMMAND.title
  );
  if (imageCommandIndex === -1) {
    const buttonCommandIndex = defaultSlashCommands.findIndex(
      (item) => item.title === 'Button'
    );
    defaultSlashCommands.splice(
      buttonCommandIndex === -1
        ? defaultSlashCommands.length
        : buttonCommandIndex + 1,
      0,
      IMAGE_COMMAND
    );
  }
}

/**
 * Appends the pre-styled blocks to the default slash commands, once.
 */
function addBlockCommands() {
  for (const command of BLOCK_COMMANDS) {
    const exists = defaultSlashCommands.some(
      (item) =>
        item.category === command.category && item.title === command.title
    );
    if (!exists) defaultSlashCommands.push(command);
  }
}

/**
 * Builds and registers custom slash commands for the default React Email Editor command set.
 */
export function buildReactEmailSlashCommands() {
  addImageCommand();
  addBlockCommands();
}
