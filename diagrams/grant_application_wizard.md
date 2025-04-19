# Grant Application Wizard Architecture

This diagram shows the interaction between the frontend and backend components of the Grant Application Wizard.

## WebSocket Communication Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant WS as WebSocket Handler
    participant DB as Database
    participant RAG as RAG Pipelines

    FE->>WS: Connect to /workspaces/{id}/applications/new
    WS->>DB: Create new application (DRAFT status)
    WS->>FE: EVENT_APPLICATION_CREATED with application ID

    FE->>WS: EVENT_APPLICATION_SETUP (title, cfp_file/url)
    WS->>DB: Update application (IN_PROGRESS status)
    WS->>FE: EVENT_APPLICATION_SETUP_SUCCESS
    WS->>FE: EVENT_APPLICATION_STATUS_UPDATE (processing_cfp)
    WS->>RAG: Trigger grant template generation
    RAG-->>FE: Real-time updates during generation
    WS->>FE: EVENT_TEMPLATE_GENERATION_SUCCESS

    FE->>WS: EVENT_TEMPLATE_REVIEW (edited template)
    WS->>DB: Update GrantTemplate
    WS->>FE: EVENT_TEMPLATE_UPDATE_SUCCESS

    FE->>WS: EVENT_KNOWLEDGE_BASE
    WS->>DB: Validate files exist
    WS->>FE: EVENT_KNOWLEDGE_BASE_SUCCESS

    FE->>WS: EVENT_RESEARCH_PLAN (objectives, tasks)
    WS->>DB: Store research objectives
    WS->>FE: EVENT_RESEARCH_PLAN_SUCCESS

    FE->>WS: EVENT_RESEARCH_DEEP_DIVE (form inputs)
    WS->>DB: Store form inputs
    WS->>FE: EVENT_RESEARCH_DEEP_DIVE_SUCCESS

    FE->>WS: EVENT_GENERATE_APPLICATION
    WS->>FE: EVENT_GENERATION_STARTED
    WS->>RAG: Trigger application generation
    RAG-->>FE: Real-time updates during generation
    WS->>DB: Update with final text (COMPLETED status)
    WS->>FE: EVENT_GENERATION_COMPLETE

    alt User cancels
        FE->>WS: EVENT_CANCEL_APPLICATION
        WS->>DB: Delete application and related entities
        WS->>FE: EVENT_APPLICATION_CANCELLED
    end
```

## Wizard State Management

```mermaid
stateDiagram-v2
    [*] --> Draft: WebSocket connection
    Draft --> InProgress: APPLICATION_SETUP

    state InProgress {
        [*] --> TemplateGeneration
        TemplateGeneration --> TemplateReview: Template generated
        TemplateReview --> KnowledgeBase: Template updated
        KnowledgeBase --> ResearchPlan: Files validated
        ResearchPlan --> ResearchDeepDive: Plan saved
        ResearchDeepDive --> ApplicationGeneration: Deep dive complete
    }

    InProgress --> Completed: Generation finished
    InProgress --> [*]: User cancels
    Draft --> [*]: User cancels
    Completed --> [*]
```

## Data Flow

```mermaid
flowchart TD
    A[Frontend] -->|WebSocket events| B[Backend Socket Handler]
    B -->|Store| C[ValkeyStore]
    C -->|Track completed steps| B
    B -->|CRUD operations| D[GrantApplication DB]
    B -->|Trigger| E[Grant Template Generation]
    B -->|Trigger| F[Application Generation]
    E -->|Real-time updates| A
    F -->|Real-time updates| A
    G[File Upload API] -->|Index files| H[Document Index]
    H -.->|Retrieved for| F
```
