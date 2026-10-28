<h1>Mailblocks</h1>

An email template editor for developers, built with [React Email](https://react.email/).

![Mailblocks](docs/assets/screenshot.png)

## Features

- **Visual email editor:** Edit content directly and fine-tune block attributes, colors, dimensions, spacing, and borders with the inspector.
- **Block management:** Reorder, duplicate, or remove blocks to shape your email layout.
- **Ready-made templates:** Use pre-built templates as a starting point for your emails.
- **Desktop and mobile previews:** Check layouts at different viewport widths and switch between editing and rendered output.
- **Generated HTML:** Inspect the HTML produced without leaving the editor.
- **Markup linting:** Spot common issues in the generated email markup as you edit.
- **Email-client compatibility:** Review compatibility warnings for the email clients you select.
- **Spam checks:** Identify potential spam signals with a heuristic score and detailed findings.

> [!WARNING]
> Compatibility checks and spam scores are guidance, not guarantees of rendering accuracy or inbox placement. Test emails in your target clients before sending.

## Requirements

- **Bun**: `>=1.3.9` A package manager that is used to install dependencies and manage scripts in this repository. You can download Bun from the official website: [https://bun.sh/](https://bun.sh/).

## Quick Start

```sh
bun install
bun run dev
```

## Development

| Command                 | Description                           |
| ----------------------- | ------------------------------------- |
| `bun run build`         | Create a production build.            |
| `bun run preview`       | Preview the production build locally. |
| `bun run lint`          | Run ESLint and TypeScript checks.     |
| `bun run lint:code:fix` | Apply automatic ESLint fixes.         |
| `bun run format`        | Check formatting with oxfmt.          |
| `bun run format:fix`    | Format files with oxfmt.              |
| `bun run gen:templates` | Sync the React Email templates.       |

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
