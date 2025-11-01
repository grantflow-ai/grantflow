# CRDT Server

WebSocket CRDT server for GrantFlow collaborative editing. It provides real-time collaborative document editing capabilities using Hocuspocus and Y.js, with automatic conflict resolution and persistence to PostgreSQL.

## Tech Stack

- **Framework**: Node.js + TypeScript
- **CRDT Engine**: Hocuspocus (Y.js-based WebSocket server)
- **Database**: PostgreSQL (via Drizzle ORM)
- **Testing**: Vitest
- **Linting**: Biome + ESLint
- **Build**: tsup
- **Deployment**: Google Cloud Run with WebSocket support

## Architecture

The CRDT server provides:
- **Real-time collaboration**: Multiple users can edit documents simultaneously
- **Automatic conflict resolution**: Using Y.js CRDT algorithms
- **Document persistence**: Stores document state in PostgreSQL
- **Health monitoring**: HTTP health check endpoint for Cloud Run
- **WebSocket connections**: Stable connections with session affinity

## Deployment

### Production Infrastructure

The server is deployed to Google Cloud Run with:
- **Service Name**: `crdt`
- **Port**: 8080 (standard Cloud Run port)
- **Protocol**: WebSocket with HTTP health checks
- **Session Affinity**: Enabled for stable WebSocket connections
- **Auto-scaling**: Based on CPU and connection count

### URLs

- **Production**: `wss://crdt.grantflow.ai`
- **Staging**: `wss://staging-crdt.grantflow.ai`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | Server port | `8080` |

The server name is hardcoded as "GrantFlow CRDT Server" and doesn't require configuration.

### Health Check Endpoint

The server exposes `/health` for monitoring:

```json
{
  "status": "healthy",
  "service": "crdt",
  "port": 8080,
  "timestamp": "2024-07-24T10:00:00.000Z"
}
```

## Development

### Prerequisites

- Node.js 22+
- PostgreSQL 17 with pgvector
- pnpm package manager

### Local Setup

```bash
# Install dependencies
pnpm install

# Set environment variables
export DATABASE_URL="postgresql://user:pass@localhost:5432/grantflow"
export NODE_ENV="development"
export PORT="8080"

# Run development server
pnpm dev              # Build and run with auto-reload

# Or use the Taskfile from root
task crdt:dev
```

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
task crdt:dev       # Start CRDT server in dev mode
task crdt:build     # Build CRDT server

# Testing
task crdt:test      # Run CRDT server tests

# Linting
task lint:frontend         # Run all frontend and server linters
task lint:typescript:crdt  # TypeScript check for CRDT server only
task lint:biome:crdt       # Biome linting for CRDT server only
task lint:eslint:crdt      # ESLint for CRDT server only
```

## Client Integration

### Frontend Connection

Connect from the frontend using Y.js and Hocuspocus provider:

```typescript
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { getEnv } from '@/utils/env';

// Create a Y.js document
const ydoc = new Y.Doc();

// Connect to CRDT server
const provider = new HocuspocusProvider({
  url: getEnv().NEXT_PUBLIC_CRDT_SERVER_URL,
  name: documentId, // Unique document identifier
  document: ydoc,
  token: await getAuthToken(), // JWT for authentication
});

// Access shared types
const text = ydoc.getText('content');
const awareness = provider.awareness;
```

### Authentication

The server accepts JWT tokens for authentication:

```typescript
const provider = new HocuspocusProvider({
  url: getEnv().NEXT_PUBLIC_CRDT_SERVER_URL,
  name: documentId,
  document: ydoc,
  token: await getAuthToken(), // JWT with user info
  onAuthenticated: () => {
    console.log('Connected and authenticated');
  },
  onAuthenticationFailed: ({ reason }) => {
    console.error('Authentication failed:', reason);
  },
});
```

## Database Schema

The server uses Drizzle ORM with PostgreSQL:

```typescript
// Document storage
export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  data: bytea('data'), // Y.js document state
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

## CI/CD Pipeline

### GitHub Actions Workflow

The server is automatically built and deployed on push to main/development:

1. **Build**: Docker image built with production dependencies
2. **Push**: Image pushed to Artifact Registry
3. **Deploy**: Deployed to Cloud Run with health checks
4. **Verify**: Health endpoint checked for successful deployment

### Docker Image

The server runs in a minimal Node.js container:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --prod
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "crdt/dist/index.js"]
```

Images are tagged:
- **Staging**: `staging-{commit-sha}`, `staging-latest`
- **Production**: `{commit-sha}`, `latest`

## Monitoring

### Metrics

Cloud Run provides automatic monitoring:
- WebSocket connection count
- Request latency (p50, p95, p99)
- CPU and memory usage
- Error rates and status codes

### Logging

Structured logging with correlation:
```typescript
logger.info({
  event: "websocket_connection",
  documentId: doc.name,
  userId: connection.userId,
  traceId: context.traceId,
});
```

### Alerts

Configured alerts (via Terraform):
- Service downtime (>5 minutes)
- High error rate (>10% for 5 minutes)
- High latency (>1s p95)

## Testing

### Unit Tests

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Integration Testing

Test WebSocket connections:
```typescript
import { HocuspocusProviderWebsocket } from '@hocuspocus/provider';

const ws = new HocuspocusProviderWebsocket({
  url: 'ws://localhost:8080',
});

ws.on('open', () => {
  // Send test messages
});
```

## Troubleshooting

### Common Issues

#### WebSocket Connection Failed
- Check CORS configuration
- Verify TLS certificates
- Ensure URL uses `wss://` for production
- Check firewall/proxy settings

#### Document Not Syncing
- Verify database connectivity
- Check document permissions
- Review server logs for errors
- Ensure client and server Y.js versions match

#### High Memory Usage
- Monitor active connections
- Check for memory leaks in extensions
- Review document size limits

### Debug Commands

```bash
# View Cloud Run logs
gcloud run logs read crdt --project=grantflow

# Check service status
gcloud run services describe crdt --region=us-central1

# Test health endpoint
curl https://staging-crdt.grantflow.ai/health

# Monitor WebSocket connections
gcloud monitoring metrics-descriptors list --filter="metric.type=run.googleapis.com/websocket"
```

## Security

### Best Practices

- **TLS/SSL**: All connections use WSS protocol
- **Authentication**: JWT tokens validated on connection
- **Authorization**: Document-level access control
- **Rate Limiting**: Connection limits per user
- **Input Validation**: All document operations validated

### IAM Configuration

The service uses least-privilege IAM:
- Service account for database access only
- No external API permissions
- Audit logging enabled

## References

- [Hocuspocus Documentation](https://tiptap.dev/hocuspocus/introduction)
- [Y.js Documentation](https://docs.yjs.dev/)
- [Cloud Run WebSocket Support](https://cloud.google.com/run/docs/triggering/websockets)
- [CRDT Concepts](https://crdt.tech/)
