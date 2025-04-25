from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from packages.db.src.json_objects import ResearchObjective, ResearchTask
from packages.db.src.tables import FundingOrganization, GrantApplication, GrantTemplate
from packages.shared_utils.src.exceptions import BackendError
from services.backend.src.common_types import MessageHandler
from services.backend.src.rag.grant_template.determine_application_sections import ExtractedSectionDTO
from services.backend.src.rag.grant_template.determine_longform_metadata import SectionMetadata
from services.backend.src.rag.grant_template.extract_cfp_data import Content
from services.backend.src.rag.grant_template.handler import (
    extract_and_enrich_sections,
    grant_template_generation_pipeline_handler,
)
from services.backend.tests.factories import CfpContentFactory, ExtractedSectionDTOFactory, GrantApplicationFactory
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import FIXTURES_FOLDER


@pytest.fixture
def mock_message_handler() -> MessageHandler:
    async def handler(message: Any) -> None:
        pass

    return AsyncMock(side_effect=handler)


@pytest.fixture
def mock_extracted_sections() -> list[ExtractedSectionDTO]:
    return [
        {
            "id": "abstract",
            "title": "Abstract",
            "order": 1,
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
            "is_title_only": None,
            "is_clinical_trial": None,
        },
        {
            "id": "research_plan",
            "title": "Research Plan",
            "order": 2,
            "parent_id": None,
            "is_detailed_workplan": True,
            "is_long_form": True,
            "is_title_only": None,
            "is_clinical_trial": None,
        },
        {
            "id": "impact",
            "title": "Impact",
            "order": 3,
            "parent_id": None,
            "is_detailed_workplan": None,
            "is_long_form": True,
            "is_title_only": None,
            "is_clinical_trial": None,
        },
    ]


@pytest.fixture
def mock_section_metadata() -> list[SectionMetadata]:
    return [
        {
            "id": "abstract",
            "keywords": ["research", "overview", "summary"],
            "topics": ["project_summary", "objectives"],
            "generation_instructions": "Write a concise summary of the research project.",
            "depends_on": [],
            "max_words": 300,
            "search_queries": ["research summary", "project overview", "study objectives"],
        },
        {
            "id": "research_plan",
            "keywords": ["methodology", "design", "procedures"],
            "topics": ["methods", "experimental_design", "data_analysis"],
            "generation_instructions": "Describe the detailed methodology for the research project.",
            "depends_on": [],
            "max_words": 1500,
            "search_queries": ["research methodology", "experimental design", "data collection procedures"],
        },
        {
            "id": "impact",
            "keywords": ["significance", "outcomes", "benefits"],
            "topics": ["expected_outcomes", "potential_impact"],
            "generation_instructions": "Explain the potential impact and significance of the research.",
            "depends_on": ["research_plan"],
            "max_words": 500,
            "search_queries": ["research impact", "project significance", "expected outcomes"],
        },
    ]


@pytest.fixture
def mock_extracted_cfp_data(
    funding_organization: FundingOrganization, nih_organization: FundingOrganization
) -> dict[str, Any]:
    return {
        "organization_id": str(nih_organization.id),
        "cfp_subject": "Test CFP Subject",
        "content": [
            {"title": "Introduction", "subtitles": ["Background", "Purpose"]},
            {"title": "Research Plan", "subtitles": ["Methods", "Analysis"]},
            {"title": "Evaluation", "subtitles": ["Metrics", "Timeline"]},
        ],
    }


@pytest.fixture
def sample_cfp_content() -> list[Content]:
    return CfpContentFactory.batch(size=3)


@pytest.fixture
def cfp_subject() -> str:
    return "Test grant for researching innovative approaches to healthcare"


@pytest.fixture
async def cfp_file_content() -> str:
    cfp_content_file = FIXTURES_FOLDER / "cfps" / "nih.md"
    assert cfp_content_file.exists(), f"File {cfp_content_file} does not exist"
    return cfp_content_file.read_text()


@pytest.fixture
async def test_application(async_session_maker: async_sessionmaker[Any], workspace: Any) -> GrantApplication:
    application = GrantApplicationFactory.build(
        workspace_id=workspace.id,
        title="Test Application for Handler Test",
        research_objectives=[
            ResearchObjective(
                number=1,
                title="Research Objective 1",
                description="Testing research objective",
                research_tasks=[
                    ResearchTask(
                        number=1,
                        title="Task 1",
                        description="Testing research task",
                    )
                ],
            )
        ],
    )

    async with async_session_maker() as session:
        session.add(application)
        await session.commit()
        await session.refresh(application)

    return application


@pytest.mark.asyncio
async def test_extract_and_enrich_sections_with_mocked_llm(
    sample_cfp_content: list[Content],
    cfp_subject: str,
    mock_message_handler: MessageHandler,
    funding_organization: FundingOrganization,
    mock_extracted_sections: list[ExtractedSectionDTO],
    mock_section_metadata: list[SectionMetadata],
) -> None:
    with (
        patch("src.rag.grant_template.handler.handle_extract_sections", return_value=mock_extracted_sections),
        patch("src.rag.grant_template.handler.handle_generate_grant_template", return_value=mock_section_metadata),
    ):
        result = await extract_and_enrich_sections(
            cfp_content=sample_cfp_content,
            cfp_subject=cfp_subject,
            organization=funding_organization,
            message_handler=mock_message_handler,
        )

    assert len(result) == 3

    assert mock_message_handler.call_count > 0  # type: ignore[attr-defined]

    metadata_message_found = False
    for call in mock_message_handler.call_args_list:  # type: ignore[attr-defined]
        message = call[0][0]
        if (
            hasattr(message, "event")
            and message.event == "grant_template_metadata"
            and hasattr(message, "type")
            and message.type == "info"
            and hasattr(message, "content")
            and "Generating metadata" in message.content
        ):
            metadata_message_found = True
            break
    assert metadata_message_found, "Expected message about generating metadata was not found"

    long_form_sections = [s for s in result if "keywords" in s]

    assert len(long_form_sections) == 3

    for section in long_form_sections:
        assert "keywords" in section
        assert "topics" in section
        assert "generation_instructions" in section
        assert "depends_on" in section
        assert "max_words" in section
        assert "search_queries" in section

        assert isinstance(section["keywords"], list)  # type: ignore[typeddict-item]
        assert isinstance(section["topics"], list)  # type: ignore[typeddict-item]
        assert isinstance(section["generation_instructions"], str)  # type: ignore[typeddict-item]
        assert isinstance(section["max_words"], int)  # type: ignore[typeddict-item]
        assert isinstance(section["search_queries"], list)  # type: ignore[typeddict-item]

    workplan_sections = [s for s in long_form_sections if s.get("is_detailed_workplan")]
    assert len(workplan_sections) == 1, "Exactly one section should be marked as a detailed workplan"
    assert workplan_sections[0]["id"] == "research_plan"


@pytest.mark.asyncio
async def test_grant_template_generation_pipeline_handler_with_mocked_llm(
    mock_message_handler: MessageHandler,
    cfp_file_content: str,
    test_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
    nih_organization: FundingOrganization,
    mock_extracted_sections: list[ExtractedSectionDTO],
    mock_section_metadata: list[SectionMetadata],
    mock_extracted_cfp_data: dict[str, Any],
) -> None:
    with (
        patch("src.rag.grant_template.handler.handle_extract_cfp_data", return_value=mock_extracted_cfp_data),
        patch("src.rag.grant_template.handler.handle_extract_sections", return_value=mock_extracted_sections),
        patch("src.rag.grant_template.handler.handle_generate_grant_template", return_value=mock_section_metadata),
        patch("src.rag.grant_template.handler.next", return_value=nih_organization),
    ):
        result = await grant_template_generation_pipeline_handler(
            application_id=str(test_application.id),
            cfp_content=cfp_file_content,
            message_handler=mock_message_handler,
        )

    assert isinstance(result, GrantTemplate)

    if isinstance(result.grant_application_id, UUID):
        assert str(result.grant_application_id) == str(test_application.id)
    else:
        assert result.grant_application_id == str(test_application.id)
    assert result.grant_sections is not None
    assert len(result.grant_sections) == 3

    async with async_session_maker() as session:
        db_result = await session.scalar(select(GrantTemplate).where(GrantTemplate.id == result.id))
        assert db_result is not None

        if isinstance(db_result.grant_application_id, UUID):
            assert str(db_result.grant_application_id) == str(test_application.id)
        else:
            assert db_result.grant_application_id == str(test_application.id)
        assert len(db_result.grant_sections) == 3

    template_generation_message_found = False
    extract_cfp_data_message_found = False
    cfp_data_extracted_message_found = False

    for call in mock_message_handler.call_args_list:  # type: ignore[attr-defined]
        message = call[0][0]

        if (
            hasattr(message, "type")
            and message.type == "info"
            and hasattr(message, "event")
            and message.event == "grant_template_generation_started"
            and hasattr(message, "content")
            and "Starting grant template generation" in message.content
        ):
            template_generation_message_found = True

        elif (
            hasattr(message, "type")
            and message.type == "info"
            and hasattr(message, "event")
            and message.event == "extracting_cfp_data"
            and hasattr(message, "content")
            and "Extracting data from CFP content" in message.content
        ):
            extract_cfp_data_message_found = True

        elif (
            hasattr(message, "type")
            and message.type == "data"
            and hasattr(message, "event")
            and message.event == "cfp_data_extracted"
            and hasattr(message, "content")
            and isinstance(message.content, dict)
        ):
            cfp_data_content = message.content
            if (
                "organization" in cfp_data_content
                and "cfp_subject" in cfp_data_content
                and "content_sections" in cfp_data_content
            ):
                cfp_data_extracted_message_found = True

    assert template_generation_message_found, "Template generation message not found"
    assert extract_cfp_data_message_found, "Extract CFP data message not found"
    assert cfp_data_extracted_message_found, "CFP data extracted message not found"


@pytest.mark.asyncio
async def test_pipeline_handler_error_handling(
    mock_message_handler: MessageHandler,
    test_application: GrantApplication,
) -> None:
    error_message = "Test backend error"
    with (
        patch(
            "src.rag.grant_template.handler.handle_extract_cfp_data",
            side_effect=BackendError(error_message, context={"test": "context"}),
        ),
        pytest.raises(BackendError),
    ):
        await grant_template_generation_pipeline_handler(
            application_id=str(test_application.id),
            cfp_content="Invalid content",
            message_handler=mock_message_handler,
        )

    assert mock_message_handler.call_count > 0  # type: ignore[attr-defined]

    error_message_found = False

    for call in mock_message_handler.call_args_list:  # type: ignore[attr-defined]
        message = call[0][0]

        if (
            hasattr(message, "type")
            and message.type == "error"
            and hasattr(message, "event")
            and message.event == "pipeline_error"
            and hasattr(message, "content")
            and "Error in grant template generation:" in message.content
            and hasattr(message, "context")
            and isinstance(message.context, dict)
            and message.context.get("error_type") == "BackendError"
        ):
            error_message_found = True
            break

    assert error_message_found, "Expected error message was not found"


@pytest.mark.asyncio
async def test_idempotent_template_generation(
    mock_message_handler: MessageHandler,
    cfp_file_content: str,
    test_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
    nih_organization: FundingOrganization,
    mock_extracted_sections: list[ExtractedSectionDTO],
    mock_section_metadata: list[SectionMetadata],
    mock_extracted_cfp_data: dict[str, Any],
) -> None:
    with (
        patch("src.rag.grant_template.handler.handle_extract_cfp_data", return_value=mock_extracted_cfp_data),
        patch("src.rag.grant_template.handler.handle_extract_sections", return_value=mock_extracted_sections),
        patch("src.rag.grant_template.handler.handle_generate_grant_template", return_value=mock_section_metadata),
        patch("src.rag.grant_template.handler.next", return_value=nih_organization),
    ):
        result1 = await grant_template_generation_pipeline_handler(
            application_id=str(test_application.id),
            cfp_content=cfp_file_content,
            message_handler=mock_message_handler,
        )

        result2 = await grant_template_generation_pipeline_handler(
            application_id=str(test_application.id),
            cfp_content=cfp_file_content,
            message_handler=mock_message_handler,
        )

    assert result1.id != result2.id

    async with async_session_maker() as session:
        templates = await session.scalars(
            select(GrantTemplate).where(GrantTemplate.grant_application_id == str(test_application.id))
        )
        templates_list = list(templates)
        assert len(templates_list) >= 2
        template_ids = [str(t.id) for t in templates_list]
        assert str(result1.id) in template_ids
        assert str(result2.id) in template_ids


@pytest.mark.asyncio
async def test_extract_and_enrich_with_title_only_sections(
    sample_cfp_content: list[Content],
    cfp_subject: str,
    mock_message_handler: MessageHandler,
    funding_organization: FundingOrganization,
    nih_organization: FundingOrganization,
    mock_section_metadata: list[SectionMetadata],
) -> None:
    mixed_sections = [
        ExtractedSectionDTOFactory.build(
            id="parent_section",
            title="Parent Section",
            order=1,
            parent_id=None,
            is_detailed_workplan=None,
            is_long_form=False,
            is_title_only=True,
            is_clinical_trial=None,
        ),
        ExtractedSectionDTOFactory.build(
            id="abstract",
            title="Abstract",
            order=2,
            parent_id="parent_section",
            is_detailed_workplan=None,
            is_long_form=True,
            is_title_only=None,
            is_clinical_trial=None,
        ),
        ExtractedSectionDTOFactory.build(
            id="research_plan",
            title="Research Plan",
            order=3,
            parent_id="parent_section",
            is_detailed_workplan=True,
            is_long_form=True,
            is_title_only=None,
            is_clinical_trial=None,
        ),
        ExtractedSectionDTOFactory.build(
            id="impact",
            title="Impact",
            order=4,
            parent_id="parent_section",
            is_detailed_workplan=None,
            is_long_form=True,
            is_title_only=None,
            is_clinical_trial=None,
        ),
    ]

    with (
        patch("src.rag.grant_template.handler.handle_extract_sections", return_value=mixed_sections),
        patch("src.rag.grant_template.handler.handle_generate_grant_template", return_value=mock_section_metadata),
    ):
        result = await extract_and_enrich_sections(
            cfp_content=sample_cfp_content,
            cfp_subject=cfp_subject,
            organization=funding_organization,
            message_handler=mock_message_handler,
        )

    assert len(result) == 4

    title_only_sections = [s for s in result if "keywords" not in s]
    long_form_sections = [s for s in result if "keywords" in s]

    assert len(title_only_sections) == 1
    assert title_only_sections[0]["id"] == "parent_section"
    assert title_only_sections[0]["title"] == "Parent Section"

    assert len(long_form_sections) == 3
