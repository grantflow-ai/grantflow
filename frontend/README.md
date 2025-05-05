# GrantFlow.AI Frontend

This is the frontend application for GrantFlow.AI, built with Next.js 15, TypeScript, and shadcn/ui components.

## Project Structure

The frontend follows a modern Next.js App Router architecture:

```
/src
  /actions       # Server actions for API communication
  /app           # Next.js app router pages and layouts
  /components    # React components
    /ui          # shadcn/ui components
    /landing-page    # Components for landing page
    /sign-in         # Authentication components
    /workspaces      # Workspace related components
  /lib           # Shared utilities and schemas
  /styles        # Global styles
  /types         # TypeScript type definitions
  /utils         # Helper functions
```

## Tech Stack

- **Next.js 15**: React framework with App Router and server components
- **React 19**: UI library
- **TypeScript**: Type-safe JavaScript
- **shadcn/ui**: Component library based on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Storybook**: UI component development and documentation
- **Vitest**: Testing framework
- **Firebase**: Authentication
- **React Hook Form**: Form validation and handling
- **Zod**: Schema validation
- **ky**: Fetch API wrapper

## Getting Started

### Prerequisites

- Node.js 22 or higher
- pnpm (package manager)
- Google Cloud SDK (gcloud CLI)
- Firebase CLI

### Environment Setup

For local development, create a `.env` file by copying the `.env.example` file:

```bash
cp .env.example .env
```

For production deployments, environment variables are managed using Google Secret Manager and Firebase App Hosting:

```bash
# Adding a new environment variable to Secret Manager
gcloud secrets create SECRET_NAME --data-file=- <<< "secret-value"

# Granting Firebase App Hosting access to the secret
firebase apphosting:secrets:grantaccess SECRET_NAME --backend monorepo
```

## Working with Components

### Component Organization

- `/components/ui`: shadcn/ui components
- `/components`: Application-specific components
- `/app`: Page components using the Next.js App Router

### Adding shadcn/ui Components

The project uses shadcn/ui components with the "New York" style preset. To add a new component:

```bash
pnpm ui add <component-name>
```

Example:

```bash
pnpm ui add button
pnpm ui add dialog
pnpm ui add dropdown-menu
```

This will add the component to the `/components/ui` directory with the project's styling configuration.

## State Management

- **React Context**: Used for state that spans multiple components
- **React Hook Form**: Used for form state management

Prefer using server components where possible to reduce client-side JavaScript.

## Testing

The project uses Vitest for testing with React Testing Library. Test files are co-located with the code they test with a `.spec.tsx` extension.

### Testing Setup

- **Testing Framework**: Vitest
- **Test Environment**: jsdom
- **Testing Libraries**: React Testing Library, Jest DOM matchers
- **Test Files**: Located alongside the components they test

### Running Tests

Run all tests:

```bash
pnpm test
```

Run tests with coverage:

```bash
pnpm test:coverage
```

Run tests in watch mode:

```bash
pnpm test:watch
```

## API Integration

The frontend communicates with the backend API using server actions. API types are defined in `/src/types/api-types.ts`.

## Storybook

Storybook is used for developing and documenting UI components in isolation.

### Running Storybook

Start the Storybook development server:

```bash
pnpm storybook
```

Build Storybook for static deployment:

```bash
pnpm build-storybook
```

### Creating Stories

Story files are co-located with their respective components using the `.stories.tsx` extension:

```
/components
  /my-component
    my-component.tsx
    my-component.spec.tsx
    my-component.stories.tsx
```

Basic story structure:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./my-component";

const meta: Meta<typeof MyComponent> = {
	title: "Components/MyComponent",
	component: MyComponent,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
	args: {
		// Component props here
	},
};

export const Variant: Story = {
	args: {
		// Variant props here
	},
};
```

### Best Practices for Stories

1. Create multiple stories for different component states
2. Use args to make stories interactive
3. Provide documentation using JSDoc comments
4. Use controls to demonstrate component flexibility
5. Add relevant design information in the component's docs

## Best Practices

1. **TypeScript**: Use proper type definitions for all components and functions
2. **Server Components**: Prefer server components where possible to reduce client-side JavaScript
3. **Component Structure**: Keep components focused and composable
4. **Testing**: Write tests for critical functionality and components
5. **Directory Structure**: Follow the established directory structure for consistency
6. **Styling**: Use Tailwind CSS classes for styling, maintaining theme consistency
7. **Storybook**: Create stories for all reusable components to document usage and variants
