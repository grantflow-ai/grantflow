# CRDT Server

WebSocket CRDT server for GrantFlow collaborative editing.
Its used by the GrantFlow editor and frontend for real-time collaborative editing. It exposes a WebSocket endpoint for document sync and persistence.

## Tech Stack

- **Framework**: Node.js + TypeScript
- **CRDT Engine**: Hocuspocus (Yjs-based)
- **Database**: PostgreSQL (via Drizzle ORM)
- **Testing**: Vitest
- **Linting**: Biome + ESLint
- **Build**: tsup

## Development

### Available Scripts

```bash
# Development
pnpm dev              # Build and run server with auto-reload
pnpm build            # Build for production
pnpm start            # Run built server

# Testing
pnpm test             # Run unit tests

# Linting & Formatting
pnpm lint             # Run Biome + ESLint with auto-fix
pnpm format           # Format code with Biome
pnpm typecheck        # Type check with TypeScript
pnpm check            # Run Biome check + ESLint

# Database
pnpm db:introspect    # Sync DB schema/relations from database
```

### Using the Taskfile

From the repository root, you can use Taskfile commands:

```bash
# Development
task crdt-server:dev       # Start CRDT server in dev mode
task crdt-server:build     # Build CRDT server

# Testing
task crdt-server:test      # Run CRDT server tests

# Linting
task lint:frontend         # Run all frontend and server linters
task lint:typescript:crdt-server  # TypeScript check for CRDT server only
task lint:biome:crdt-server       # Biome linting for CRDT server only
task lint:eslint:crdt-server      # ESLint for CRDT server only
```

### Workspace Integration

The CRDT server is part of the pnpm workspace and shares dependencies with the main frontend and editor.

### Architecture

The CRDT server is designed to be:

- **Standalone**: Runs independently as a WebSocket server for collaborative editing
- **Integrated**: Shares tooling and dependencies with the GrantFlow workspace
- **Type-safe**: Full TypeScript integration
- **Database-backed**: Uses Drizzle ORM for schema and persistence


### Testing

- Uses Vitest for unit tests (`pnpm test`)
- Test setup in `testing/setup.ts`

### Database

- Uses Drizzle ORM for schema and migrations
- Schema and relations in `src/db/schema.ts` and `src/db/relations.ts`
- Sync schema with `pnpm db:introspect`
