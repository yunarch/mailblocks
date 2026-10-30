<div align="center">

<img src="public/icon.svg" alt="Mailblocks logo" width="96" height="96" />

# Mailblocks

[![Open the app](https://img.shields.io/badge/App-yunarch.github.io%2Fmailblocks-blue?style=flat-square)](https://yunarch.github.io/mailblocks/)
[![Version](https://img.shields.io/github/v/tag/yunarch/mailblocks?sort=semver&style=flat-square&label=Version)](https://github.com/yunarch/mailblocks/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/yunarch/mailblocks/ci.yaml?branch=main&style=flat-square&label=CI)](https://github.com/yunarch/mailblocks/actions/workflows/ci.yaml)
[![Deploy](https://img.shields.io/github/actions/workflow/status/yunarch/mailblocks/deploy.yaml?branch=main&style=flat-square&label=Deploy)](https://github.com/yunarch/mailblocks/actions/workflows/deploy.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE.md)

**Build an email visually, then copy production-ready HTML.**
<br />
Powered by [React Email](https://react.email/).

[Overview](#overview) • [Why](#why) • [Features](#features) • [FAQ](#faq) • [Getting started](#getting-started) • [Development](#development)

![Mailblocks screenshot](docs/assets/screenshot.png)

</div>

## Overview

Mailblocks is a browser-based email template editor for developers. Start from a blank starter or one of the [React Email demo templates](https://demo.react.email/), edit the content visually, and get email-ready HTML along with instant feedback on markup issues, email-client support, and spam signals.

Everything runs client-side: there's no backend, account, or sign-up.

## Why

Building an email template that looks good everywhere is hard, because email clients don't follow modern web standards:

- **Every client renders differently:** Outlook on Windows uses Word's rendering engine, Gmail strips styles that aren't inline, and Apple Mail supports features that break elsewhere.
- **Outdated coding rules:** No Flexbox, no Grid, no external stylesheets. Layouts are still built with tables and inline styles.
- **Mobile and desktop:** Roughly half of all emails are opened on phones, so multi-column layouts have to stack cleanly on small screens.
- **Endless testing:** Checking a single template across clients and devices can take hours.

There are many solutions out there but most of them require an account, a paid plan, or a self-hosted setup with backend services such as Supabase or something similar.

Mailblocks runs entirely in the browser, which comes with some trade-offs and limitations but it keeps the workflow fast and simple.

## Features

- **Visual editor:** Edit content inline, insert blocks with `/` slash commands, and fine-tune attributes, colors, dimensions, spacing, and borders from the inspector.
- **Block management:** Reorder, duplicate, or remove blocks to shape your layout.
- **Ready-made templates:** Load React Email demo templates as editable HTML, browsable by category.
- **Responsive previews:** Switch between viewport sizes, toggle between the editor and the rendered output, and see the email inside a generic desktop or mobile mail client.
- **Generated HTML and plain text:** Inspect and copy the produced HTML and its plain-text version without leaving the editor.
- **React Email export:** Additionally, copy the email as a ready-to-use React Email component.
- **Variables:** Add placeholders like `{{name}}` with sample values to preview realistic content. They're kept as-is in the exported HTML, ready for your email service to fill in.
- **Markup linting:** Catch common issues in the generated markup as you edit, with code locations.
- **Email-client compatibility:** Check the HTML and CSS features you use against the email clients you select, based on [caniemail](https://www.caniemail.com/) data.
- **Spam checks:** Get a heuristic score with detailed findings, such as image-to-text ratio, missing unsubscribe link, link shorteners, mismatched link text, spammy phrases, and messages large enough to be clipped by Gmail (over 102 KB).
- **Works offline:** Install Mailblocks as an app and keep using it without a connection after the first visit.

> [!WARNING]
> Compatibility checks and spam scores are guidance, not guarantees of rendering accuracy or inbox placement.

## FAQ

### Is it free? Is my content sent anywhere?

Mailblocks is free to use. Your content is never sent to a server: editing, linting, and image uploads all happen in your browser. The app is hosted on GitHub Pages, so GitHub's own hosting policies apply. If you'd rather avoid that, clone the repository and [run it locally](#run-locally) or host it yourself.

### Is my work saved?

No. Edits only live in the current page, so reloading or switching templates discards them.

> Saving to local storage may come in a future release.

### Can I import my own HTML or template?

No, not yet. You can start from the blank starter or one of the bundled React Email demo templates.

> Importing your own HTML or template may come in a future release.

### Why don't my uploaded images show up in the exported email?

Uploaded images stay in your browser as temporary `blob:` URLs, so email clients can't load them. Host the image somewhere public and paste its URL in the image inspector.

### Can I keep the images from the bundled templates?

I would recommend not relying on them. They point to React Email's demo site, which can change or go offline at any time. Replace them with images you host before sending real emails.

### Can I use variables like `{{name}}`?

Yes. Type them directly as text, or define them in the Variables section of the email inspector with a sample value. Defined variables show their sample value in the preview, so you can see how the email looks with real content. Either way, variables stay as `{{name}}` in the exported HTML, ready for your email service to replace when sending.

### Does it create the plain-text version of the email?

Yes. Mailblocks can generate both an HTML version and a plain-text version of your email, so you can copy each one.

Sending both HTML and plain-text versions simultaneously, known technically as `multipart/alternative`, packs the same content in both formats into a single email. The email client shows the richest format it can display, usually HTML, and falls back to plain text otherwise. Including a plain-text version also helps with accessibility and spam filters.

Combining both versions into one email is up to you. Most email services and libraries accept separate `html` and `text` fields and build the `multipart/alternative` message for you.

### Does it work offline?

Yes. After your first visit, the app is cached in your browser, so you can open it, edit, and lint without a connection. You can also install it as an app from your browser. Remote images, such as those in the bundled templates, still need a connection to load.

### Can I send test emails?

No. This is one of the trade-offs/limitations of a client-only app: sending email requires a mail server, and browsers can't deliver email on their own. A `mailto:` link doesn't help either. It only opens the user's mail app with a plain-text draft, so the HTML wouldn't render and nothing is sent automatically.

## Getting started

### Prerequisites

- **Bun**: `>=1.3.9` A package manager that is used to install dependencies and manage scripts in this repository. You can download Bun from the official website: [https://bun.sh/](https://bun.sh/).

### Run locally

```sh
bun install
bun run dev
```

## Development

| Command                 | Description                                   |
| ----------------------- | --------------------------------------------- |
| `bun run dev`           | Start the Vite development server.            |
| `bun run build`         | Create a production build in `dist/`.         |
| `bun run preview`       | Preview the production build locally.         |
| `bun run lint`          | Run ESLint and TypeScript checks.             |
| `bun run lint:code:fix` | Apply automatic ESLint fixes.                 |
| `bun run format`        | Check formatting with oxfmt.                  |
| `bun run format:fix`    | Format files with oxfmt.                      |
| `bun run clean`         | Remove build output and caches.               |
| `bun run gen:templates` | Sync templates from the React Email demo app. |

### Testing

This project has automated tests in place to help ensure that the codebase is stable and functioning as expected. This project uses [Vitest](https://vitest.dev/) as its automated testing framework. See the [testing guide](docs/testing.md) for detailed instructions on how to test.

We have the next types of tests:

- **Standard Unit Tests** (`*.test.ts(x)`) - For testing utility functions, services, etc, non-UI logic.
- **Browser Mode Unit Tests** (`*.browser.test.ts(x)`) - For tests that require DOM access.

```sh
# Run all the tests
bun run tests

# Run all the tests in watch mode
bun run tests:watch

# Run only standard tests
bun run tests:standard

# Run only browser mode tests
bun run tests:browser
```

> [!NOTE]
> In order to run `browser mode tests` you need to install browsers. It should be done automatically. But if you encounter any issues, you can manually install them with the following command:
>
> ```sh
> bunx playwright install
> ```

### Updating templates

The bundled templates are generated from the [React Email demo emails](https://github.com/resend/react-email/tree/canary/apps/demo/emails). Running `bun run gen:templates` downloads them, renders each one to HTML, and regenerates `src/utils/templates.ts`.

### Project structure

```text
src/
├── components/   # App panels: editor, linter, templates drawer, header and footer
├── extensions/   # Editor extensions: blocks, slash commands, block actions
├── utils/        # Markup, compatibility and spam linters, generated templates
├── ui/           # Reusable UI primitives
├── hooks/        # Shared React hooks
├── providers/    # App context
├── styles/       # Global styles
└── types/        # Shared types (viewports, linter results, templates)
scripts/          # Template sync script
```
