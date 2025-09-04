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
async def test_generate_erc_application_for_asaf(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    erc_organization: GrantingInstitution,
    performance_context: PerformanceTestContext,
) -> None:
    performance_context.set_metadata("researcher", "Asaf")
    performance_context.set_metadata("grant_type", "ERC")
    performance_context.set_metadata("research_domain", "DNA_synthesis")

    logger.info("🧬 Generating ERC application for Asaf's DNA synthesis research")

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
        "background_context": "DNA synthesis is a major bottleneck in the development of groundbreaking new products in biotechnology. Today's DNA synthesis of long and ultra long DNA molecules are highly cumbersome, work intensive, long and expensive. The limitation in DNA synthesis today is primarily due to the inherent inefficiencies in chemical synthesis methods, which typically cannot produce oligonucleotides longer than 150-200 base pairs without compromising sequence fidelity. For longer constructs, assembly techniques attempt to fill the gap. The reported cost of the synthetic yeast chromosomes is an average of $0.10 per base pair, translating to $1.2 million to synthesize one S. cerevisiae genome. The cost per base of synthesizing longer segments in one step increases dramatically with length and can reach more than ten times that of shorter DNA fragments, amounting to over $10 million for one yeast genome.",
        "hypothesis": 'C. elegans is a small, free-living roundworm that has become one of the most studied and important model organisms in scientific research. For over three decades, it has been well-established that when DNA is injected into the worm\'s gonads (plasmids, for example), the worm concatemerizes the injected DNA and forms gigantic, repetitive, extrachromosomal arrays (ECAs), which are typically 1-3 million base pairs long. We aim to exploit the mechanism of DNA concatemerization to create a one-step, cost-effective "cloning machine" for synthesizing and amplifying error-free ultra-long DNA sequences.',
        "rationale": "The inability to quickly and cost-effectively produce long, accurate DNA sequences at scale has slowed down research and development pipelines, potentially delaying the progress of promising therapies. Furthermore, the current limitations in DNA synthesis technology have restricted the ability of researchers to construct and study complex genetic circuits and entire synthetic genomes, which are crucial for advancing our understanding of biological systems and developing novel biotechnological applications.",
        "novelty_and_innovation": "Our approach is the first to harness natural in vivo processes for the synthesis of ultra long DNA molecules. It relies on our deep understanding of C. elegans genomics, molecular biology and heredity and latest developments in DNA sequencing and robotic microinjection.",
        "team_excellence": 'Our team possesses deep expertise in genetics, bioinformatics, and C. elegans molecular biology, uniquely positioning them to tackle these challenges. We already have preliminary results showing that ECAs can be formed from diverse DNA sequences and that modifying DNA repair pathways influences the process, providing a solid foundation for optimization. Our team\'s unique multidisciplinary knowhow in C. elegans biology, genetics, epigenetics and artificial intelligence (AI), positions us in an optimal place to accomplish this highly innovative goal of developing a revolutionary in-vermis "factory" for accurate and cost-effective synthesis of ultra-long DNA sequences.',
        "preliminary_data": "In our preliminary study, we have already demonstrated the applicability of using our methods to begin deciphering the mechanisms shaping the formation of ECAs. We successfully used long read sequencing technologies to sequence arrays of different compositions. We characterized arrays of increasing complexity, starting with arrays that are made of a repetitive single short DNA sequence, moved on towards arrays that are made of two different DNA sequences, and finally successfully sequenced and assembled an array which is made of 43 different DNA plasmids. Importantly, we conducted array formation experiments using mutants defective in non-homologous end joining (NHEJ) and found that these worms are capable of producing stable ECA.",
        "research_feasibility": "The feasibility of this project is supported by strong preliminary data and the existing technological capabilities we established. Our unique knowledge and experience in using the C. elegans for multiple and diverse types of research, from non-mendelian epigenetic inheritance to neuroscience research, position us as ideally suited to accomplish this high-risk, high-gain concept of establishing a novel one-stop-shop technology for in-vermis ultra-long DNA synthesis, that could have transformative effects on the entire field of synthetic biology.",
        "impact": "This project presents a high-risk/high-gain opportunity by pioneering a novel, in vivo approach to ultra-long DNA synthesis. If successful, it will provide a single-step, cost-effective, and scalable method for constructing entire genomes, synthetic pathways, and long DNA sequences - transforming fields such as synthetic biology, genomics, gene therapy, and bioengineering. By utilizing C. elegans as a biological DNA synthesis platform, we could eliminate the limitations of traditional chemical and enzymatic DNA synthesis, making ultra-long sequence generation far more accessible and affordable.",
        "scientific_infrastructure": "Our lab is equipped with state-of-the-art facilities for C. elegans research, including automated microinjection systems and advanced sequencing capabilities.",
    }

    research_objectives: list[ResearchObjective] = [
        {
            "number": 1,
            "title": "Decipher the rules of ECA formation in C. elegans",
            "research_tasks": [
                {"number": 1, "title": "Identify optimal homology length for ECA formation"},
                {"number": 2, "title": "Sequence the successful recombination products"},
                {"number": 3, "title": "Increase the number of homologous subunits with the optimal overlap length"},
            ],
        },
        {
            "number": 2,
            "title": "Understand the role of DNA repair mechanisms in ECA formation",
            "research_tasks": [
                {"number": 1, "title": "Study the effects of mutations in DNA repair mechanisms"},
                {
                    "number": 2,
                    "title": "Identify desired recombinations and create multi-gene mutants for optimal array formation",
                },
                {"number": 3, "title": "Create arrays with only desired connections from homology-directed repair"},
            ],
        },
        {
            "number": 3,
            "title": "Establish a one-stop-shop system for in-vermis long DNA synthesis",
            "research_tasks": [
                {"number": 1, "title": "Develop software for injection mix prediction"},
                {"number": 2, "title": "Usage of robotic injection system (outsource)"},
                {"number": 3, "title": "Develop ability to capture array"},
                {"number": 4, "title": "Proof of concept of prediction software + array capture and sequencing"},
            ],
        },
        {
            "number": 4,
            "title": "Commercialization and path to market plan",
            "research_tasks": [
                {"number": 1, "title": "Intellectual Property and Legal Framework"},
                {"number": 2, "title": "Strategic Partnerships and Pilot Studies"},
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
        fixture_id="f9e68907-5dd9-4802-b8c0-56cf98140b19",
        cfp_markdown_file_name="erc.md",
        source_file_names=["ERC- Information for Applicants PoC.pdf"],
        title="In-Vermis Ultra-Long DNA Synthesis",
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

    dna_terms = ["DNA", "synthesis", "C. elegans", "ECA", "extrachromosomal"]
    found_terms = [term for term in dna_terms if term in text]
    assert len(found_terms) >= 3, f"Should contain DNA synthesis terminology, found: {found_terms}"

    assert any("elegans" in text.lower() for text in section_texts.values()), "Should mention C. elegans research"
    assert any("synthesis" in text.lower() for text in section_texts.values()), "Should mention DNA synthesis"

    performance_context.end_stage()

    word_count = len(text.split())
    character_count = len(text)
    section_count = len(section_texts)

    performance_context.set_metadata("generated_word_count", word_count)
    performance_context.set_metadata("generated_character_count", character_count)
    performance_context.set_metadata("section_count", section_count)
    performance_context.set_metadata("research_terms_found", found_terms)

    logger.info(
        "✅ Asaf's ERC application generated successfully",
        extra={
            "words": word_count,
            "characters": character_count,
            "sections": section_count,
            "research_terms": len(found_terms),
        },
    )
