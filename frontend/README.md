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
  /hooks         # Custom React hooks
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
- **Vitest**: Testing framework
- **Firebase**: Authentication
- **React Hook Form**: Form validation and handling
- **Zod**: Schema validation
- **ky**: Fetch API wrapper

## Getting Started

### Prerequisites

- Node.js 22 or higher
- pnpm (package manager)

### Environment Setup

Create a `.env` file by copying the `.env.example` file:

```bash
cp .env.example .env
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
- **Test Data**: Generated using factory functions in `/testing/factories.ts`

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

## Best Practices

1. **TypeScript**: Use proper type definitions for all components and functions
2. **Server Components**: Prefer server components where possible to reduce client-side JavaScript
3. **Component Structure**: Keep components focused and composable
4. **Testing**: Write tests for critical functionality and components
5. **Directory Structure**: Follow the established directory structure for consistency
6. **Styling**: Use Tailwind CSS classes for styling, maintaining theme consistency
