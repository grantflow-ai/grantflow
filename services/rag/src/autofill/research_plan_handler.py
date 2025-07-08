from typing import Any

from services.rag.src.dto import AutofillRequestDTO
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.search_queries import handle_create_search_queries

from .base_handler import BaseAutofillHandler

RESEARCH_PLAN_SYSTEM_PROMPT = """
You are a specialist in creating research plans for grant applications. Your task is to generate well-structured research objectives and tasks based on the provided context and uploaded research materials.
"""

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


class ResearchPlanHandler(BaseAutofillHandler):
    """Handler for research plan autofill (Step 4)"""

    async def _generate_content(self, request: AutofillRequestDTO, application: dict[str, Any]) -> dict[str, Any]:
        """Generate research objectives and tasks"""

        app_title = application.get("title", "")
        existing_objectives = application.get("research_objectives", [])

        self.logger.info(
            "Starting research plan generation",
            application_id=request["parent_id"],
            application_title=app_title,
            existing_objectives_count=len(existing_objectives),
        )

        search_prompt = f"Generate research objectives and tasks for grant application: {app_title}"

        search_queries = await handle_create_search_queries(
            user_prompt=search_prompt, context={"application_title": app_title}
        )

        self.logger.debug(
            "Generated search queries",
            application_id=request["parent_id"],
            queries_count=len(search_queries),
            queries=search_queries,
        )

        documents = await retrieve_documents(
            application_id=request["parent_id"],
            search_queries=search_queries,
            task_description=search_prompt,
            max_tokens=6000,
        )

        self.logger.debug("Retrieved documents", application_id=request["parent_id"], documents_count=len(documents))

        objectives = await self._generate_objectives_with_llm(app_title, documents, existing_objectives)

        self.logger.info(
            "Research plan generation completed",
            application_id=request["parent_id"],
            generated_objectives_count=len(objectives),
        )

        return {
            "research_objectives": objectives,
            "generation_context": {"documents_used": len(documents), "search_queries": search_queries},
        }

    async def _generate_objectives_with_llm(
        self, title: str, documents: list[str], existing: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Generate objectives using LLM"""

        context_docs = self._format_documents_for_context(documents)

        existing_text = self._format_existing_objectives(existing)

        prompt = RESEARCH_PLAN_USER_PROMPT.substitute(
            application_title=title, context_docs=context_docs, existing_objectives=existing_text
        )

        response = await handle_completions_request(
            prompt_identifier="research_plan_generation",
            messages=str(prompt),
            system_prompt=RESEARCH_PLAN_SYSTEM_PROMPT,
            response_type=dict,
            temperature=0.7,
        )

        return self._parse_and_validate_objectives(response)

    def _format_documents_for_context(self, documents: list[str]) -> str:
        """Format documents for LLM context"""
        if not documents:
            return "No research documents available."

        formatted_docs = []
        for i, doc in enumerate(documents[:10]):
            content = doc[:300] if len(doc) > 300 else doc
            formatted_docs.append(f"Document {i + 1}: {content}...")

        return "\n".join(formatted_docs)

    def _format_existing_objectives(self, existing: list[dict[str, Any]]) -> str:
        """Format existing objectives for context"""
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

    def _parse_and_validate_objectives(self, response: dict[str, Any]) -> list[dict[str, Any]]:
        """Parse and validate LLM response"""
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

        self.logger.debug(
            "Validated research objectives structure",
            objectives_count=len(objectives),
            total_tasks=sum(len(obj.get("research_tasks", [])) for obj in objectives),
        )

        return objectives


async def generate_research_objectives(request: AutofillRequestDTO, logger: Any) -> dict[str, Any]:
    """Generate research objectives for application"""
    handler = ResearchPlanHandler(logger)
    response = await handler.handle_request(request)

    if not response["success"]:
        raise Exception(response.get("error", "Unknown error"))

    return response["data"]
