# Grant Application Wizard Documentation

## Overview

The Grant Application Wizard is a multi-step form that guides users through creating grant applications. It uses a combination of real-time updates, file uploads, URL crawling, and AI-powered generation to streamline the grant writing process.

## Architecture

### Frontend Structure

#### Main Components

- **Page**: `/workspaces/[workspaceId]/applications/new/page.tsx`
- **Store**: `wizard-store.ts` (Zustand)
- **Steps**: 6 wizard components in `/components/workspaces/wizard/`

#### Wizard Steps

1. **Application Details** - Title, initial files/URLs
2. **Application Structure** - Grant template and sections
    - Drag-and-drop section reordering
    - Parent/child hierarchy management
    - Inline section editing (expand/collapse)
    - Add/delete sections
    - Word/character limit configuration
3. **Knowledge Base** - RAG source management
4. **Research Plan** - Research planning
5. **Research Deep Dive** - Detailed research
6. **Generate and Complete** - Final generation

### State Management

The wizard uses Zustand with the following key state:

```typescript
{
  applicationState: {
    application: ApplicationType,
    applicationTitle: string,
    templateId: string | null,
    wsConnectionStatus: string,
    wsConnectionStatusColor: string
  },
  contentState: {
    uploadedFiles: FileWithId[],
    urls: string[]
  },
  ui: {
    currentStep: number,
    fileDropdownStates: Record<string, boolean>,
    linkHoverStates: Record<string, boolean>,
    urlInput: string
  },
  polling: {
    intervalId: NodeJS.Timeout | null,
    isActive: boolean
  }
}
```

### Key Features

#### Draft Application Pattern

- Applications created immediately as "Untitled Application"
- Prevents data loss and enables file uploads early
- Title updates are debounced (500ms) to reduce API calls
- Title changes checked before API calls to prevent loops

#### Real-time Updates

- WebSocket connection for file processing notifications
- Toast notifications for indexing status (processing/success/failed)
- Connection status indicator in UI
- Local state updates before API calls for responsive UI

#### Validation

- Minimum title length: 10 characters
- Must have files or URLs before proceeding
- Each step has specific validation rules via `validateStepNext()`
- Section hierarchy constraints (max 2 levels)

#### Grant Section Management

- Sections stored as JSON array in `grant_templates.grant_sections`
- Each section has: `id`, `title`, `order`, `parent_id`, `max_words`
- Optional fields: `is_detailed_workplan` (Research Plan designation)
- Updates via `updateGrantTemplate` action maintain order consistency

## Backend API

### Endpoints

#### Grant Applications

```
POST   /workspaces/{workspace_id}/applications
GET    /workspaces/{workspace_id}/applications/{id}
PATCH  /workspaces/{workspace_id}/applications/{id}
DELETE /workspaces/{workspace_id}/applications/{id}
POST   /workspaces/{workspace_id}/applications/{id} (generate)
```

#### Grant Templates

```
POST   /workspaces/{workspace_id}/applications/{id}/grant-template/{template_id}
PATCH  /workspaces/{workspace_id}/applications/{id}/grant-template/{template_id}
```

#### RAG Sources

```
GET    /workspaces/{workspace_id}/applications/{id}/sources
DELETE /workspaces/{workspace_id}/applications/{id}/sources/{source_id}
POST   /workspaces/{workspace_id}/applications/{id}/sources/upload-url
POST   /workspaces/{workspace_id}/applications/{id}/sources/crawl-url
```

### Data Flow

1. **Application Creation**

    - Frontend calls `createApplication` with title
    - Backend creates draft application + empty grant template
    - Returns full application with relations

2. **File Upload Flow**

    ```
    Frontend → Request signed URL → Upload to GCS → Trigger indexing
    ```

3. **URL Crawling Flow**

    ```
    Frontend → Send URL → Publish to url-crawling topic → Crawler processes
    ```

4. **Generation Flow**
    ```
    Check prerequisites → Publish to rag-processing topic → AI generates content
    ```

### Database Schema

#### Core Tables

- `grant_applications` - Main application data
- `grant_templates` - Template with sections JSON
- `rag_sources` - Polymorphic base for files/URLs
    - `rag_files` - File metadata (GCS path, size, mime type)
    - `rag_urls` - URL metadata (url, title, description)

#### Join Tables

- `grant_application_rag_sources`
- `grant_template_rag_sources`
- `funding_organization_rag_sources`

### Pub/Sub Topics

- `url-crawling` - URL crawling tasks
- `rag-processing` - RAG generation tasks
- `frontend-notifications` - Real-time updates
- `file-indexing` - File processing tasks

## Frontend Implementation Details

### Server Actions

Located in `/frontend/src/actions/`:

- `grant-applications.ts` - CRUD operations
- `grant-template.ts` - Template generation and section updates

All actions use:

- `withAuthRedirect` wrapper for auth handling
- `createAuthHeaders` for JWT tokens
- Typed with generated `API` types

### WebSocket Integration

```typescript
const { connectionStatus, connectionStatusColor, notifications } = useApplicationNotifications({
	applicationId: application?.id,
	workspaceId: params.workspaceId,
});
```

### Polling Pattern

Used for retrieving application updates during long-running operations:

```typescript
polling.start(
	() => retrieveApplication(),
	FIVE_SECONDS,
	true, // call immediately
);
```

### Drag and Drop Implementation

Step 2 uses @dnd-kit for section management:

```typescript
// Dependencies
import { DndContext, closestCenter, DragOverlay } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";

// Features
- Hierarchical sections (parent/child, max 2 levels)
- Real-time reordering with visual feedback
- Convert between parent/child relationships
- Persist changes via updateGrantTemplate action
```

### Section Editing

Sections support inline editing with expand/collapse:

```typescript
// Editable fields per section
{
  title: string,
  max_words: number,
  is_detailed_workplan?: boolean, // Research Plan designation
}
```

## Best Practices

### Error Handling

- Backend returns 400 for validation errors
- Toast notifications for user feedback
- Graceful WebSocket disconnection handling

### Performance

- Debounced title updates (500ms)
- Batch file uploads when possible
- Polling only when necessary

### Security

- Role-based access control (OWNER, ADMIN, MEMBER)
- Signed URLs for direct GCS uploads
- JWT validation on all endpoints

## Common Patterns

### TypedDict Usage

```python
class CreateApplicationRequestBody(TypedDict):
    title: str

class UpdateApplicationRequestBody(TypedDict):
    title: NotRequired[str]
    status: NotRequired[ApplicationStatusEnum]
    form_inputs: NotRequired[dict[str, str]]
    research_objectives: NotRequired[list[ResearchObjective]]
```

### Response Building

```python
response: ApplicationResponse = {
    "id": str(application.id),
    "title": application.title,
    "status": application.status,
    "rag_sources": [],
    "created_at": application.created_at.isoformat(),
    "updated_at": application.updated_at.isoformat(),
}

# Add optional fields
if application.completed_at:
    response["completed_at"] = application.completed_at.isoformat()
```

### Transaction Management

```python
async with session_maker() as session, session.begin():
    # All operations in transaction
    await session.commit()
```

## Troubleshooting

### Common Issues

1. **Files not indexing**: Check GCS permissions and pub/sub topic
2. **WebSocket disconnects**: Normal during dev, auto-reconnects
3. **Generation fails**: Ensure RAG sources exist and are indexed
4. **Drag/drop 404 errors**: Ensure sections have valid backend IDs
5. **Title update loops**: Check that title comparisons prevent unnecessary API calls

### Debug Points

- Check browser console for WebSocket messages
- Backend logs in `grant_applications.py` and `sources.py`
- Pub/Sub message delivery in GCP Console
- Network tab for duplicate API calls

## Development Tools

### Dev Autofill Button

Available in development mode to quickly populate wizard steps:

```typescript
// Appears in wizard footer when NODE_ENV !== 'production'
// Uses real backend APIs, not mocked data
// Test files from: ../testing/test_data/sources/cfps/
// Test URLs include NIH and NSF grant pages
```

Key learnings:

- Autofill must trigger actual wizard flow (not just mock state)
- Files need to be uploaded through proper channels for indexing
- Each step's autofill should prepare data for the next step
