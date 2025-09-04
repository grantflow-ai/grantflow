import logging
from typing import TYPE_CHECKING, Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

from packages.db.src.tables import GrantingInstitution
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import OrganizationFactory, ProjectFactory
from testing.performance_framework import PerformanceTestContext, TestDomain, TestExecutionSpeed, performance_test
from testing.utils import create_grant_application_data

from services.rag.src.grant_application.handler import grant_application_text_generation_pipeline_handler

if TYPE_CHECKING:
    from packages.db.src.json_objects import ResearchDeepDive, ResearchObjective


def create_mock_job_manager() -> AsyncMock:
    mock_job_manager = AsyncMock()
    mock_job_manager.create_grant_application_job = AsyncMock()
    mock_job_manager.update_job_status = AsyncMock()
    mock_job_manager.add_notification = AsyncMock()
    return mock_job_manager


@performance_test(execution_speed=TestExecutionSpeed.E2E_FULL, domain=TestDomain.GRANT_APPLICATION, timeout=1800)
async def test_generate_erc_application_for_lampel(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    erc_organization: GrantingInstitution,
    performance_context: PerformanceTestContext,
) -> None:
    performance_context.set_metadata("researcher", "Lampel")
    performance_context.set_metadata("grant_type", "ERC")
    performance_context.set_metadata("research_domain", "sustainable_drug_synthesis")

    logger.info("🧪 Generating ERC application for Lampel's sustainable drug synthesis research")

    performance_context.start_stage("setup_database_entities")

    async with async_session_maker() as session:
        organization = OrganizationFactory.build()
        session.add(organization)
        await session.flush()

        project = ProjectFactory.build(organization_id=organization.id)
        session.add(project)
        await session.commit()

    performance_context.end_stage()

    performance_context.start_stage("prepare_research_data")

    form_inputs: ResearchDeepDive = {
        "background_context": "The problem we aim to address is the environmental and sustainability challenges associated with traditional drug and macromolecule-drug conjugates synthesis, which relies heavily on organic solvents, contributing to waste generation and environmental harm. Current pharmaceutical manufacturing processes are not environmentally sustainable and contribute significantly to chemical waste.",
        "hypothesis": "The capacity to spatially regulate the partitioning of hydrophobic organic molecules and their chemical transformation i.e., reaction rate and conversion, is determined by the chemical composition of the condensate building block i.e. peptide sequence, which in turn controls the condensate architecture and materials properties.",
        "rationale": "The research is important and motivated by the need for sustainable and environmentally friendly drug synthesis methods. The approach builds upon the principles of micellar catalysis, which enables organic reactions in solvent-free aqueous media, while offering enhanced versatility and tunability in chemical composition and reaction control through condensates. These innovations aim to revolutionize green drug synthesis, providing a sustainable and efficient alternative to traditional organic solvent-based methods. Our approach includes employing biomolecular condensates as dynamic, tunable, organic solvent-free reaction systems for green drug synthesis.",
        "novelty_and_innovation": "The approach builds upon the principles of micellar catalysis, which enables organic reactions in solvent-free aqueous media, while offering enhanced versatility and tunability in chemical composition and reaction control through condensates. These innovations aim to revolutionize green drug synthesis, providing a sustainable and efficient alternative to traditional organic solvent-based methods. Key aspects include leveraging liquid-liquid phase separation (LLPS) for system design and targeting precise control over reactant recruitment and catalytic activity.",
        "team_excellence": "Over the past 8 years, I have gained extensive experience in developing peptide-based bioinspired materials. I showed that peptides with tunable level of supramolecular order/disorder can be utilized for applications in photoprotection as conductive materials, and materials whose properties change in response to chemical or physical stimuli. My group has been developing tools to design and characterize peptide condensates.",
        "preliminary_data": "Yes, most of the preliminary data supporting this research is documented in our recent publications and manuscripts.",
        "research_feasibility": "The project is highly feasible given our extensive preliminary data and established expertise in peptide-based materials and condensate formation.",
        "impact": "Our peptide LLPS-based approach for condensate production opens new opportunities for sustainable drug synthesis in organic solvent-free aqueous environment, in accordance with the guidelines of green chemistry. The advantages include: environmentally friendly synthesis, dynamic and tunable systems, scalability and versatility, enhanced reactivity through localized high concentrations, sustainability by eliminating organic solvents, and inherent biocompatibility for pharmaceutical applications.",
        "scientific_infrastructure": "Our laboratory is equipped with advanced facilities for peptide synthesis, characterization, and condensate formation studies.",
    }

    research_objectives: list[ResearchObjective] = [
        {
            "number": 1,
            "title": "Develop and optimize conditions for antibody-drug conjugate click reactions as model systems",
            "research_tasks": [
                {
                    "number": 1,
                    "title": "Develop and optimize reaction conditions of two click reaction models involving formation of antibody-drug conjugates",
                },
                {
                    "number": 2,
                    "title": "Develop and optimize conditions for LLPS and condensate formation under reaction conditions",
                },
            ],
        },
        {
            "number": 2,
            "title": "Characterization of reactant and product encapsulation",
            "research_tasks": [
                {
                    "number": 1,
                    "title": "Analyzing the reactant and product encapsulation efficiency (EE) in condensates",
                },
                {
                    "number": 2,
                    "title": "Optimization of reactant EE in the condensate by tuning the peptide composition and reaction conditions",
                },
                {
                    "number": 3,
                    "title": "Optimization of product EE in the condensate by tuning the peptide composition aiming at product exclusion following phase separation",
                },
            ],
        },
        {
            "number": 3,
            "title": "Characterization of reactions in condensates",
            "research_tasks": [
                {
                    "number": 1,
                    "title": "Quantitative analysis of reaction kinetics, conversion and initial rate in condensates",
                },
                {
                    "number": 2,
                    "title": "Microscopy analysis of reaction kinetics to elucidate product localization in the two phases (dilute vs. dense phases)",
                },
                {
                    "number": 3,
                    "title": "Optimization of condensate reactors composition and reaction conditions to increase reaction efficiency",
                },
            ],
        },
        {
            "number": 4,
            "title": "System sustainability and scalability",
            "research_tasks": [
                {
                    "number": 1,
                    "title": "Analyzing reaction sustainability and ability to perform multiple reaction cycles following product separation",
                },
                {
                    "number": 2,
                    "title": "Scale-up feasibility assessment and process optimization for industrial applications",
                },
            ],
        },
    ]

    performance_context.end_stage()

    performance_context.start_stage("create_grant_application_data")

    grant_application_id = await create_grant_application_data(
        project=project,
        research_objectives=research_objectives,
        form_inputs=form_inputs,
        async_session_maker=async_session_maker,
        fixture_id="a8b7c6d5-4321-9876-8765-123456789def",
        cfp_markdown_file_name="erc.md",
        source_file_names=["ERC- Information for Applicants PoC.pdf"],
        title="Sustainable Drug Synthesis via Biomolecular Condensates",
    )

    performance_context.end_stage()

    performance_context.start_stage("generate_application_text")

    mock_job_manager = create_mock_job_manager()

    with (
        patch("services.rag.src.utils.job_manager.publish_notification", new_callable=AsyncMock),
        patch("services.rag.src.grant_application.handler.verify_rag_sources_indexed", new_callable=AsyncMock),
    ):
        result = await grant_application_text_generation_pipeline_handler(
            grant_application_id=UUID(grant_application_id),
            session_maker=async_session_maker,
            job_manager=mock_job_manager,
        )
        assert result is not None, "Grant application generation should not return None"
        text, section_texts = result

    performance_context.end_stage()

    performance_context.start_stage("validate_generated_content")

    assert text, "Generated text should not be empty"
    assert len(text) > 1000, f"Generated text too short: {len(text)} characters"
    assert "# " in text, "Generated text should have markdown headers"

    assert section_texts, "Section texts should not be empty"
    assert len(section_texts) > 0, "Should have at least one section"

    sustainability_terms = ["sustainable", "green", "condensates", "LLPS", "peptide", "drug synthesis"]
    found_terms = [term for term in sustainability_terms if term.lower() in text.lower()]
    assert len(found_terms) >= 4, f"Should contain sustainability/chemistry terminology, found: {found_terms}"

    assert any("condensate" in text.lower() for text in section_texts.values()), "Should mention condensates"
    assert any("sustainable" in text.lower() for text in section_texts.values()), "Should mention sustainability"
    assert any("drug" in text.lower() for text in section_texts.values()), "Should mention drug synthesis"

    performance_context.end_stage()

    word_count = len(text.split())
    character_count = len(text)
    section_count = len(section_texts)

    performance_context.set_metadata("generated_word_count", word_count)
    performance_context.set_metadata("generated_character_count", character_count)
    performance_context.set_metadata("section_count", section_count)
    performance_context.set_metadata("sustainability_terms_found", found_terms)

    logger.info(
        "✅ Lampel's ERC application generated successfully",
        extra={
            "words": word_count,
            "characters": character_count,
            "sections": section_count,
            "sustainability_terms": len(found_terms),
        },
    )
