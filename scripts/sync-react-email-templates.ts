import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stderr, stdout } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { styleText } from 'node:util';
import React from 'react';
import { render } from 'react-email';

// Types
type GitTreeResponse = {
  tree: {
    path: string;
    type: 'blob' | 'tree';
  }[];
};

type RenderedTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
  sourceUrl: string;
};

type RenderableEmailComponent = React.ComponentType<Record<string, unknown>> & {
  PreviewProps?: Record<string, unknown>;
};

// Set Vercel URL for correct template source links from https://demo.react.email/
process.env.VERCEL_URL = 'react-email-demo-6woqf4gn1-resend.vercel.app';

// Configuration react-email github templates folder
const branch = 'canary';
const treeUrl = `https://api.github.com/repos/resend/react-email/git/trees/${branch}?recursive=1`;
const rawRoot = `https://raw.githubusercontent.com/resend/react-email/${branch}`;
const demoRoot = 'apps/demo/emails';

// Constants
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.join(scriptDir, '..', 'tmp');
const generatedFile = path.join(scriptDir, '../src/utils/templates.ts');

// Fallback local template
const LOCAL_DEFAULT_TEMPLATE: RenderedTemplate = {
  id: 'local-default',
  name: 'Mailblocks starter',
  category: 'Local',
  description: 'Editable starter content for a new email.',
  content: `
      <section style="padding: 32px;">
        <h1>Welcome to Mailblocks</h1>
        <p>
          Start editing your email template. Select text to format it,
          or type <strong>/</strong> for slash commands.
        </p>
        <p>
          Use the templates sidebar to load a React Email demo as editable HTML,
          then preview the generated email markup from the topbar.
        </p>
        <p>
          Click outside the email to change the page background and the
          width, color and padding of this card.
        </p>
      </section>
    `,
  sourceUrl: 'local',
};

/**
 * @param url - The URL to fetch JSON data from.
 * @returns The parsed JSON data.
 *
 * @throws {Error} Will throw an error if the fetch operation fails or if the response is not OK.
 */
async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': '@yunarch/mailblocks-template-sync',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

/**
 * @param url - The URL to fetch text data from.
 * @returns The fetched text data.
 *
 * @throws {Error} Will throw an error if the fetch operation fails or if the response is not OK.
 */
async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/plain',
      'User-Agent': '@yunarch/mailblocks-template-sync',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

/**
 * Dynamically imports a React component from the given file path and renders it to HTML using `react-email`.
 *
 * @param filePath - The path to the React component file.
 * @returns The rendered HTML string.
 */
async function renderTemplate(filePath: string) {
  const imported = (await import(
    `${pathToFileURL(filePath).href}?${Date.now()}`
  )) as {
    default?: RenderableEmailComponent;
  };
  if (typeof imported.default !== 'function') {
    throw new TypeError('Template does not export a default React component');
  }
  return render(
    React.createElement(imported.default, imported.default.PreviewProps ?? {}),
    {
      pretty: true,
    }
  );
}

/**
 * This script fetches React Email demo templates from the specified GitHub repository,
 * renders them to HTML, and generates a TypeScript file exporting the templates as an array.
 */
const main = async () => {
  stdout.write(styleText('magenta', '\n📦 sync-react-email-templates\n\n'));

  // Clear and recreate source directory
  stdout.write(styleText('cyan', '▸ Setting up tmp directory...\n'));
  await rm(sourceRoot, { recursive: true, force: true });
  await mkdir(sourceRoot, { recursive: true });
  stdout.write(styleText('green', `  Ready ${styleText('dim', sourceRoot)}\n`));

  // Fetch template file tree from GitHub
  stdout.write(styleText('cyan', '▸ Fetching template tree from GitHub...\n'));
  const tree = await fetchJson<GitTreeResponse>(treeUrl);
  const sourceFiles = tree.tree.filter((item) => {
    return (
      item.type === 'blob' &&
      item.path.startsWith(`${demoRoot}/`) &&
      /\.(?:tsx|ts)$/.test(item.path)
    );
  });
  stdout.write(
    styleText(
      'green',
      `  Found ${styleText('bold', String(sourceFiles.length))} source files.\n`
    )
  );

  // Download source files and keep track of local paths
  stdout.write(styleText('cyan', '▸ Copying template sources to tmp...\n'));
  const sourcePaths = new Map<string, string>();
  for (const file of sourceFiles) {
    const relativePath = file.path.slice(`${demoRoot}/`.length);
    const localPath = path.join(sourceRoot, relativePath);
    await mkdir(path.dirname(localPath), { recursive: true });
    await writeFile(
      localPath,
      await fetchText(`${rawRoot}/${file.path}`),
      'utf8'
    );
    sourcePaths.set(file.path, localPath);
  }
  stdout.write(
    styleText(
      'green',
      `  Copied ${styleText('bold', String(sourceFiles.length))} files.\n`
    )
  );

  // Render templates
  stdout.write(styleText('cyan', '▸ Rendering templates...\n'));
  const templates: RenderedTemplate[] = [LOCAL_DEFAULT_TEMPLATE];
  const renderableFiles = sourceFiles.filter((file) =>
    file.path.endsWith('.tsx')
  );
  let skipped = 0;
  for (const file of renderableFiles) {
    const localPath = sourcePaths.get(file.path);
    if (!localPath) continue;
    const [, category = 'Demo', filename = 'template.tsx'] =
      new RegExp(`${demoRoot}/([^/]+)/(.+)$`).exec(file.path) ?? [];
    try {
      const content = await renderTemplate(localPath);
      templates.push({
        id: file.path
          .replace(demoRoot, '')
          .replace(/^\//, '')
          .replace(/\.(?:tsx|ts)$/, '')
          .toLowerCase()
          .replaceAll(/[^a-z0-9]+/g, '-')
          .replaceAll(/^-|-$/g, ''),
        name: path
          .basename(filename)
          .replace(/^\d+-/, '')
          .replace(/\.tsx$/, '')
          .split(/[-_]/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
        category,
        description: `Generated from React Email demo ${category}/${filename}.`,
        content,
        sourceUrl: `https://github.com/resend/react-email/blob/${branch}/${file.path}`,
      });
    } catch (error) {
      skipped++;
      stderr.write(
        styleText('yellow', `  ⚠️  Skipped ${styleText('dim', file.path)}\n`)
      );
      stderr.write(styleText('dim', `     ${String(error)}\n`));
    }
  }
  if (skipped > 0) {
    stdout.write(
      styleText('yellow', `  ${skipped} template(s) skipped due to errors.\n`)
    );
  }

  // Generate output file
  stdout.write(styleText('cyan', '▸ Writing generated templates file...\n'));
  const output = `/* GENERATED - DO NOT EDIT. Re-run \`bun run gen:templates\` to update. */

import type { EmailTemplate } from '@/types/templates';

export const generatedReactEmailTemplates: EmailTemplate[] = ${JSON.stringify(templates)};
`;
  await writeFile(generatedFile, output, 'utf8');
  stdout.write(
    styleText(
      'green',
      `  Generated ${styleText('bold', String(templates.length))} templates at ${styleText('dim', generatedFile)}\n`
    )
  );

  // Cleanup
  stdout.write(styleText('cyan', '▸ Cleaning up tmp directory...\n'));
  await rm(sourceRoot, { recursive: true, force: true });
  stdout.write(styleText('green', '  Done.\n'));

  // Final log
  stdout.write(
    styleText('magenta', '\nFinished syncing React Email templates.\n\n')
  );
};

// Execute
await main();
