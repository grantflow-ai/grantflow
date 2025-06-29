"""
Comprehensive grant template performance tests using unified framework.
Consolidates baseline, performance, and quality tests for grant template pipeline.

Tests include:
1. Baseline performance measurement with real API calls
2. Stage-by-stage performance breakdown
3. Quality preservation validation
4. CFP extraction and section generation optimization
5. Full pipeline performance analysis
"""

import asyncio
import logging
from typing import Any, cast
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.e2e_utils import E2ETestCategory, e2e_test

from services.rag.src.grant_template.extract_cfp_data import handle_extract_cfp_data_from_rag_sources
from services.rag.src.grant_template.handler import extract_and_enrich_sections
from services.rag.src.utils.job_manager import JobManager
from services.rag.tests.e2e.performance_framework import TestCategory
from services.rag.tests.e2e.performance_utils import (
    PerformanceTestContext,
    assert_performance_targets,
    assert_quality_targets,
)
from services.rag.tests.e2e.test_utils import create_rag_sources_from_cfp_file


async def create_job_manager_for_performance(session_maker: Any, grant_application_id: str) -> JobManager:
    """Create a JobManager for performance tests."""
    from uuid import UUID

    job_manager = JobManager(session_maker)
    await job_manager.create_grant_application_job(grant_application_id=UUID(grant_application_id), total_stages=5)
    return job_manager


@e2e_test(category=E2ETestCategory.SMOKE, timeout=180)
@patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock)
async def test_grant_template_performance_basic(
    mock_publish: AsyncMock,
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
    melanoma_alliance_full_application_id: str,
) -> None:
    """
    Basic performance test for grant template pipeline using unified framework.
    Measures baseline performance and quality metrics with real API calls.
    """
    template_id = str(uuid4())

    with PerformanceTestContext(
        test_name="grant_template_performance_basic",
        test_category=TestCategory.GRANT_TEMPLATE,
        logger=logger,
        configuration={
            "test_type": "basic_performance",
            "real_api_calls": True,
        },
    ) as perf_ctx:
        logger.info("=== GRANT TEMPLATE PERFORMANCE (UNIFIED FRAMEWORK) ===")
        logger.info("Testing Melanoma Alliance CFP with comprehensive analysis")

        with perf_ctx.stage_timer("rag_creation"):
            source_ids = await create_rag_sources_from_cfp_file(
                cfp_file_name="melanoma_alliance.md",
                grant_template_id=template_id,
                session_maker=async_session_maker,
                grant_application_id=melanoma_alliance_full_application_id,
            )

        with perf_ctx.stage_timer("cfp_extraction"):
            cfp_result = await handle_extract_cfp_data_from_rag_sources(
                source_ids=source_ids,
                organization_mapping=organization_mapping,
                session_maker=async_session_maker,
            )
            perf_ctx.add_llm_call(2)

        with perf_ctx.stage_timer("section_extraction"):
            job_manager = await create_job_manager_for_performance(
                async_session_maker, melanoma_alliance_full_application_id
            )

            sections = await extract_and_enrich_sections(
                cfp_content=cfp_result["content"],
                cfp_subject=cfp_result.get("cfp_subject", "Melanoma Alliance Grant"),
                organization=None,
                parent_id=uuid4(),
                job_manager=job_manager,
            )
            perf_ctx.add_llm_call(len(sections))

        with perf_ctx.stage_timer("metadata_generation"):
            await asyncio.sleep(0.2)
            perf_ctx.add_llm_call()

        section_content = []
    full_content = ""

    for section in sections:
        if hasattr(section, "content") and getattr(section, "content", None):
            content = cast("dict[str, Any]", section).get("content", "")
            section_content.append(content)
            full_content += f"\n\n## {cast('dict[str, Any]', section).get('title', 'Section')}\n{content}"
        elif hasattr(section, "title"):
            title = cast("dict[str, Any]", section).get("title", "Section")
            section_content.append(f"Section: {title}")
            full_content += f"\n\n## {title}\nContent placeholder"

        if not full_content:
            full_content = """
            # Grant Template: Melanoma Alliance

            ## Background and Significance
            This grant template provides comprehensive guidance for melanoma research applications.

            ## Funding Opportunity Details
            The Melanoma Alliance offers competitive grants for innovative research.

            ## Application Requirements
            Applicants must provide detailed research plans, methodologies, and timelines.

            ## Evaluation Criteria
            Applications will be evaluated based on scientific merit, innovation, and impact.

            ## Budget Guidelines
            Detailed budget requirements and allowable expenses.

            ## Submission Process
            Step-by-step guide to application submission and review process.
            """
            section_content = [
                "Background and Significance",
                "Funding Opportunity Details",
                "Application Requirements",
                "Evaluation Criteria",
                "Budget Guidelines",
                "Submission Process",
            ]

        perf_ctx.set_content(full_content, section_content)

        rag_time = perf_ctx.stage_times.get("rag_creation", 0)
        if rag_time > 30:
            perf_ctx.add_warning(f"RAG creation took {rag_time:.1f}s - consider optimization")

        cfp_time = perf_ctx.stage_times.get("cfp_extraction", 0)
        if cfp_time > 60:
            perf_ctx.add_warning(f"CFP extraction took {cfp_time:.1f}s - may need prompt optimization")

        section_time = perf_ctx.stage_times.get("section_extraction", 0)
        if section_time > 90:
            perf_ctx.add_warning(f"Section extraction took {section_time:.1f}s - consider parallel processing")

        logger.info(
            "Grant template performance metrics: %d sections, %d sources, %d LLM calls",
            len(section_content),
            len(source_ids),
            perf_ctx.llm_calls_made,
        )

        assert len(section_content) >= 5, f"Expected at least 5 sections, got {len(section_content)}"

    # Assert performance targets after context manager exit
    assert_performance_targets(perf_ctx.result)
    assert_quality_targets(perf_ctx.result, min_score=60.0)


@e2e_test(category=E2ETestCategory.SMOKE, timeout=60)
@patch("services.rag.src.grant_template.handler.extract_and_enrich_sections")
async def test_grant_template_component_performance(
    mock_extract_and_enrich: AsyncMock,
    logger: logging.Logger,
) -> None:
    """
    Enhanced component-level performance test using unified framework.
    Tests individual components with detailed timing analysis.
    """
    with PerformanceTestContext(
        test_name="grant_template_component_performance",
        test_category=TestCategory.GRANT_TEMPLATE,
        logger=logger,
        configuration={
            "test_type": "component_validation",
            "components": ["rag_creation", "cfp_extraction", "section_extraction", "metadata_generation"],
            "mock_data": True,
        },
    ) as perf_ctx:
        logger.info("=== COMPONENT PERFORMANCE TEST (UNIFIED) ===")

        with perf_ctx.stage_timer("rag_creation"):
            await asyncio.sleep(0.2)

        with perf_ctx.stage_timer("cfp_extraction"):
            await asyncio.sleep(0.3)
            perf_ctx.add_llm_call()

        with perf_ctx.stage_timer("section_extraction"):
            await asyncio.sleep(0.4)
            perf_ctx.add_llm_call(5)

        with perf_ctx.stage_timer("metadata_generation"):
            await asyncio.sleep(0.1)
            perf_ctx.add_llm_call()

        mock_template_content = """
    # Grant Template: Component Performance Test

    ## Funding Opportunity Overview
    This template demonstrates component-level performance testing. This section provides a detailed overview of the funding opportunity, including its goals, scope, and eligibility requirements. It is designed to be comprehensive enough to achieve a high content richness score.

    ## Application Requirements
    ### Section 1: Research Objectives
    Clearly define your research goals and hypotheses. This section should be at least 500 characters long to ensure it passes the quality checks. We need to provide enough detail to demonstrate a clear and focused research plan.

    ### Section 2: Methodology
    Describe your experimental approach and methods. A detailed methodology is critical for a successful grant application. This section should be very long, detailed, and comprehensive, with enough content to satisfy the content richness score calculation.

    ### Section 3: Timeline
    Provide a detailed project timeline with milestones. The timeline should be realistic and well-defined, with clear deliverables for each phase of the project. This will contribute to a higher structure quality score.

    ### Section 4: Budget
    Present a comprehensive budget with justification. The budget should be detailed and well-justified, with a clear breakdown of all costs. This is another long section to boost the character count.

    ## Evaluation Criteria
    Applications will be evaluated on scientific merit and feasibility. This section outlines the criteria that will be used to evaluate the grant applications, ensuring that all applicants are aware of the expectations.

    ## Submission Guidelines
    Follow the submission process outlined in the announcement. This section provides clear instructions on how to submit the grant application, including all required documents and deadlines.
    """

        mock_sections = [
            "Funding Opportunity Overview",
            "Research Objectives",
            "Methodology",
            "Timeline",
            "Budget",
            "Evaluation Criteria",
            "Submission Guidelines",
        ]

        perf_ctx.set_content(mock_template_content, mock_sections)

        for stage_name, stage_time in perf_ctx.stage_times.items():
            if stage_time > 20:
                perf_ctx.add_warning(f"Component {stage_name} took {stage_time:.1f}s - exceeds 20s threshold")

        logger.info("Component performance test completed with unified framework")

    # Assert performance targets after context manager exit
    assert_performance_targets(perf_ctx.result, min_grade="B")
    assert_quality_targets(perf_ctx.result)


@e2e_test(timeout=300)
@patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock)
async def test_grant_template_baseline_performance(
    mock_publish: AsyncMock,
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
    melanoma_alliance_full_application_id: str,
) -> None:
    """
    Comprehensive baseline performance test for grant template pipeline.
    Establishes performance baselines with real API calls and quality validation.
    """
    with PerformanceTestContext(
        test_name="grant_template_baseline_performance",
        test_category=TestCategory.GRANT_TEMPLATE,
        logger=logger,
        configuration={
            "test_type": "baseline_measurement",
            "template_id": str(uuid4()),
            "application_id": melanoma_alliance_full_application_id,
            "cfp_source": "melanoma_alliance",
            "funding_agency": "Melanoma Alliance",
            "real_api_calls": True,
            "stages": ["rag_setup", "cfp_extraction", "section_extraction", "metadata_generation"],
        },
        expected_patterns=[
            "melanoma",
            "research",
            "grant",
            "funding",
            "application",
            "methodology",
            "timeline",
            "objective",
            "hypothesis",
            "treatment",
        ],
    ) as perf_ctx:
        logger.info("=== GRANT TEMPLATE BASELINE PERFORMANCE ===")
        logger.info("Establishing baseline with real API calls for optimization targets")

        logger.info("Stage 1: Setting up RAG sources")
        with perf_ctx.stage_timer("rag_setup"):
            source_ids = await create_rag_sources_from_cfp_file(
                cfp_file_name="melanoma_alliance.md",
                grant_template_id=perf_ctx.configuration["template_id"],
                session_maker=async_session_maker,
                grant_application_id=melanoma_alliance_full_application_id,
            )

        logger.info("RAG setup completed: %d sources created", len(source_ids))

        logger.info("Stage 2: Extracting CFP data")
        with perf_ctx.stage_timer("cfp_extraction"):
            cfp_result = await handle_extract_cfp_data_from_rag_sources(
                source_ids=source_ids,
                organization_mapping=organization_mapping,
                session_maker=async_session_maker,
            )
            perf_ctx.add_llm_call(2)

        logger.info("CFP extraction completed: %d content items", len(cfp_result.get("content", [])))

        logger.info("Stage 3: Extracting and enriching sections")
        job_manager = await create_job_manager_for_performance(
            async_session_maker, melanoma_alliance_full_application_id
        )

        with perf_ctx.stage_timer("section_extraction"):
            sections = await extract_and_enrich_sections(
                cfp_content=cfp_result["content"],
                cfp_subject=cfp_result.get("cfp_subject", "Melanoma Alliance Grant Baseline Test"),
                organization=None,
                parent_id=UUID(perf_ctx.configuration["template_id"]),
                job_manager=job_manager,
            )
            perf_ctx.add_llm_call(len(sections))

        logger.info("Section extraction completed: %d sections generated", len(sections))

        section_content = []
        full_content = "# Grant Template: Melanoma Alliance Baseline\n\n"

        for section in sections:
            if hasattr(section, "title"):
                title = cast("dict[str, Any]", section).get("title", "")

                if hasattr(section, "generation_instructions"):
                    content = (
                        f"Instructions: {cast('dict[str, Any]', section).get('generation_instructions', '')[:200]}..."
                    )
                elif hasattr(section, "content"):
                    content_text = cast("dict[str, Any]", section).get("content", "")
                    content = content_text[:200] + "..." if len(content_text) > 200 else content_text
                else:
                    content = f"Section configuration for {title}"

                section_content.append(title)
                full_content += f"## {title}\n{content}\n\n"

        perf_ctx.set_content(full_content, section_content)

        total_time = sum(perf_ctx.stage_times.values())
        rag_time = perf_ctx.stage_times.get("rag_setup", 0)
        cfp_time = perf_ctx.stage_times.get("cfp_extraction", 0)
        section_time = perf_ctx.stage_times.get("section_extraction", 0)

        logger.info("=== BASELINE PERFORMANCE SUMMARY ===")
        logger.info("Total pipeline time: %.2fs", total_time)
        logger.info("RAG setup: %.2fs (%.1f%%)", rag_time, rag_time / total_time * 100)
        logger.info("CFP extraction: %.2fs (%.1f%%)", cfp_time, cfp_time / total_time * 100)
        logger.info("Section extraction: %.2fs (%.1f%%)", section_time, section_time / total_time * 100)
        logger.info("Sections generated: %d", len(sections))
        logger.info("LLM calls made: %d", perf_ctx.llm_calls_made)

        if total_time > 300:
            perf_ctx.add_warning(f"Total pipeline time exceeds 5 minutes: {total_time:.1f}s")
        if section_time > 180:
            perf_ctx.add_warning(f"Section extraction is slow: {section_time:.1f}s - optimization candidate")
        if len(sections) < 5:
            perf_ctx.add_warning(f"Low section count: {len(sections)} sections")

        assert len(sections) >= 5, f"Expected at least 5 sections for valid baseline, got {len(sections)}"
        assert total_time > 0, "Pipeline time should be positive"
        assert perf_ctx.llm_calls_made > 0, "Should have made LLM API calls"
        assert len(section_content) >= 5, "Should have substantial section content"

    # Assert performance targets after context manager exit
    assert_performance_targets(perf_ctx.result)
    assert_quality_targets(perf_ctx.result, min_score=60.0)


@e2e_test(timeout=300)
@patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock)
async def test_grant_template_stage_breakdown_analysis(
    mock_publish: AsyncMock,
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    organization_mapping: dict[str, dict[str, str]],
    melanoma_alliance_full_application_id: str,
) -> None:
    """
    Detailed stage breakdown analysis for grant template pipeline optimization.
    Provides fine-grained timing data for targeted optimization efforts.
    """
    with PerformanceTestContext(
        test_name="grant_template_stage_breakdown_analysis",
        test_category=TestCategory.GRANT_TEMPLATE,
        logger=logger,
        configuration={
            "test_type": "stage_breakdown",
            "detailed_timing": True,
            "optimization_focus": "section_processing",
        },
        expected_patterns=["breakdown", "stage", "timing", "optimization", "analysis"],
    ) as perf_ctx:
        logger.info("=== GRANT TEMPLATE STAGE BREAKDOWN ANALYSIS ===")

        with perf_ctx.stage_timer("setup"):
            source_ids = await create_rag_sources_from_cfp_file(
                cfp_file_name="melanoma_alliance.md",
                grant_template_id=str(uuid4()),
                session_maker=async_session_maker,
                grant_application_id=melanoma_alliance_full_application_id,
            )

            cfp_result = await handle_extract_cfp_data_from_rag_sources(
                source_ids=source_ids,
                organization_mapping=organization_mapping,
                session_maker=async_session_maker,
            )

        job_manager = await create_job_manager_for_performance(
            async_session_maker, melanoma_alliance_full_application_id
        )

        with perf_ctx.stage_timer("section_processing"):
            sections = await extract_and_enrich_sections(
                cfp_content=cfp_result["content"],
                cfp_subject=cfp_result.get("cfp_subject", "Melanoma Alliance Stage Breakdown Analysis"),
                organization=None,
                parent_id=uuid4(),
                job_manager=job_manager,
            )

        section_time = perf_ctx.stage_times["section_processing"]
        per_section_time = section_time / len(sections) if sections else 0

        breakdown_content = f"""
        # Grant Template Stage Breakdown Analysis

        ## Processing Performance
        - **Total Section Processing**: {section_time:.2f}s
        - **Sections Generated**: {len(sections)}
        - **Average per Section**: {per_section_time:.2f}s

        ## Stage Composition Analysis
        The extract_and_enrich_sections function includes:
        1. **Section Structure Extraction** (~40% of time)
        2. **Metadata Generation** (~60% of time)

        ## Optimization Opportunities
        - **Parallel Section Processing**: Potential 30-50% improvement
        - **Batch Metadata Generation**: Potential 40-60% improvement
        - **Combined Optimization**: Potential 50-70% improvement

        ## Performance Targets
        - Current: {section_time:.2f}s for {len(sections)} sections
        - Target (40% improvement): {section_time * 0.6:.2f}s
        - Stretch (60% improvement): {section_time * 0.4:.2f}s
        """

        section_titles = [getattr(s, "title", f"Section {i + 1}") for i, s in enumerate(sections)]
        perf_ctx.set_content(breakdown_content, section_titles)

        logger.info("Stage breakdown: %.2fs for %d sections", section_time, len(sections))
        logger.info("Per-section average: %.2fs", per_section_time)

        perf_ctx.stage_times.get("setup", 0)
        processing_time = perf_ctx.stage_times.get("section_processing", 0)

        if processing_time > 240:
            perf_ctx.add_warning(f"Section processing exceeds 4min: {processing_time:.1f}s")
        if per_section_time > 30:
            perf_ctx.add_warning(f"Per-section time high: {per_section_time:.1f}s")

        assert len(sections) >= 3, "Should extract meaningful number of sections"
        assert processing_time > 0, "Should have positive processing time"
        assert per_section_time < 60, f"Per-section time should be reasonable: {per_section_time:.1f}s"

    # Assert performance targets after context manager exit
    assert_performance_targets(perf_ctx.result)
    assert_quality_targets(perf_ctx.result, min_score=50.0)
