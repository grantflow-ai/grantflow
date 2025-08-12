from typing import Any

import pytest
from packages.db.src.tables import GrantTemplateSource
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import GrantTemplateFactory, GrantTemplateSourceFactory, RagFileFactory, TextVectorFactory

from services.rag.src.grant_template.extract_cfp_data import get_rag_sources_data


@pytest.fixture
async def benchmark_grant_template_with_sources(
    async_session_maker: async_sessionmaker[Any],
    nih_organization: Any,
    grant_application: Any,
) -> tuple[str, list[str]]:
    template = GrantTemplateFactory.build(
        granting_institution_id=nih_organization.id,
        grant_application_id=grant_application.id,
        grant_sections=None,
        submission_date=None,
    )

    sources = [
        RagFileFactory.build(
            text_content="Budget limitations: Applications must not exceed $50,000 total funding. Deadline for submissions is March 15, 2025. All proposals will be evaluated based on scientific merit and innovation criteria.",
            source_type="rag_file",
            mime_type="application/pdf",
        ),
        RagFileFactory.build(
            text_content="Collaborative research proposals are not allowed. You must submit detailed research plans with timelines. Project proposals should be limited to 10 pages maximum with no more than 2,500 words.",
            source_type="rag_file",
            mime_type="application/pdf",
        ),
        RagFileFactory.build(
            text_content="Review criteria include feasibility assessment, potential impact evaluation, and methodological soundness. Principal investigators should provide preliminary data and references to support their hypothesis.",
            source_type="rag_file",
            mime_type="application/pdf",
        ),
        RagFileFactory.build(
            text_content="Funding amounts range from €25,000 to €100,000 depending on project scope. Multi-year projects spanning 2-3 years are encouraged. Budget justification must be provided for all requested funds.",
            source_type="rag_file",
            mime_type="application/pdf",
        ),
        RagFileFactory.build(
            text_content="Application requirements: Letters of recommendation are mandatory. CVs of all investigators must be included. Please ensure all documentation is complete before the submission deadline of December 31, 2025.",
            source_type="rag_file",
            mime_type="application/pdf",
        ),
    ]

    vectors = []
    for source in sources:
        vectors.extend(
            [
                TextVectorFactory.build(
                    rag_source_id=source.id, chunk={"content": (source.text_content or "")[:100] + "..."}
                ),
                TextVectorFactory.build(
                    rag_source_id=source.id, chunk={"content": (source.text_content or "")[100:200] + "..."}
                ),
            ]
        )

    async with async_session_maker() as session:
        session.add(template)
        session.add_all(sources)
        session.add_all(vectors)
        await session.commit()
        await session.refresh(template)

    template_sources = [
        GrantTemplateSourceFactory.build(
            grant_template_id=template.id,
            rag_source_id=source.id,
        )
        for source in sources
    ]

    async with async_session_maker() as session:
        session.add_all(template_sources)
        await session.commit()

    async with async_session_maker() as session:
        stmt = select(GrantTemplateSource.rag_source_id).where(GrantTemplateSource.grant_template_id == template.id)
        result = await session.execute(stmt)
        source_ids = [str(row[0]) for row in result.fetchall()]

    return str(template.id), source_ids


async def test_nlp_analysis_content_quality(
    async_session_maker: async_sessionmaker[Any],
    benchmark_grant_template_with_sources: tuple[str, list[str]],
) -> None:
    template_id, source_ids = benchmark_grant_template_with_sources

    result = await get_rag_sources_data(
        source_ids=source_ids,
        session_maker=async_session_maker,
    )

    all_categories = set()
    total_detections = 0

    for _i, source_data in enumerate(result):
        if "nlp_analysis" in source_data:
            nlp_analysis = source_data["nlp_analysis"]
            source_detections = 0

            for category, sentences in nlp_analysis.items():
                if sentences:
                    for _sentence in sentences:
                        pass
                    source_detections += len(sentences)
                    all_categories.add(category)

            total_detections += source_detections
        else:
            pass

    assert total_detections > 0, "Should detect some categories in the content"
    assert len(all_categories) >= 3, f"Should detect at least 3 different categories, got {len(all_categories)}"
    assert all("nlp_analysis" in source for source in result), "All sources should have NLP analysis"
    assert total_detections >= len(result) * 2, (
        f"Should average at least 2 detections per source, got {total_detections / len(result):.1f}"
    )
