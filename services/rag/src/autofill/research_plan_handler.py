from typing import Any
from uuid import UUID

from packages.db.src.tables import GrantApplication
from packages.db.src.utils import retrieve_application
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.rag.src.dto import AutofillRequestDTO, AutofillResponseDTO
from services.rag.src.utils.checks import verify_rag_sources_indexed
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.search_queries import handle_create_search_queries

from .constants import (
    DOCUMENT_PREVIEW_LENGTH,
    RESEARCH_PLAN_MAX_DOCUMENTS,
    RESEARCH_PLAN_MAX_TOKENS,
    RESEARCH_PLAN_SYSTEM_PROMPT,
    TEMPERATURE,
)


def format_existing_objectives_text(existing: list[dict[str, Any]]) -> str:
    if not existing:
        return "None"

    formatted = []
    for obj in existing:
        formatted.append(f"Objective {obj.get('number', '?')}: {obj.get('title', '')}")
        if obj.get("description"):
            formatted.append(f"  Description: {obj['description']}")

        formatted.extend(
            [f"  Task {task.get('number', '?')}: {task.get('title', '')}" for task in obj.get("research_tasks", [])]
        )

    return "\n".join(formatted)


RESEARCH_PLAN_USER_PROMPT = PromptTemplate(
    name="research_plan_generation",
    template="""
Based on the following research context and documents, generate a research plan for the grant application titled: "${application_title}"

## RESEARCH CONTEXT
${context_docs}

## EXISTING OBJECTIVES
${existing_objectives}

Generate 3-5 research objectives, each with 2-4 specific research tasks that are concrete and actionable.

## REQUIREMENTS
- Objectives should be specific, measurable, and achievable
- Tasks should be concrete and actionable steps
- Use insights from the provided research context
- Build upon existing objectives if provided
- Ensure logical flow between objectives
- Focus on grant-appropriate research activities

## RESPONSE FORMAT
Return your response as valid JSON in the following structure:

```json
{
    "research_objectives": [
        {
            "number": 1,
            "title": "Objective Title",
            "description": "Detailed description of the objective (2-3 sentences)",
            "research_tasks": [
                {
                    "number": 1,
                    "title": "Task Title",
                    "description": "Specific task description (1-2 sentences)"
                }
            ]
        }
    ]
}
```
""",
)


async def generate_research_plan_content(
    request: AutofillRequestDTO, application: dict[str, Any], logger: Any
) -> dict[str, Any]:
    app_title = application.get("title", "")
    existing_objectives = application.get("research_objectives", [])

    logger.info(
        "Starting research plan generation",
        application_id=request["parent_id"],
        application_title=app_title,
        existing_objectives_count=len(existing_objectives),
    )

    search_prompt = f"Generate research objectives and tasks for grant application: {app_title}"

    search_queries = await handle_create_search_queries(
        user_prompt=search_prompt, context={"application_title": app_title}
    )

    logger.debug(
        "Generated search queries",
        application_id=request["parent_id"],
        queries_count=len(search_queries),
        queries=search_queries,
    )

    documents = await retrieve_documents(
        application_id=request["parent_id"],
        search_queries=search_queries,
        task_description=search_prompt,
        max_tokens=RESEARCH_PLAN_MAX_TOKENS,
    )

    logger.debug("Retrieved documents", application_id=request["parent_id"], documents_count=len(documents))

    objectives = await generate_objectives_with_llm(app_title, documents, existing_objectives, logger)

    logger.info(
        "Research plan generation completed",
        application_id=request["parent_id"],
        generated_objectives_count=len(objectives),
    )

    return {
        "research_objectives": objectives,
        "generation_context": {"documents_used": len(documents), "search_queries": search_queries},
    }


async def generate_objectives_with_llm(
    title: str, documents: list[str], existing: list[dict[str, Any]], logger: Any
) -> list[dict[str, Any]]:
    context_docs = format_documents_for_research_plan_context(documents)
    existing_text = format_existing_objectives_text(existing)

    prompt = RESEARCH_PLAN_USER_PROMPT.substitute(
        application_title=title, context_docs=context_docs, existing_objectives=existing_text
    )

    response = await handle_completions_request(
        prompt_identifier="research_plan_generation",
        messages=str(prompt),
        system_prompt=RESEARCH_PLAN_SYSTEM_PROMPT,
        response_type=dict,
        temperature=TEMPERATURE,
    )

    return parse_and_validate_objectives(response, logger)


def format_documents_for_research_plan_context(documents: list[str]) -> str:
    if not documents:
        return "No research documents available."

    formatted_docs = []
    for i, doc in enumerate(documents[:RESEARCH_PLAN_MAX_DOCUMENTS]):
        content = doc[:DOCUMENT_PREVIEW_LENGTH] if len(doc) > DOCUMENT_PREVIEW_LENGTH else doc
        formatted_docs.append(f"Document {i + 1}: {content}...")

    return "\n".join(formatted_docs)


def parse_and_validate_objectives(response: dict[str, Any], logger: Any) -> list[dict[str, Any]]:
    objectives: list[dict[str, Any]] = response.get("research_objectives", [])

    if not objectives:
        raise ValueError("No research objectives generated")

    for i, obj in enumerate(objectives):
        if not all(key in obj for key in ["number", "title", "research_tasks"]):
            raise ValueError(f"Invalid objective structure at index {i}: {obj}")

        tasks = obj.get("research_tasks", [])
        if not tasks:
            raise ValueError(f"Objective {i + 1} has no research tasks")

        for j, task in enumerate(tasks):
            if not all(key in task for key in ["number", "title"]):
                raise ValueError(f"Invalid task structure at objective {i + 1}, task {j + 1}: {task}")

    logger.debug(
        "Validated research objectives structure",
        objectives_count=len(objectives),
        total_tasks=sum(len(obj.get("research_tasks", [])) for obj in objectives),
    )

    return objectives


async def handle_research_plan(
    request: AutofillRequestDTO, session_maker: async_sessionmaker[Any], logger: Any
) -> AutofillResponseDTO:
    try:
        application_id = UUID(request["parent_id"])

        await verify_rag_sources_indexed(application_id, session_maker, GrantApplication)

        async with session_maker() as session:
            grant_application = await retrieve_application(application_id=application_id, session=session)

        application_data = {
            "id": str(grant_application.id),
            "title": grant_application.title,
            "research_objectives": grant_application.research_objectives or [],
            "form_inputs": grant_application.form_inputs or {},
        }

        result = await generate_research_plan_content(request, application_data, logger)

        success_response: AutofillResponseDTO = {
            "success": True,
            "data": result,
        }
        if field_name := request.get("field_name"):
            success_response["field_name"] = field_name
        return success_response

    except Exception as e:
        logger.exception(
            "Research plan generation failed", request_id=request["parent_id"], autofill_type=request["autofill_type"]
        )

        error_response: AutofillResponseDTO = {"success": False, "data": {}, "error": str(e)}
        if field_name := request.get("field_name"):
            error_response["field_name"] = field_name
        return error_response
