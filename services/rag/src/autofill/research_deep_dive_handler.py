from typing import Any, ClassVar

from services.rag.src.dto import AutofillRequestDTO
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents

from .base_handler import BaseAutofillHandler

RESEARCH_DEEP_DIVE_SYSTEM_PROMPT = """
You are a specialist in writing comprehensive research answers for grant applications. Your task is to generate detailed, well-structured answers to research questions based on the provided context and research materials.
"""

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


class ResearchDeepDiveHandler(BaseAutofillHandler):
    """Handler for research deep dive autofill (Step 5)"""

    FIELD_MAPPING: ClassVar[dict[str, str]] = {
        "background_context": "What is the context and background of your research?",
        "hypothesis": "What is the central hypothesis or key question your research aims to address?",
        "rationale": "Why is this research important and what motivates its pursuit?",
        "novelty_and_innovation": "What makes your approach unique or innovative compared to existing research?",
        "impact": "How will your research contribute to the field and society?",
        "team_excellence": "What makes your team uniquely qualified to carry out this project?",
        "research_feasibility": "What makes your research plan realistic and achievable?",
        "preliminary_data": "Have you obtained any preliminary findings that support your research?",
    }

    async def _generate_content(self, request: AutofillRequestDTO, application: dict[str, Any]) -> dict[str, Any]:
        """Generate research deep dive answers"""

        target_fields = [request["field_name"]] if request.get("field_name") else list(self.FIELD_MAPPING.keys())

        app_title = application.get("title", "")
        research_objectives = application.get("research_objectives", [])
        existing_answers = application.get("form_inputs", {})

        self.logger.info(
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
            max_tokens=8000,
        )

        self.logger.debug(
            "Retrieved documents for deep dive", application_id=request["parent_id"], documents_count=len(documents)
        )

        results = {}
        for field_name in target_fields:
            if field_name in existing_answers and existing_answers[field_name] and existing_answers[field_name].strip():
                self.logger.debug(
                    "Skipping field with existing content", field_name=field_name, application_id=request["parent_id"]
                )
                continue

            answer = await self._generate_field_answer(
                field_name=field_name,
                application_title=app_title,
                research_objectives=research_objectives,
                documents=documents,
                existing_answers=existing_answers,
            )

            results[field_name] = answer

            self.logger.debug(
                "Generated answer for field",
                field_name=field_name,
                application_id=request["parent_id"],
                answer_length=len(answer),
            )

        self.logger.info(
            "Research deep dive generation completed",
            application_id=request["parent_id"],
            fields_generated=list(results.keys()),
            total_fields=len(results),
        )

        return {
            "form_inputs": results,
            "generation_context": {"documents_used": len(documents), "fields_generated": list(results.keys())},
        }

    async def _generate_field_answer(
        self,
        field_name: str,
        application_title: str,
        research_objectives: list[dict[str, Any]],
        documents: list[str],
        existing_answers: dict[str, Any],
    ) -> str:
        """Generate answer for a specific field"""

        question = self.FIELD_MAPPING[field_name]

        context_docs = self._format_documents_for_context(documents)
        objectives_text = self._format_research_objectives(research_objectives)
        existing_text = self._format_existing_answers(existing_answers, field_name)

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
            temperature=0.7,
        )

        answer = response.strip()
        if len(answer) < 50:
            raise ValueError(f"Generated answer too short for field {field_name}: {len(answer)} characters")

        return answer

    def _format_documents_for_context(self, documents: list[str]) -> str:
        """Format documents for LLM context"""
        if not documents:
            return "No research documents available."

        formatted_docs = []
        for _i, doc in enumerate(documents[:15]):
            content = doc[:300] if len(doc) > 300 else doc
            formatted_docs.append(f"- {content}...")

        return "\n".join(formatted_docs)

    def _format_research_objectives(self, objectives: list[dict[str, Any]]) -> str:
        """Format research objectives for context"""
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

    def _format_existing_answers(self, answers: dict[str, Any], current_field: str) -> str:
        """Format existing answers for context"""
        if not answers:
            return "None"

        formatted = []
        for field, answer in answers.items():
            if field != current_field and answer and answer.strip():
                question = self.FIELD_MAPPING.get(field, field)

                answer_preview = answer[:100] + "..." if len(answer) > 100 else answer
                formatted.append(f"{question}: {answer_preview}")

        return "\n".join(formatted) if formatted else "None"


async def generate_research_answers(request: AutofillRequestDTO, logger: Any) -> dict[str, Any]:
    """Generate research deep dive answers"""
    handler = ResearchDeepDiveHandler(logger)
    response = await handler.handle_request(request)

    if not response["success"]:
        raise Exception(response.get("error", "Unknown error"))

    return response["data"]
