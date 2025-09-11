# GrantFlow Editor

Rich text editor component built with Vite, React, TypeScript, and TipTap.

## Overview

The editor is a standalone React application that provides rich text editing capabilities for GrantFlow applications. It's built using modern tools and integrated into the GrantFlow workspace.

## Tech Stack

- **Framework**: Vite + React 19 + TypeScript
- **Editor**: TipTap (Prosemirror-based)
- **Styling**: Tailwind CSS 4
- **Components**: Radix UI primitives  
- **Testing**: Vitest + Testing Library + Playwright
- **Linting**: Biome + ESLint
- **Storybook**: Component development and documentation

## Development

### Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm preview          # Preview production build

# Testing
pnpm test             # Run unit tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage
pnpm test:e2e         # Run E2E tests with Playwright
pnpm test:e2e:ui      # Run E2E tests with Playwright UI

# Linting & Formatting
pnpm lint             # Run Biome + ESLint with auto-fix
pnpm format           # Format code with Biome
pnpm typecheck        # Type check with TypeScript
pnpm check            # Run Biome check + ESLint

# Storybook
pnpm storybook        # Start Storybook dev server
pnpm build-storybook  # Build Storybook for production
```

### Using the Taskfile

From the repository root, you can use the Taskfile commands:

```bash
# Development
task editor:dev       # Start editor dev server
task editor:build     # Build editor

# Testing  
task editor:test      # Run editor tests
task editor:test:watch    # Run tests in watch mode
task editor:test:coverage # Run tests with coverage

# Linting (runs on both frontend and editor)
task lint:frontend    # Run all frontend linters
task lint:typescript:editor  # TypeScript check for editor only
task lint:biome:editor      # Biome linting for editor only
task lint:eslint:editor     # ESLint for editor only
```

### Workspace Integration

The editor is part of the pnpm workspace and can import from the main frontend:

```typescript
import { Button } from "grantflow-frontend/components/ui/button";
```

### Architecture

The editor is designed to be:
- **Standalone**: Can run independently for development
- **Reusable**: Exportable as a library component
- **Integrated**: Shares tooling and dependencies with main frontend
- **Type-safe**: Full TypeScript integration

### Component Development

Use Storybook for component development:

```bash
pnpm storybook
# Opens http://localhost:6006
```

Components follow the same patterns as the main frontend:
- Radix UI primitives for accessibility
- Tailwind CSS for styling
- TypeScript for type safety
- Testing Library for unit tests

## Integration

The editor can be imported and used in the main GrantFlow application:

```typescript
import { Editor } from "editor";

export function MyComponent() {
  return <Editor content={content} onChange={handleChange} />;
}
```