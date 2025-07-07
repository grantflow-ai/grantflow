import logging
from abc import ABC, abstractmethod
from typing import Any

from services.rag.src.dto import AutofillRequestDTO, AutofillResponseDTO
from services.rag.src.utils.checks import verify_rag_sources_indexed


class BaseAutofillHandler(ABC):
    """Base class for autofill handlers"""

    def __init__(self, logger: logging.Logger) -> None:
        self.logger = logger

    async def handle_request(self, request: AutofillRequestDTO) -> AutofillResponseDTO:
        """Main entry point for autofill requests"""
        try:
            
            await self._validate_indexing_complete(request["parent_id"])

            
            application = await self._get_application_context(request["parent_id"])

            
            result = await self._generate_content(request, application)

            return AutofillResponseDTO(
                success=True,
                data=result,
                field_name=request.get("field_name")
            )

        except Exception as e:
            self.logger.exception("Autofill generation failed",
                                request_id=request["parent_id"],
                                autofill_type=request["autofill_type"])
            return AutofillResponseDTO(
                success=False,
                data={},
                error=str(e)
            )

    async def _validate_indexing_complete(self, application_id: str) -> None:
        """Ensure all RAG sources are indexed before autofill"""
        await verify_rag_sources_indexed(application_id)

    async def _get_application_context(self, application_id: str) -> dict[str, Any]:
        """Get application data for context"""
        
        from packages.db.src.db_manager import db_manager
        from packages.db.src.models import GrantApplication
        from sqlalchemy import select

        async with db_manager.get_session() as session:
            result = await session.execute(
                select(GrantApplication).where(GrantApplication.id == application_id)
            )
            application = result.scalar_one_or_none()

            if not application:
                raise RuntimeError(f"Application {application_id} not found")

            return {
                "id": str(application.id),
                "title": application.title or "",
                "research_objectives": application.research_objectives or [],
                "form_inputs": application.form_inputs or {},
            }

    @abstractmethod
    async def _generate_content(self, request: AutofillRequestDTO, application: dict[str, Any]) -> dict[str, Any]:
        """Generate autofill content - implemented by subclasses"""
