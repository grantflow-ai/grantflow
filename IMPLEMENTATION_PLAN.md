# Wizard Autofill Implementation Plan

## Overview

This document outlines the implementation plan for adding AI-powered autofill functionality to the grant application wizard. The autofill feature will leverage the existing RAG (Retrieval-Augmented Generation) infrastructure to automatically populate form fields in wizard steps 4-5 based on uploaded documents from step 3.

## Current Architecture

```
Step 3 (Upload) → Indexer/Crawler → Vectors → RAG Service → Generation
```

**Key Components:**
- **Step 3**: Knowledge base uploads (files/URLs) 
- **Indexer/Crawler**: Async processing to extract text and generate vectors
- **RAG Service**: Document retrieval and LLM-powered generation
- **Steps 4-5**: Research plan and deep dive forms (current autofill targets)

## Implementation Strategy

### Phase 1: Backend Autofill Service
**Timeline:** 3-4 days
**Priority:** High

### Phase 2: Frontend Integration
**Timeline:** 2-3 days  
**Priority:** High

### Phase 3: Advanced Features
**Timeline:** 2-3 days
**Priority:** Medium

---

## Phase 1: Backend Autofill Service

### 1.1 New RAG Request Models

**File:** `services/rag/src/models/rag_request.py`

```python
@dataclass
class AutofillRequest:
    """Request for autofill functionality"""
    parent_type: Literal["grant_application"]
    parent_id: str  # application_id
    autofill_type: Literal["research_plan", "research_deep_dive"]
    field_name: str | None = None  # For single field autofill
    context: dict = field(default_factory=dict)  # Existing form data
    
    def to_dict(self) -> dict:
        return {
            "parent_type": self.parent_type,
            "parent_id": self.parent_id,
            "autofill_type": self.autofill_type,
            "field_name": self.field_name,
            "context": self.context
        }

@dataclass  
class AutofillResponse:
    """Response from autofill generation"""
    success: bool
    data: dict
    field_name: str | None = None
    error: str | None = None
```

**Testing:**
- Unit tests for request/response serialization
- Validation of required fields and enum values

### 1.2 Autofill Handler Infrastructure

**File:** `services/rag/src/autofill/__init__.py`

```python
from .research_plan_handler import generate_research_objectives
from .research_deep_dive_handler import generate_research_answers
from .base_handler import BaseAutofillHandler

__all__ = [
    "generate_research_objectives",
    "generate_research_answers", 
    "BaseAutofillHandler"
]
```

**File:** `services/rag/src/autofill/base_handler.py`

```python
from abc import ABC, abstractmethod
from typing import Any
import logging

from ..models.rag_request import AutofillRequest, AutofillResponse
from ..utils.retrieval import retrieve_documents
from ..utils.completion import generate_completion
from ..database.grant_application import get_grant_application

class BaseAutofillHandler(ABC):
    """Base class for autofill handlers"""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
        
    async def handle_request(self, request: AutofillRequest) -> AutofillResponse:
        """Main entry point for autofill requests"""
        try:
            # Validate indexing is complete
            await self._validate_indexing_complete(request.parent_id)
            
            # Get application context
            application = await get_grant_application(request.parent_id)
            
            # Generate autofill content
            result = await self._generate_content(request, application)
            
            return AutofillResponse(
                success=True,
                data=result,
                field_name=request.field_name
            )
            
        except Exception as e:
            self.logger.exception("Autofill generation failed", 
                                request_id=request.parent_id,
                                autofill_type=request.autofill_type)
            return AutofillResponse(
                success=False,
                data={},
                error=str(e)
            )
    
    async def _validate_indexing_complete(self, application_id: str) -> None:
        """Ensure all RAG sources are indexed before autofill"""
        from ..utils.checks import verify_rag_sources_indexed
        await verify_rag_sources_indexed(application_id)
    
    @abstractmethod
    async def _generate_content(self, request: AutofillRequest, application: dict) -> dict:
        """Generate autofill content - implemented by subclasses"""
        pass
```

### 1.3 Research Plan Handler

**File:** `services/rag/src/autofill/research_plan_handler.py`

```python
from typing import Any
import logging

from .base_handler import BaseAutofillHandler
from ..models.rag_request import AutofillRequest
from ..utils.retrieval import retrieve_documents
from ..utils.completion import generate_completion
from ..utils.search_queries import generate_search_queries

class ResearchPlanHandler(BaseAutofillHandler):
    """Handler for research plan autofill (Step 4)"""
    
    async def _generate_content(self, request: AutofillRequest, application: dict) -> dict:
        """Generate research objectives and tasks"""
        
        # Get application context
        app_title = application.get("title", "")
        existing_objectives = application.get("research_objectives", [])
        
        # Generate search queries for document retrieval
        search_queries = await generate_search_queries(
            task_description=f"Generate research objectives for: {app_title}",
            context={"application_title": app_title}
        )
        
        # Retrieve relevant documents
        documents = await retrieve_documents(
            application_id=request.parent_id,
            queries=search_queries,
            max_results=50
        )
        
        # Generate objectives using LLM
        prompt = self._build_research_plan_prompt(app_title, documents, existing_objectives)
        
        response = await generate_completion(
            prompt=prompt,
            response_format="json",
            model_preference="claude"
        )
        
        # Parse and validate response
        objectives = self._parse_research_objectives(response)
        
        return {
            "research_objectives": objectives,
            "generation_context": {
                "documents_used": len(documents),
                "search_queries": search_queries
            }
        }
    
    def _build_research_plan_prompt(self, title: str, documents: list, existing: list) -> str:
        """Build prompt for research plan generation"""
        
        context_docs = "\n".join([f"- {doc['content'][:200]}..." for doc in documents[:10]])
        
        prompt = f"""
Based on the following research context and documents, generate a research plan for the grant application titled: "{title}"

RESEARCH CONTEXT:
{context_docs}

EXISTING OBJECTIVES:
{existing if existing else "None"}

Generate 3-5 research objectives, each with 2-4 specific research tasks.

RESPONSE FORMAT (JSON):
{{
    "research_objectives": [
        {{
            "number": 1,
            "title": "Objective Title",
            "description": "Detailed description of the objective",
            "research_tasks": [
                {{
                    "number": 1,
                    "title": "Task Title", 
                    "description": "Specific task description"
                }}
            ]
        }}
    ]
}}

Requirements:
- Objectives should be specific, measurable, and achievable
- Tasks should be concrete and actionable
- Use insights from the provided research context
- Build upon existing objectives if provided
"""
        return prompt
    
    def _parse_research_objectives(self, response: dict) -> list:
        """Parse and validate LLM response"""
        objectives = response.get("research_objectives", [])
        
        # Validate structure
        for obj in objectives:
            if not all(key in obj for key in ["number", "title", "research_tasks"]):
                raise ValueError(f"Invalid objective structure: {obj}")
            
            for task in obj["research_tasks"]:
                if not all(key in task for key in ["number", "title"]):
                    raise ValueError(f"Invalid task structure: {task}")
        
        return objectives

# Factory function
async def generate_research_objectives(request: AutofillRequest, logger: logging.Logger) -> dict:
    """Generate research objectives for application"""
    handler = ResearchPlanHandler(logger)
    response = await handler.handle_request(request)
    
    if not response.success:
        raise Exception(response.error)
    
    return response.data
```

### 1.4 Research Deep Dive Handler

**File:** `services/rag/src/autofill/research_deep_dive_handler.py`

```python
from typing import Any
import logging

from .base_handler import BaseAutofillHandler
from ..models.rag_request import AutofillRequest
from ..utils.retrieval import retrieve_documents
from ..utils.completion import generate_completion

class ResearchDeepDiveHandler(BaseAutofillHandler):
    """Handler for research deep dive autofill (Step 5)"""
    
    FIELD_MAPPING = {
        "background_context": "What is the context and background of your research?",
        "hypothesis": "What is the central hypothesis or key question your research aims to address?",
        "rationale": "Why is this research important and what motivates its pursuit?",
        "novelty_and_innovation": "What makes your approach unique or innovative compared to existing research?",
        "impact": "How will your research contribute to the field and society?",
        "team_excellence": "What makes your team uniquely qualified to carry out this project?",
        "research_feasibility": "What makes your research plan realistic and achievable?",
        "preliminary_data": "Have you obtained any preliminary findings that support your research?"
    }
    
    async def _generate_content(self, request: AutofillRequest, application: dict) -> dict:
        """Generate research deep dive answers"""
        
        # Determine which fields to generate
        target_fields = (
            [request.field_name] if request.field_name 
            else list(self.FIELD_MAPPING.keys())
        )
        
        # Get application context
        app_title = application.get("title", "")
        research_objectives = application.get("research_objectives", [])
        existing_answers = application.get("form_inputs", {})
        
        # Retrieve relevant documents
        documents = await retrieve_documents(
            application_id=request.parent_id,
            queries=[f"Research context for {app_title}"],
            max_results=100
        )
        
        # Generate answers for each field
        results = {}
        for field_name in target_fields:
            if field_name in existing_answers and existing_answers[field_name].strip():
                # Skip fields that already have content
                continue
                
            answer = await self._generate_field_answer(
                field_name=field_name,
                application_title=app_title,
                research_objectives=research_objectives,
                documents=documents,
                existing_answers=existing_answers
            )
            
            results[field_name] = answer
        
        return {
            "form_inputs": results,
            "generation_context": {
                "documents_used": len(documents),
                "fields_generated": list(results.keys())
            }
        }
    
    async def _generate_field_answer(
        self, 
        field_name: str,
        application_title: str,
        research_objectives: list,
        documents: list,
        existing_answers: dict
    ) -> str:
        """Generate answer for a specific field"""
        
        question = self.FIELD_MAPPING[field_name]
        
        # Build context
        context_docs = "\n".join([f"- {doc['content'][:300]}..." for doc in documents[:15]])
        objectives_text = "\n".join([
            f"{i+1}. {obj['title']}: {obj.get('description', '')}"
            for i, obj in enumerate(research_objectives)
        ])
        
        # Build prompt
        prompt = f"""
Based on the research context below, answer the following question for a grant application titled: "{application_title}"

QUESTION: {question}

RESEARCH CONTEXT:
{context_docs}

RESEARCH OBJECTIVES:
{objectives_text}

EXISTING FORM RESPONSES:
{self._format_existing_answers(existing_answers)}

Provide a comprehensive, well-structured answer that:
1. Directly addresses the question
2. Uses insights from the research context
3. Aligns with the stated research objectives
4. Is appropriate for a grant application
5. Is 200-500 words in length

Answer:
"""
        
        response = await generate_completion(
            prompt=prompt,
            response_format="text",
            model_preference="claude"
        )
        
        return response.strip()
    
    def _format_existing_answers(self, answers: dict) -> str:
        """Format existing answers for context"""
        if not answers:
            return "None"
        
        formatted = []
        for field, answer in answers.items():
            if answer and answer.strip():
                question = self.FIELD_MAPPING.get(field, field)
                formatted.append(f"{question}: {answer[:100]}...")
        
        return "\n".join(formatted) if formatted else "None"

# Factory function
async def generate_research_answers(request: AutofillRequest, logger: logging.Logger) -> dict:
    """Generate research deep dive answers"""
    handler = ResearchDeepDiveHandler(logger)
    response = await handler.handle_request(request)
    
    if not response.success:
        raise Exception(response.error)
    
    return response.data
```

### 1.5 RAG Service Main Handler Update

**File:** `services/rag/src/main.py`

```python
# Add import
from .autofill.research_plan_handler import generate_research_objectives
from .autofill.research_deep_dive_handler import generate_research_answers
from .models.rag_request import AutofillRequest

# Add to main handler
async def handle_pubsub_message(message: dict) -> dict:
    """Handle incoming Pub/Sub messages"""
    message_type = message.get("type")
    
    if message_type == "rag_request":
        # Existing RAG request handling
        return await handle_rag_request(RagRequest.from_dict(message))
    
    elif message_type == "autofill_request":
        # New autofill request handling
        return await handle_autofill_request(AutofillRequest.from_dict(message))
    
    else:
        raise ValueError(f"Unknown message type: {message_type}")

async def handle_autofill_request(request: AutofillRequest) -> dict:
    """Handle autofill requests"""
    logger = structlog.get_logger()
    logger.info("Processing autofill request", 
                application_id=request.parent_id,
                autofill_type=request.autofill_type)
    
    try:
        if request.autofill_type == "research_plan":
            result = await generate_research_objectives(request, logger)
        elif request.autofill_type == "research_deep_dive":
            result = await generate_research_answers(request, logger)
        else:
            raise ValueError(f"Unknown autofill type: {request.autofill_type}")
        
        logger.info("Autofill generation completed", 
                    application_id=request.parent_id,
                    autofill_type=request.autofill_type)
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.exception("Autofill generation failed",
                        application_id=request.parent_id,
                        autofill_type=request.autofill_type)
        return {
            "success": False,
            "error": str(e)
        }
```

### 1.6 Testing Strategy for Phase 1

**File:** `services/rag/tests/autofill/test_research_plan_handler.py`

```python
import pytest
from unittest.mock import AsyncMock, MagicMock

from services.rag.src.autofill.research_plan_handler import ResearchPlanHandler
from services.rag.src.models.rag_request import AutofillRequest

class TestResearchPlanHandler:
    
    @pytest.fixture
    def handler(self):
        logger = MagicMock()
        return ResearchPlanHandler(logger)
    
    @pytest.fixture
    def sample_request(self):
        return AutofillRequest(
            parent_type="grant_application",
            parent_id="app-123",
            autofill_type="research_plan",
            context={}
        )
    
    @pytest.fixture
    def sample_application(self):
        return {
            "title": "AI-Powered Medical Diagnosis",
            "research_objectives": []
        }
    
    @pytest.fixture
    def sample_documents(self):
        return [
            {"content": "Machine learning approaches to medical diagnosis..."},
            {"content": "Deep learning in healthcare applications..."}
        ]
    
    async def test_generate_content_success(self, handler, sample_request, sample_application, sample_documents):
        """Test successful content generation"""
        # Mock dependencies
        handler._validate_indexing_complete = AsyncMock()
        
        with patch('services.rag.src.autofill.research_plan_handler.retrieve_documents') as mock_retrieve:
            mock_retrieve.return_value = sample_documents
            
            with patch('services.rag.src.autofill.research_plan_handler.generate_completion') as mock_completion:
                mock_completion.return_value = {
                    "research_objectives": [
                        {
                            "number": 1,
                            "title": "Develop ML Models",
                            "description": "Create machine learning models for diagnosis",
                            "research_tasks": [
                                {
                                    "number": 1,
                                    "title": "Data Collection",
                                    "description": "Collect medical imaging data"
                                }
                            ]
                        }
                    ]
                }
                
                result = await handler._generate_content(sample_request, sample_application)
                
                assert "research_objectives" in result
                assert len(result["research_objectives"]) == 1
                assert result["research_objectives"][0]["title"] == "Develop ML Models"
    
    async def test_validation_failure(self, handler, sample_request):
        """Test handling of validation failures"""
        # Mock validation failure
        handler._validate_indexing_complete = AsyncMock(side_effect=Exception("Indexing incomplete"))
        
        response = await handler.handle_request(sample_request)
        
        assert not response.success
        assert "Indexing incomplete" in response.error
    
    async def test_parse_research_objectives_validation(self, handler):
        """Test objective parsing and validation"""
        # Valid objectives
        valid_response = {
            "research_objectives": [
                {
                    "number": 1,
                    "title": "Test Objective",
                    "research_tasks": [
                        {"number": 1, "title": "Test Task"}
                    ]
                }
            ]
        }
        
        result = handler._parse_research_objectives(valid_response)
        assert len(result) == 1
        
        # Invalid objectives
        invalid_response = {
            "research_objectives": [
                {"number": 1}  # Missing required fields
            ]
        }
        
        with pytest.raises(ValueError, match="Invalid objective structure"):
            handler._parse_research_objectives(invalid_response)
```

**File:** `services/rag/tests/autofill/test_research_deep_dive_handler.py`

```python
import pytest
from unittest.mock import AsyncMock, MagicMock

from services.rag.src.autofill.research_deep_dive_handler import ResearchDeepDiveHandler
from services.rag.src.models.rag_request import AutofillRequest

class TestResearchDeepDiveHandler:
    
    @pytest.fixture
    def handler(self):
        logger = MagicMock()
        return ResearchDeepDiveHandler(logger)
    
    async def test_generate_field_answer(self, handler):
        """Test single field answer generation"""
        with patch('services.rag.src.autofill.research_deep_dive_handler.generate_completion') as mock_completion:
            mock_completion.return_value = "This is a generated answer about research background..."
            
            result = await handler._generate_field_answer(
                field_name="background_context",
                application_title="Test Application",
                research_objectives=[],
                documents=[{"content": "Sample document content"}],
                existing_answers={}
            )
            
            assert result == "This is a generated answer about research background..."
            mock_completion.assert_called_once()
    
    async def test_skip_existing_answers(self, handler):
        """Test that existing answers are skipped"""
        sample_request = AutofillRequest(
            parent_type="grant_application",
            parent_id="app-123",
            autofill_type="research_deep_dive"
        )
        
        sample_application = {
            "title": "Test",
            "form_inputs": {
                "background_context": "Existing answer"
            }
        }
        
        handler._validate_indexing_complete = AsyncMock()
        
        with patch('services.rag.src.autofill.research_deep_dive_handler.retrieve_documents') as mock_retrieve:
            mock_retrieve.return_value = []
            
            result = await handler._generate_content(sample_request, sample_application)
            
            # Should skip background_context since it already has content
            assert "background_context" not in result["form_inputs"]
    
    async def test_single_field_generation(self, handler):
        """Test generation of single field only"""
        sample_request = AutofillRequest(
            parent_type="grant_application",
            parent_id="app-123",
            autofill_type="research_deep_dive",
            field_name="hypothesis"
        )
        
        sample_application = {
            "title": "Test",
            "form_inputs": {}
        }
        
        handler._validate_indexing_complete = AsyncMock()
        
        with patch('services.rag.src.autofill.research_deep_dive_handler.retrieve_documents') as mock_retrieve:
            mock_retrieve.return_value = []
            
            with patch.object(handler, '_generate_field_answer') as mock_generate:
                mock_generate.return_value = "Generated hypothesis"
                
                result = await handler._generate_content(sample_request, sample_application)
                
                assert result["form_inputs"]["hypothesis"] == "Generated hypothesis"
                assert len(result["form_inputs"]) == 1
```

**E2E Testing:**

**File:** `services/rag/tests/e2e/test_autofill_pipeline.py`

```python
import pytest
from testing.e2e_utils import e2e_test, E2ETestCategory

@e2e_test(category=E2ETestCategory.SMOKE, timeout=120)
async def test_research_plan_autofill_pipeline(logger, async_session_maker):
    """Test full research plan autofill pipeline"""
    # Create test application with indexed sources
    application = await create_test_application_with_sources()
    
    # Create autofill request
    request = AutofillRequest(
        parent_type="grant_application",
        parent_id=application["id"],
        autofill_type="research_plan"
    )
    
    # Process request
    result = await handle_autofill_request(request)
    
    # Verify results
    assert result["success"] is True
    assert "research_objectives" in result["data"]
    assert len(result["data"]["research_objectives"]) >= 1
    
    # Verify structure
    for obj in result["data"]["research_objectives"]:
        assert "title" in obj
        assert "research_tasks" in obj
        assert len(obj["research_tasks"]) >= 1

@e2e_test(category=E2ETestCategory.QUALITY_ASSESSMENT, timeout=300)
async def test_research_deep_dive_autofill_quality(logger, async_session_maker):
    """Test quality of research deep dive autofill"""
    # Create test application with rich context
    application = await create_test_application_with_rich_context()
    
    # Generate autofill for all fields
    request = AutofillRequest(
        parent_type="grant_application",
        parent_id=application["id"],
        autofill_type="research_deep_dive"
    )
    
    result = await handle_autofill_request(request)
    
    # Verify all fields generated
    expected_fields = [
        "background_context", "hypothesis", "rationale",
        "novelty_and_innovation", "impact", "team_excellence",
        "research_feasibility", "preliminary_data"
    ]
    
    for field in expected_fields:
        assert field in result["data"]["form_inputs"]
        assert len(result["data"]["form_inputs"][field]) >= 200  # Minimum length
        assert len(result["data"]["form_inputs"][field]) <= 1000  # Maximum length
```

---

## Phase 2: Frontend Integration

### 2.1 Backend API Endpoints

**File:** `services/backend/src/controllers/applications.py`

```python
from litestar import post
from litestar.exceptions import ValidationException

from ..models.applications import AutofillRequest, AutofillResponse
from ..services.pubsub_service import publish_autofill_request
from ..services.job_service import create_autofill_job

@post("/applications/{application_id:str}/autofill/research-plan")
async def autofill_research_plan(
    application_id: str,
    session_maker: async_sessionmaker,
    user: User
) -> AutofillResponse:
    """Trigger research plan autofill"""
    
    async with session_maker() as session:
        # Verify application exists and user has access
        application = await get_application_with_access_check(
            session, application_id, user.id
        )
        
        # Check if indexing is complete
        if not _is_indexing_complete(application.rag_sources):
            raise ValidationException("Knowledge base indexing is not complete")
        
        # Create job for tracking
        job = await create_autofill_job(
            session=session,
            application_id=application_id,
            autofill_type="research_plan",
            user_id=user.id
        )
        
        # Publish autofill request
        await publish_autofill_request({
            "type": "autofill_request",
            "parent_type": "grant_application",
            "parent_id": application_id,
            "autofill_type": "research_plan",
            "job_id": job.id,
            "context": {}
        })
        
        return AutofillResponse(
            job_id=str(job.id),
            status="STARTED",
            message="Research plan autofill started"
        )

@post("/applications/{application_id:str}/autofill/research-deep-dive")
async def autofill_research_deep_dive(
    application_id: str,
    data: AutofillRequest,
    session_maker: async_sessionmaker,
    user: User
) -> AutofillResponse:
    """Trigger research deep dive autofill"""
    
    async with session_maker() as session:
        # Verify application exists and user has access
        application = await get_application_with_access_check(
            session, application_id, user.id
        )
        
        # Check if indexing is complete
        if not _is_indexing_complete(application.rag_sources):
            raise ValidationException("Knowledge base indexing is not complete")
        
        # Create job for tracking
        job = await create_autofill_job(
            session=session,
            application_id=application_id,
            autofill_type="research_deep_dive",
            user_id=user.id
        )
        
        # Publish autofill request
        await publish_autofill_request({
            "type": "autofill_request",
            "parent_type": "grant_application",
            "parent_id": application_id,
            "autofill_type": "research_deep_dive",
            "field_name": data.field_name,
            "job_id": job.id,
            "context": {
                "existing_form_inputs": application.form_inputs or {}
            }
        })
        
        return AutofillResponse(
            job_id=str(job.id),
            status="STARTED",
            message=f"Research deep dive autofill started{' for ' + data.field_name if data.field_name else ''}"
        )

def _is_indexing_complete(rag_sources: list) -> bool:
    """Check if all RAG sources are indexed"""
    if not rag_sources:
        return False
    
    return all(source.status == "FINISHED" for source in rag_sources)
```

**File:** `services/backend/src/models/applications.py`

```python
from typing import NotRequired
from msgspec import Struct

class AutofillRequest(Struct):
    """Request for autofill functionality"""
    field_name: NotRequired[str]

class AutofillResponse(Struct):
    """Response from autofill request"""
    job_id: str
    status: str
    message: str
```

### 2.2 Frontend API Client

**File:** `frontend/src/lib/api/autofill.ts`

```typescript
import { getClient } from './client';
import { createAuthHeaders, withAuthRedirect } from './auth';

export interface AutofillRequest {
	field_name?: string;
}

export interface AutofillResponse {
	job_id: string;
	status: string;
	message: string;
}

export interface AutofillJobStatus {
	id: string;
	status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
	progress: number;
	result?: {
		research_objectives?: Array<{
			number: number;
			title: string;
			description?: string;
			research_tasks: Array<{
				number: number;
				title: string;
				description?: string;
			}>;
		}>;
		form_inputs?: Record<string, string>;
	};
	error?: string;
}

export async function autofillResearchPlan(applicationId: string): Promise<AutofillResponse> {
	return withAuthRedirect(
		getClient()
			.post(`applications/${applicationId}/autofill/research-plan`, {
				headers: await createAuthHeaders(),
			})
			.json<AutofillResponse>(),
	);
}

export async function autofillResearchDeepDive(
	applicationId: string,
	request: AutofillRequest = {},
): Promise<AutofillResponse> {
	return withAuthRedirect(
		getClient()
			.post(`applications/${applicationId}/autofill/research-deep-dive`, {
				headers: await createAuthHeaders(),
				json: request,
			})
			.json<AutofillResponse>(),
	);
}

export async function getAutofillJobStatus(jobId: string): Promise<AutofillJobStatus> {
	return withAuthRedirect(
		getClient()
			.get(`jobs/${jobId}`, {
				headers: await createAuthHeaders(),
			})
			.json<AutofillJobStatus>(),
	);
}
```

### 2.3 React Hooks

**File:** `frontend/src/hooks/useAutofill.ts`

```typescript
import { useState, useCallback } from 'react';
import { useApplicationStore } from '../stores/applicationStore';
import { useWizardStore } from '../stores/wizardStore';
import { autofillResearchPlan, autofillResearchDeepDive, getAutofillJobStatus, type AutofillJobStatus } from '../lib/api/autofill';

export function useAutofillResearchPlan(applicationId: string) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [progress, setProgress] = useState(0);
	
	const { setResearchObjectives } = useApplicationStore();
	const { polling } = useWizardStore();
	
	const trigger = useCallback(async () => {
		setLoading(true);
		setError(null);
		setProgress(0);
		
		try {
			const { job_id } = await autofillResearchPlan(applicationId);
			
			// Poll job status
			const pollInterval = setInterval(async () => {
				try {
					const status = await getAutofillJobStatus(job_id);
					setProgress(status.progress);
					
					if (status.status === 'COMPLETED') {
						if (status.result?.research_objectives) {
							setResearchObjectives(status.result.research_objectives);
						}
						clearInterval(pollInterval);
						setLoading(false);
					} else if (status.status === 'FAILED') {
						setError(status.error || 'Autofill failed');
						clearInterval(pollInterval);
						setLoading(false);
					}
				} catch (err) {
					setError('Failed to check autofill status');
					clearInterval(pollInterval);
					setLoading(false);
				}
			}, 2000);
			
			// Cleanup on unmount
			return () => clearInterval(pollInterval);
			
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to start autofill');
			setLoading(false);
		}
	}, [applicationId, setResearchObjectives]);
	
	return { trigger, loading, error, progress };
}

export function useAutofillResearchDeepDive(applicationId: string) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [progress, setProgress] = useState(0);
	
	const { setFormInputs } = useApplicationStore();
	
	const trigger = useCallback(async (fieldName?: string) => {
		setLoading(true);
		setError(null);
		setProgress(0);
		
		try {
			const { job_id } = await autofillResearchDeepDive(applicationId, { field_name: fieldName });
			
			// Poll job status
			const pollInterval = setInterval(async () => {
				try {
					const status = await getAutofillJobStatus(job_id);
					setProgress(status.progress);
					
					if (status.status === 'COMPLETED') {
						if (status.result?.form_inputs) {
							setFormInputs(status.result.form_inputs);
						}
						clearInterval(pollInterval);
						setLoading(false);
					} else if (status.status === 'FAILED') {
						setError(status.error || 'Autofill failed');
						clearInterval(pollInterval);
						setLoading(false);
					}
				} catch (err) {
					setError('Failed to check autofill status');
					clearInterval(pollInterval);
					setLoading(false);
				}
			}, 2000);
			
			// Cleanup on unmount
			return () => clearInterval(pollInterval);
			
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to start autofill');
			setLoading(false);
		}
	}, [applicationId, setFormInputs]);
	
	return { trigger, loading, error, progress };
}

export function useAutofillValidation(applicationId: string) {
	const { application } = useApplicationStore();
	
	const canAutofill = useCallback(() => {
		if (!application?.rag_sources?.length) {
			return { canAutofill: false, reason: 'No knowledge base sources uploaded' };
		}
		
		const failedSources = application.rag_sources.filter(source => source.status === 'FAILED');
		if (failedSources.length > 0) {
			return { canAutofill: false, reason: `${failedSources.length} knowledge base sources failed to index` };
		}
		
		const stillIndexing = application.rag_sources.filter(source => source.status === 'INDEXING');
		if (stillIndexing.length > 0) {
			return { canAutofill: false, reason: `${stillIndexing.length} knowledge base sources still indexing` };
		}
		
		const notStarted = application.rag_sources.filter(source => source.status === 'CREATED');
		if (notStarted.length > 0) {
			return { canAutofill: false, reason: `${notStarted.length} knowledge base sources not yet started` };
		}
		
		return { canAutofill: true, reason: null };
	}, [application]);
	
	return canAutofill();
}
```

### 2.4 UI Components

**File:** `frontend/src/components/autofill/AutofillButton.tsx`

```typescript
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';

interface AutofillButtonProps {
	onClick: () => void;
	loading?: boolean;
	disabled?: boolean;
	progress?: number;
	className?: string;
	children?: React.ReactNode;
}

export function AutofillButton({ 
	onClick, 
	loading = false, 
	disabled = false, 
	progress = 0,
	className = '',
	children = 'Let the AI Try!'
}: AutofillButtonProps) {
	return (
		<Button
			onClick={onClick}
			disabled={disabled || loading}
			className={`relative ${className}`}
			variant="outline"
		>
			{loading ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					{progress > 0 ? `Generating... ${Math.round(progress)}%` : 'Starting...'}
				</>
			) : (
				<>
					<Sparkles className="mr-2 h-4 w-4" />
					{children}
				</>
			)}
		</Button>
	);
}
```

**File:** `frontend/src/components/autofill/AutofillStatus.tsx`

```typescript
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface AutofillStatusProps {
	canAutofill: boolean;
	reason?: string | null;
	loading?: boolean;
	error?: string | null;
}

export function AutofillStatus({ canAutofill, reason, loading, error }: AutofillStatusProps) {
	if (loading) {
		return (
			<Alert>
				<Loader2 className="h-4 w-4 animate-spin" />
				<AlertDescription>
					AI is generating content based on your knowledge base...
				</AlertDescription>
			</Alert>
		);
	}
	
	if (error) {
		return (
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>
					{error}
				</AlertDescription>
			</Alert>
		);
	}
	
	if (!canAutofill && reason) {
		return (
			<Alert>
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>
					{reason}
				</AlertDescription>
			</Alert>
		);
	}
	
	if (canAutofill) {
		return (
			<Alert>
				<CheckCircle className="h-4 w-4" />
				<AlertDescription>
					Knowledge base is ready for AI autofill
				</AlertDescription>
			</Alert>
		);
	}
	
	return null;
}
```

### 2.5 Step Integration

**File:** `frontend/src/components/projects/wizard/steps/research-plan-step.tsx`

```typescript
// Add imports
import { useAutofillResearchPlan, useAutofillValidation } from '@/hooks/useAutofill';
import { AutofillButton } from '@/components/autofill/AutofillButton';
import { AutofillStatus } from '@/components/autofill/AutofillStatus';

// Update component
export function ResearchPlanStep() {
	const { application } = useApplicationStore();
	const { trigger: autofillPlan, loading, error, progress } = useAutofillResearchPlan(application?.id || '');
	const { canAutofill, reason } = useAutofillValidation(application?.id || '');
	
	const handleAutofill = useCallback(async () => {
		if (!canAutofill) return;
		await autofillPlan();
	}, [autofillPlan, canAutofill]);
	
	// Replace existing "Let the AI Try!" button section
	return (
		<div className="space-y-6">
			{/* Existing content */}
			
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold">Research Objectives</h3>
					<AutofillButton
						onClick={handleAutofill}
						loading={loading}
						disabled={!canAutofill}
						progress={progress}
					/>
				</div>
				
				<AutofillStatus 
					canAutofill={canAutofill}
					reason={reason}
					loading={loading}
					error={error}
				/>
				
				{/* Existing objectives list */}
			</div>
		</div>
	);
}
```

**File:** `frontend/src/components/projects/wizard/steps/research-deep-dive-step.tsx`

```typescript
// Add imports
import { useAutofillResearchDeepDive, useAutofillValidation } from '@/hooks/useAutofill';
import { AutofillButton } from '@/components/autofill/AutofillButton';
import { AutofillStatus } from '@/components/autofill/AutofillStatus';

// Update component
export function ResearchDeepDiveStep() {
	const { application } = useApplicationStore();
	const { trigger: autofillField, loading, error, progress } = useAutofillResearchDeepDive(application?.id || '');
	const { canAutofill, reason } = useAutofillValidation(application?.id || '');
	
	const handleFieldAutofill = useCallback(async (fieldName: string) => {
		if (!canAutofill) return;
		await autofillField(fieldName);
	}, [autofillField, canAutofill]);
	
	const handleFullAutofill = useCallback(async () => {
		if (!canAutofill) return;
		await autofillField(); // No field name = all fields
	}, [autofillField, canAutofill]);
	
	// Update the main "Let the AI Try!" button
	return (
		<div className="flex h-full">
			{/* Questions panel */}
			<div className="w-1/3 space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold">Research Questions</h3>
					<AutofillButton
						onClick={handleFullAutofill}
						loading={loading}
						disabled={!canAutofill}
						progress={progress}
						className="text-sm"
					>
						Fill All
					</AutofillButton>
				</div>
				
				<AutofillStatus 
					canAutofill={canAutofill}
					reason={reason}
					loading={loading}
					error={error}
				/>
				
				{/* Existing questions list */}
			</div>
			
			{/* Answer panel */}
			<div className="w-2/3 space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold">{currentQuestion.title}</h3>
					<AutofillButton
						onClick={() => handleFieldAutofill(currentQuestion.field)}
						loading={loading}
						disabled={!canAutofill}
						className="text-sm"
					>
						Fill This
					</AutofillButton>
				</div>
				
				{/* Existing answer textarea */}
			</div>
		</div>
	);
}
```

### 2.6 Testing Strategy for Phase 2

**File:** `frontend/src/hooks/__tests__/useAutofill.spec.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useAutofillResearchPlan, useAutofillValidation } from '../useAutofill';
import * as autofillApi from '@/lib/api/autofill';

// Mock API
vi.mock('@/lib/api/autofill');

describe('useAutofillResearchPlan', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	
	it('should trigger autofill successfully', async () => {
		// Mock API responses
		vi.mocked(autofillApi.autofillResearchPlan).mockResolvedValue({
			job_id: 'job-123',
			status: 'STARTED',
			message: 'Started'
		});
		
		vi.mocked(autofillApi.getAutofillJobStatus).mockResolvedValue({
			id: 'job-123',
			status: 'COMPLETED',
			progress: 100,
			result: {
				research_objectives: [
					{
						number: 1,
						title: 'Test Objective',
						research_tasks: [
							{ number: 1, title: 'Test Task' }
						]
					}
				]
			}
		});
		
		const { result } = renderHook(() => useAutofillResearchPlan('app-123'));
		
		// Trigger autofill
		await act(async () => {
			await result.current.trigger();
		});
		
		// Verify API calls
		expect(autofillApi.autofillResearchPlan).toHaveBeenCalledWith('app-123');
		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBeNull();
	});
	
	it('should handle autofill errors', async () => {
		vi.mocked(autofillApi.autofillResearchPlan).mockRejectedValue(new Error('API Error'));
		
		const { result } = renderHook(() => useAutofillResearchPlan('app-123'));
		
		await act(async () => {
			await result.current.trigger();
		});
		
		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBe('API Error');
	});
});

describe('useAutofillValidation', () => {
	it('should validate successful case', () => {
		const mockApplication = {
			rag_sources: [
				{ status: 'FINISHED', sourceId: '1' },
				{ status: 'FINISHED', sourceId: '2' }
			]
		};
		
		// Mock application store
		vi.mocked(useApplicationStore).mockReturnValue({
			application: mockApplication
		});
		
		const { result } = renderHook(() => useAutofillValidation('app-123'));
		
		expect(result.current.canAutofill).toBe(true);
		expect(result.current.reason).toBeNull();
	});
	
	it('should validate indexing in progress', () => {
		const mockApplication = {
			rag_sources: [
				{ status: 'FINISHED', sourceId: '1' },
				{ status: 'INDEXING', sourceId: '2' }
			]
		};
		
		vi.mocked(useApplicationStore).mockReturnValue({
			application: mockApplication
		});
		
		const { result } = renderHook(() => useAutofillValidation('app-123'));
		
		expect(result.current.canAutofill).toBe(false);
		expect(result.current.reason).toBe('1 knowledge base sources still indexing');
	});
});
```

**File:** `frontend/src/components/autofill/__tests__/AutofillButton.spec.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { AutofillButton } from '../AutofillButton';

describe('AutofillButton', () => {
	it('should render default state', () => {
		const onClick = vi.fn();
		render(<AutofillButton onClick={onClick} />);
		
		expect(screen.getByText('Let the AI Try!')).toBeInTheDocument();
		expect(screen.getByRole('button')).not.toBeDisabled();
	});
	
	it('should handle click events', () => {
		const onClick = vi.fn();
		render(<AutofillButton onClick={onClick} />);
		
		fireEvent.click(screen.getByRole('button'));
		expect(onClick).toHaveBeenCalledTimes(1);
	});
	
	it('should show loading state', () => {
		const onClick = vi.fn();
		render(<AutofillButton onClick={onClick} loading progress={75} />);
		
		expect(screen.getByText('Generating... 75%')).toBeInTheDocument();
		expect(screen.getByRole('button')).toBeDisabled();
	});
	
	it('should be disabled when specified', () => {
		const onClick = vi.fn();
		render(<AutofillButton onClick={onClick} disabled />);
		
		expect(screen.getByRole('button')).toBeDisabled();
		fireEvent.click(screen.getByRole('button'));
		expect(onClick).not.toHaveBeenCalled();
	});
});
```

**E2E Testing:**

**File:** `frontend/src/components/projects/wizard/__tests__/autofill-integration.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Wizard Autofill Integration', () => {
	test.beforeEach(async ({ page }) => {
		// Set up test application with indexed sources
		await page.goto('/projects/test-project/applications/test-app/wizard');
		await page.waitForLoadState('networkidle');
	});
	
	test('should autofill research plan', async ({ page }) => {
		// Navigate to step 4
		await page.click('[data-testid="step-4"]');
		
		// Verify autofill button is enabled
		const autofillButton = page.locator('[data-testid="autofill-research-plan"]');
		await expect(autofillButton).toBeEnabled();
		
		// Click autofill
		await autofillButton.click();
		
		// Wait for loading to complete
		await page.waitForSelector('[data-testid="autofill-loading"]', { state: 'detached' });
		
		// Verify objectives were generated
		await expect(page.locator('[data-testid="research-objective"]')).toHaveCount.greaterThan(0);
		
		// Verify objective structure
		const firstObjective = page.locator('[data-testid="research-objective"]').first();
		await expect(firstObjective.locator('[data-testid="objective-title"]')).toHaveText(/\w+/);
		await expect(firstObjective.locator('[data-testid="research-task"]')).toHaveCount.greaterThan(0);
	});
	
	test('should autofill individual research questions', async ({ page }) => {
		// Navigate to step 5
		await page.click('[data-testid="step-5"]');
		
		// Click on first question
		await page.click('[data-testid="question-background_context"]');
		
		// Click field-specific autofill
		await page.click('[data-testid="autofill-field"]');
		
		// Wait for generation
		await page.waitForSelector('[data-testid="autofill-loading"]', { state: 'detached' });
		
		// Verify answer was generated
		const answerTextarea = page.locator('[data-testid="answer-textarea"]');
		await expect(answerTextarea).toHaveValue(/\w+/);
		
		// Verify answer has reasonable length
		const answerText = await answerTextarea.inputValue();
		expect(answerText.length).toBeGreaterThan(100);
	});
	
	test('should handle indexing not complete', async ({ page }) => {
		// Mock application with sources still indexing
		await page.route('**/applications/test-app', async route => {
			await route.fulfill({
				json: {
					id: 'test-app',
					rag_sources: [
						{ status: 'INDEXING', sourceId: '1' }
					]
				}
			});
		});
		
		await page.reload();
		await page.click('[data-testid="step-4"]');
		
		// Verify autofill button is disabled
		const autofillButton = page.locator('[data-testid="autofill-research-plan"]');
		await expect(autofillButton).toBeDisabled();
		
		// Verify status message
		await expect(page.locator('[data-testid="autofill-status"]')).toContainText('still indexing');
	});
});
```

---

## Phase 3: Advanced Features

### 3.1 Incremental Autofill Enhancement

**File:** `frontend/src/hooks/useIncrementalAutofill.ts`

```typescript
import { useState, useCallback } from 'react';
import { useAutofillResearchDeepDive } from './useAutofill';

export function useIncrementalAutofill(applicationId: string) {
	const [activeFields, setActiveFields] = useState<Set<string>>(new Set());
	const { trigger, loading, error, progress } = useAutofillResearchDeepDive(applicationId);
	
	const fillField = useCallback(async (fieldName: string) => {
		setActiveFields(prev => new Set(prev).add(fieldName));
		try {
			await trigger(fieldName);
		} finally {
			setActiveFields(prev => {
				const next = new Set(prev);
				next.delete(fieldName);
				return next;
			});
		}
	}, [trigger]);
	
	const isFieldLoading = useCallback((fieldName: string) => {
		return activeFields.has(fieldName);
	}, [activeFields]);
	
	return {
		fillField,
		isFieldLoading,
		globalLoading: loading,
		error,
		progress
	};
}
```

### 3.2 Quality Validation Integration

**File:** `services/rag/src/autofill/quality_validator.py`

```python
import logging
from typing import Dict, List, Tuple

from ..utils.completion import generate_completion

class AutofillQualityValidator:
    """Validates quality of autofill content"""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    async def validate_research_objectives(self, objectives: List[Dict]) -> Tuple[bool, float, str]:
        """Validate research objectives quality"""
        
        validation_prompt = f"""
Evaluate the quality of these research objectives for a grant application:

{self._format_objectives(objectives)}

Rate the objectives on a scale of 1-10 based on:
1. Specificity and clarity
2. Feasibility and achievability  
3. Scientific rigor
4. Alignment with stated goals
5. Proper task breakdown

Return your evaluation as JSON:
{{
    "score": 8.5,
    "issues": ["Issue 1", "Issue 2"],
    "recommendations": ["Rec 1", "Rec 2"]
}}
"""
        
        try:
            response = await generate_completion(
                prompt=validation_prompt,
                response_format="json",
                model_preference="claude"
            )
            
            score = response.get("score", 0)
            issues = response.get("issues", [])
            recommendations = response.get("recommendations", [])
            
            is_quality = score >= 7.0
            feedback = self._format_feedback(score, issues, recommendations)
            
            return is_quality, score, feedback
            
        except Exception as e:
            self.logger.exception("Quality validation failed")
            return True, 5.0, "Quality validation unavailable"
    
    async def validate_research_answer(self, question: str, answer: str, context: Dict) -> Tuple[bool, float, str]:
        """Validate individual research answer quality"""
        
        validation_prompt = f"""
Evaluate this research answer for a grant application:

QUESTION: {question}
ANSWER: {answer}

CONTEXT: {context.get('application_title', 'N/A')}

Rate the answer on a scale of 1-10 based on:
1. Directly addresses the question
2. Appropriate length and detail
3. Scientific accuracy and rigor
4. Relevance to research context
5. Grant application suitability

Return JSON evaluation:
{{
    "score": 8.5,
    "issues": ["Issue 1"],
    "recommendations": ["Rec 1"]
}}
"""
        
        try:
            response = await generate_completion(
                prompt=validation_prompt,
                response_format="json",
                model_preference="claude"
            )
            
            score = response.get("score", 0)
            issues = response.get("issues", [])
            recommendations = response.get("recommendations", [])
            
            is_quality = score >= 7.0
            feedback = self._format_feedback(score, issues, recommendations)
            
            return is_quality, score, feedback
            
        except Exception as e:
            self.logger.exception("Answer quality validation failed")
            return True, 5.0, "Quality validation unavailable"
    
    def _format_objectives(self, objectives: List[Dict]) -> str:
        """Format objectives for validation"""
        formatted = []
        for obj in objectives:
            formatted.append(f"Objective {obj['number']}: {obj['title']}")
            if obj.get('description'):
                formatted.append(f"  Description: {obj['description']}")
            
            for task in obj.get('research_tasks', []):
                formatted.append(f"  Task {task['number']}: {task['title']}")
        
        return "\n".join(formatted)
    
    def _format_feedback(self, score: float, issues: List[str], recommendations: List[str]) -> str:
        """Format validation feedback"""
        feedback = [f"Quality Score: {score}/10"]
        
        if issues:
            feedback.append("\nIssues:")
            feedback.extend([f"- {issue}" for issue in issues])
        
        if recommendations:
            feedback.append("\nRecommendations:")
            feedback.extend([f"- {rec}" for rec in recommendations])
        
        return "\n".join(feedback)
```

### 3.3 Context Enhancement

**File:** `services/rag/src/autofill/context_enhancer.py`

```python
from typing import Dict, List, Any
import logging

class ContextEnhancer:
    """Enhances autofill context with related information"""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    def enhance_research_plan_context(self, application: Dict, documents: List[Dict]) -> Dict:
        """Enhance context for research plan generation"""
        
        context = {
            "application_title": application.get("title", ""),
            "document_topics": self._extract_document_topics(documents),
            "research_domain": self._infer_research_domain(application, documents),
            "methodology_hints": self._extract_methodology_hints(documents)
        }
        
        return context
    
    def enhance_deep_dive_context(self, application: Dict, documents: List[Dict], field_name: str) -> Dict:
        """Enhance context for specific research question"""
        
        base_context = {
            "application_title": application.get("title", ""),
            "research_objectives": application.get("research_objectives", []),
            "existing_answers": application.get("form_inputs", {}),
            "field_name": field_name
        }
        
        # Add field-specific context
        if field_name == "hypothesis":
            base_context["related_background"] = self._extract_hypothesis_context(documents)
        elif field_name == "methodology":
            base_context["methodology_examples"] = self._extract_methodology_examples(documents)
        elif field_name == "team_excellence":
            base_context["team_credentials"] = self._extract_team_info(documents)
        
        return base_context
    
    def _extract_document_topics(self, documents: List[Dict]) -> List[str]:
        """Extract key topics from documents"""
        # Simple keyword extraction - could be enhanced with NLP
        topics = []
        for doc in documents[:10]:  # Limit to first 10 docs
            content = doc.get('content', '').lower()
            # Extract potential topics (simplified)
            if 'machine learning' in content:
                topics.append('machine learning')
            if 'clinical trial' in content:
                topics.append('clinical research')
            if 'data analysis' in content:
                topics.append('data science')
        
        return list(set(topics))
    
    def _infer_research_domain(self, application: Dict, documents: List[Dict]) -> str:
        """Infer research domain from context"""
        title = application.get("title", "").lower()
        
        # Domain inference logic
        if any(term in title for term in ['medical', 'health', 'clinical', 'disease']):
            return 'medical'
        elif any(term in title for term in ['ai', 'machine learning', 'computer', 'algorithm']):
            return 'computer_science'
        elif any(term in title for term in ['climate', 'environment', 'sustainability']):
            return 'environmental'
        else:
            return 'general'
    
    def _extract_methodology_hints(self, documents: List[Dict]) -> List[str]:
        """Extract methodology hints from documents"""
        methods = []
        for doc in documents:
            content = doc.get('content', '').lower()
            if 'randomized controlled trial' in content:
                methods.append('RCT')
            if 'survey' in content:
                methods.append('survey_research')
            if 'statistical analysis' in content:
                methods.append('statistical_analysis')
        
        return list(set(methods))
    
    def _extract_hypothesis_context(self, documents: List[Dict]) -> str:
        """Extract context relevant to hypothesis formation"""
        # Look for research gaps, problems, or questions in documents
        hypothesis_context = []
        for doc in documents[:5]:
            content = doc.get('content', '')
            # Extract sentences containing hypothesis-related keywords
            sentences = content.split('.')
            for sentence in sentences:
                if any(term in sentence.lower() for term in ['hypothesis', 'question', 'problem', 'gap']):
                    hypothesis_context.append(sentence.strip())
        
        return ' '.join(hypothesis_context[:3])  # Return first 3 relevant sentences
    
    def _extract_methodology_examples(self, documents: List[Dict]) -> List[str]:
        """Extract methodology examples from documents"""
        methods = []
        for doc in documents:
            content = doc.get('content', '').lower()
            # Look for methodology descriptions
            if 'methodology' in content or 'method' in content:
                methods.append(content[:200])  # First 200 chars
        
        return methods[:3]  # Return first 3 examples
    
    def _extract_team_info(self, documents: List[Dict]) -> List[str]:
        """Extract team/PI information from documents"""
        team_info = []
        for doc in documents:
            content = doc.get('content', '').lower()
            if any(term in content for term in ['cv', 'resume', 'biography', 'publications']):
                team_info.append(content[:300])  # First 300 chars
        
        return team_info[:2]  # Return first 2 team documents
```

### 3.4 Testing Strategy for Phase 3

**File:** `services/rag/tests/autofill/test_quality_validator.py`

```python
import pytest
from unittest.mock import AsyncMock, MagicMock

from services.rag.src.autofill.quality_validator import AutofillQualityValidator

class TestAutofillQualityValidator:
    
    @pytest.fixture
    def validator(self):
        logger = MagicMock()
        return AutofillQualityValidator(logger)
    
    async def test_validate_research_objectives_high_quality(self, validator):
        """Test validation of high-quality objectives"""
        objectives = [
            {
                "number": 1,
                "title": "Develop AI diagnostic tool",
                "description": "Create machine learning model for medical diagnosis",
                "research_tasks": [
                    {"number": 1, "title": "Collect training data"},
                    {"number": 2, "title": "Train ML model"}
                ]
            }
        ]
        
        with patch('services.rag.src.autofill.quality_validator.generate_completion') as mock_completion:
            mock_completion.return_value = {
                "score": 8.5,
                "issues": [],
                "recommendations": ["Consider additional validation methods"]
            }
            
            is_quality, score, feedback = await validator.validate_research_objectives(objectives)
            
            assert is_quality is True
            assert score == 8.5
            assert "Quality Score: 8.5/10" in feedback
    
    async def test_validate_research_objectives_low_quality(self, validator):
        """Test validation of low-quality objectives"""
        objectives = [
            {
                "number": 1,
                "title": "Do research",
                "research_tasks": [
                    {"number": 1, "title": "Research stuff"}
                ]
            }
        ]
        
        with patch('services.rag.src.autofill.quality_validator.generate_completion') as mock_completion:
            mock_completion.return_value = {
                "score": 4.0,
                "issues": ["Objectives too vague", "Tasks lack specificity"],
                "recommendations": ["Make objectives more specific", "Add measurable outcomes"]
            }
            
            is_quality, score, feedback = await validator.validate_research_objectives(objectives)
            
            assert is_quality is False
            assert score == 4.0
            assert "Objectives too vague" in feedback
            assert "Make objectives more specific" in feedback
```

---

## Implementation Timeline

### Week 1: Backend Foundation
- **Days 1-2**: RAG service autofill models and handlers
- **Days 3-4**: Backend API endpoints and job management
- **Day 5**: Backend testing and integration

### Week 2: Frontend Integration
- **Days 1-2**: Frontend API client and React hooks
- **Days 3-4**: UI components and step integration
- **Day 5**: Frontend testing and E2E validation

### Week 3: Advanced Features & Polish
- **Days 1-2**: Quality validation and context enhancement
- **Days 3-4**: Incremental autofill and UX improvements
- **Day 5**: Performance optimization and final testing

## Success Metrics

### Functional Requirements
- [ ] Research plan autofill generates 3-5 objectives with tasks
- [ ] Research deep dive autofill fills all 8 questions
- [ ] Individual field autofill works for each research question
- [ ] Indexing validation prevents premature autofill attempts
- [ ] Error handling provides clear user feedback

### Quality Requirements
- [ ] Generated content is contextually relevant (>80% user satisfaction)
- [ ] Autofill completion time <2 minutes for typical knowledge base
- [ ] Generated text length appropriate for each field (200-500 words)
- [ ] Content incorporates uploaded document insights
- [ ] Users can review and edit all generated content

### Technical Requirements
- [ ] All autofill operations are asynchronous with progress tracking
- [ ] Proper error handling and graceful degradation
- [ ] Test coverage >90% for new code
- [ ] Performance impact <500ms on wizard loading
- [ ] Scalable architecture supports future autofill features

## Risk Mitigation

### Technical Risks
- **LLM API Rate Limits**: Implement proper retry logic and fallback models
- **Generation Quality**: Use quality validation and allow regeneration
- **Performance**: Cache retrieved documents and optimize prompts
- **Indexing Failures**: Provide clear error messages and retry mechanisms

### User Experience Risks
- **Over-reliance on AI**: Always allow manual editing and provide clear AI indicators
- **Expectation Management**: Set appropriate loading times and progress indicators
- **Context Misalignment**: Use quality validation to catch irrelevant content
- **Data Privacy**: Ensure all processing complies with privacy requirements

## Deployment Strategy

### Staging Deployment
1. Deploy backend RAG service changes
2. Deploy backend API endpoints
3. Deploy frontend components with feature flags
4. Enable autofill for test applications
5. Validate E2E workflows

### Production Rollout
1. Deploy to production with feature flags disabled
2. Enable for internal testing accounts
3. Gradual rollout to beta users (20% -> 50% -> 100%)
4. Monitor usage metrics and error rates
5. Full release after validation

## Monitoring & Observability

### Key Metrics
- **Autofill Success Rate**: % of successful autofill requests
- **Generation Quality**: User satisfaction scores and edit rates
- **Performance**: Average autofill completion time
- **Usage**: % of wizards using autofill vs manual entry
- **Error Rates**: Failed autofill attempts and reasons

### Alerting
- Autofill error rate >10%
- Average generation time >5 minutes
- RAG service availability <99%
- Quality validation failures >20%

This implementation plan provides a concrete roadmap for adding AI-powered autofill functionality to the grant application wizard, leveraging the existing RAG infrastructure while ensuring a smooth user experience and maintainable codebase.