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

from .constants import (
    ANSWER_PREVIEW_LENGTH,
    DOCUMENT_PREVIEW_LENGTH,
    MAX_RETRIEVAL_TOKENS,
    MIN_ANSWER_LENGTH,
    RESEARCH_DEEP_DIVE_FIELD_MAPPING,
    RESEARCH_DEEP_DIVE_SYSTEM_PROMPT,
    TEMPERATURE,
)


def format_documents_for_context(documents: list[str], max_docs: int = 15) -> str:
    if not documents:
        return "No research documents available."

    formatted_docs = []
    for _i, doc in enumerate(documents[:max_docs]):
        content = doc[:DOCUMENT_PREVIEW_LENGTH] if len(doc) > DOCUMENT_PREVIEW_LENGTH else doc
        formatted_docs.append(f"- {content}...")

    return "\n".join(formatted_docs)


def format_research_objectives(objectives: list[dict[str, Any]]) -> str:
    if not objectives:
        return "No research objectives defined."

    formatted = []
    for i, obj in enumerate(objectives):
        title = obj.get("title", f"Objective {i + 1}")
        description = obj.get("description", "")
        formatted.append(f"{i + 1}. {title}")
        if description:
            formatted.append(f"   {description}")

    return "\n".join(formatted)


def format_existing_answers(answers: dict[str, Any], current_field: str) -> str:
    if not answers:
        return "None"

    formatted = []
    for field, answer in answers.items():
        if field != current_field and answer and answer.strip():
            question = RESEARCH_DEEP_DIVE_FIELD_MAPPING.get(field, field)
            answer_preview = answer[:ANSWER_PREVIEW_LENGTH] + "..." if len(answer) > ANSWER_PREVIEW_LENGTH else answer
            formatted.append(f"{question}: {answer_preview}")

    return "\n".join(formatted) if formatted else "None"


RESEARCH_DEEP_DIVE_USER_PROMPT = PromptTemplate(
    name="research_deep_dive_generation",
    template="""
Based on the research context below, answer the following question for a grant application titled: "${application_title}"

## QUESTION
${question}

## RESEARCH CONTEXT
${context_docs}

## RESEARCH OBJECTIVES
${objectives_text}

## EXISTING FORM RESPONSES
${existing_answers}

## REQUIREMENTS
Provide a comprehensive, well-structured answer that:
1. Directly addresses the question
2. Uses insights from the research context
3. Aligns with the stated research objectives
4. Is appropriate for a grant application
5. Is 200-500 words in length
6. Uses professional academic tone
7. Includes specific details and examples where relevant

## RESPONSE FORMAT
Provide only the answer text, without any additional formatting or explanations.
""",
)


async def generate_research_deep_dive_content(
    request: AutofillRequestDTO, application: dict[str, Any], logger: Any
) -> dict[str, Any]:
    target_fields = (
        [request["field_name"]] if request.get("field_name") else list(RESEARCH_DEEP_DIVE_FIELD_MAPPING.keys())
    )

    app_title = application.get("title", "")
    research_objectives = application.get("research_objectives", [])
    existing_answers = application.get("form_inputs", {})

    logger.info(
        "Starting research deep dive generation",
        application_id=request["parent_id"],
        application_title=app_title,
        target_fields=target_fields,
        existing_objectives_count=len(research_objectives),
    )

    documents = await retrieve_documents(
        application_id=request["parent_id"],
        search_queries=[f"Research context for {app_title}"],
        task_description=f"Research context for grant application: {app_title}",
        max_tokens=MAX_RETRIEVAL_TOKENS,
    )

    logger.debug(
        "Retrieved documents for deep dive", application_id=request["parent_id"], documents_count=len(documents)
    )

    results = {}
    for field_name in target_fields:
        if field_name in existing_answers and existing_answers[field_name] and existing_answers[field_name].strip():
            logger.debug(
                "Skipping field with existing content", field_name=field_name, application_id=request["parent_id"]
            )
            continue

        answer = await generate_field_answer(
            field_name=field_name,
            application_title=app_title,
            research_objectives=research_objectives,
            documents=documents,
            existing_answers=existing_answers,
        )

        results[field_name] = answer

        logger.debug(
            "Generated answer for field",
            field_name=field_name,
            application_id=request["parent_id"],
            answer_length=len(answer),
        )

    logger.info(
        "Research deep dive generation completed",
        application_id=request["parent_id"],
        fields_generated=list(results.keys()),
        total_fields=len(results),
    )

    return {
        "form_inputs": results,
        "generation_context": {"documents_used": len(documents), "fields_generated": list(results.keys())},
    }


async def generate_field_answer(
    field_name: str,
    application_title: str,
    research_objectives: list[dict[str, Any]],
    documents: list[str],
    existing_answers: dict[str, Any],
) -> str:
    question = RESEARCH_DEEP_DIVE_FIELD_MAPPING[field_name]

    context_docs = format_documents_for_context(documents)
    objectives_text = format_research_objectives(research_objectives)
    existing_text = format_existing_answers(existing_answers, field_name)

    prompt = RESEARCH_DEEP_DIVE_USER_PROMPT.substitute(
        application_title=application_title,
        question=question,
        context_docs=context_docs,
        objectives_text=objectives_text,
        existing_answers=existing_text,
    )

    response = await handle_completions_request(
        prompt_identifier="research_deep_dive_generation",
        messages=str(prompt),
        system_prompt=RESEARCH_DEEP_DIVE_SYSTEM_PROMPT,
        response_type=str,
        temperature=TEMPERATURE,
    )

    answer = response.strip()
    if len(answer) < MIN_ANSWER_LENGTH:
        raise ValueError(f"Generated answer too short for field {field_name}: {len(answer)} characters")

    return answer


async def handle_research_deep_dive(
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

        result = await generate_research_deep_dive_content(request, application_data, logger)

        success_response: AutofillResponseDTO = {
            "success": True,
            "data": result,
        }
        if field_name := request.get("field_name"):
            success_response["field_name"] = field_name
        return success_response

    except Exception as e:
        logger.exception(
            "Research deep dive generation failed",
            request_id=request["parent_id"],
            autofill_type=request["autofill_type"],
        )

        error_response: AutofillResponseDTO = {"success": False, "data": {}, "error": str(e)}
        if field_name := request.get("field_name"):
            error_response["field_name"] = field_name
        return error_response
