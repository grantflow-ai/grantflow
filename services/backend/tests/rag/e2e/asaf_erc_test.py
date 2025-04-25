import logging
from datetime import UTC, datetime
from os import environ
from typing import TYPE_CHECKING, Any
from unittest.mock import AsyncMock

import pytest
from shared_utils.src.serialization import serialize
from sqlalchemy.ext.asyncio import async_sessionmaker

from db.src.tables import FundingOrganization, Workspace
from src.rag.grant_application.handler import grant_application_text_generation_pipeline_handler
from tests.test_utils import RESULTS_FOLDER, create_grant_application_data

if TYPE_CHECKING:
    from db.src.json_objects import ResearchObjective


@pytest.mark.timeout(60 * 30)
@pytest.mark.skipif(
    not environ.get("E2E_TESTS"), reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests"
)
async def test_generate_erc_application_for_asaf(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    workspace: Workspace,
    erc_organization: FundingOrganization,
) -> None:
    form_inputs: dict[str, str] = {
        "background_context": "DNA synthesis is a major bottleneck in the development of groundbreaking new products in biotechnology. Today's DNA synthesis of long and ultra long DNA molecules are highly cumbersome, work intensive, long and expensive.  The limitation in DNA synthesis today is primarily due to the inherent inefficiencies in chemical synthesis methods, which typically cannot produce oligonucleotides longer than 150-200 base pairs without compromising sequence fidelity. For longer constructs, assembly techniques attempt to fill the gap. Gibson assembly joins overlapping DNA fragments using exonucleases, polymerases, and ligases in a single step, while polymerase cycling assembly arranges pools of complementary oligonucleotides into larger genes. These methods demand high-quality short fragments and can be time-consuming if repeated rounds of cloning are needed. Microarray-based parallel synthesis miniaturizes these steps to produce large numbers of unique sequences cost-effectively, but typically yields small quantities of each. Meanwhile, rolling circle amplification and “doggybone” DNA formats allow rapid scale-up of gene constructs in a cell-free manner (4). For example, the synthesis of the first eukaryotic genome, Saccharomyces cerevisiae, is an ongoing international effort involving numerous research groups that has resulted in the synthesis of the yeast's 16 chromosomes that range from 0.2-2Mb in length for a total of 12 Mb per genome. Each chromosome was synthesized by combining 100s of 'mini-chunks' of 2-4kb DNA that were combined sequentially into larger 'chunks' and again into 'megachunks' which were inserted into a YAC/BAC vector backbone, and in some cases meiotic recombination-mediated assembly was used to recombine all these pieces into one chromosome (5). The reported cost of the synthetic yeast chromosomes is an average of $0.10 per base pair, translating to $1.2 million to synthesize one S. cerevisiae genome (6). This cost represents the cost per base when synthesizing segments < 3000 bp which are then combined using various techniques. The cost per base of synthesizing longer segments in one step increases dramatically with length and can reach more than ten times that of shorter DNA fragments, amounting to over $10 million for one yeast genome.",
        "hypothesis": 'C. elegans is a small, free-living roundworm that has become one of the most studied and important model organisms in scientific research. For over three decades, it has been well-established that when DNA is injected into the worm\'s gonads (plasmids, for example), the worm concatemerizes the injected DNA and forms gigantic, repetitive, extrachromosomal arrays (ECAs), which are typically 1-3 million base pairs long (3). We aim to exploit the mechanism of DNA concatemerization to create a one-step, cost-effective "cloning machine" for synthesizing and amplifying error-free ultra-long DNA sequences.',
        "rationale": "The inability to quickly and cost-effectively produce long, accurate DNA sequences at scale has slowed down research and development pipelines, potentially delaying the progress of promising therapies. Furthermore, the current limitations in DNA synthesis technology have restricted the ability of researchers to construct and study complex genetic circuits and entire synthetic genomes, which are crucial for advancing our understanding of biological systems and developing novel biotechnological applications.",
        "novelty_and_innovation": "Our approach is the first to harness natural in vivo processes for the synthesis of ultra long DNA molecules. It relies on our deep understanding of C. elegans genomics, molecular biology and heredity and latest developments in DNA sequencing and robotic microinjection.",
        "team_excellence": "Advances in long-read sequencing and computational tools enable precise characterization and control of ECA formation. In Addition, automated microinjection systems for C. elegans have already been developed, demonstrating the feasibility of scaling up our approach. In addition, our team possesses deep expertise in genetics, bioinformatics, and C. elegans molecular biology, uniquely positioning them to tackle these challenges. We already have preliminary results showing that ECAs can be formed from diverse DNA sequences and that modifying DNA repair pathways influences the process, providing a solid foundation for optimization. Our team's unique multidisciplinary knowhow in C. elegans biology, genetics, epigenetics and artificial intelligence (AI), positions us in an optimal place to accomplish this highly innovative goal of developing a revolutionary in-vermis “factory” (in vermis means “in worm”) for accurate and cost-effective synthesis of ultra-long DNA sequences (1-2 Mb long).",
        "preliminary_data": "In our preliminary study, we have already demonstrated the applicability of using our methods to begin deciphering the mechanisms shaping the formation of ECAs. We successfully used long read sequencing technologies to sequence arrays of different compositions. We characterized arrays of increasing complexity, starting with arrays that are made of a repetitive single short DNA sequence, moved on towards arrays that are made of two different DNA sequences, and finally successfully sequenced and assembled an array which is made of 43 different DNA plasmids. Importantly, we conducted array formation experiments using mutants defective in non-homologous end joining (NHEJ) and found that these worms are capable of producing stable ECA.",
        "research_feasibility": "The feasibility of this project is supported by strong preliminary data and the existing technological capabilities we established. In addition, our vast experience in developing software tools for molecular biology demonstrates in our ability to create the software for designing the arrays (the specific individual fragments). Indeed, we have recently published multiple software tools aimed at simplifying computational analysis for non-specialists (15) (16). Our unique knowledge and experience in using the C. elegans for multiple and diverse types of research, from non-mendelian epigenetic inheritance to neuroscience research, position us as ideally suited to accomplish this high-risk, high-gain concept of establishing a novel one-stop-shop technology for in-vermis ultra-long DNA synthesis, that could have transformative effects on the entire field of synthetic biology.",
        "impact": "This project presents a high-risk/high-gain opportunity by pioneering a novel, in vivo approach to ultra-long DNA synthesis. If successful, it will provide a single-step, cost-effective, and scalable method for constructing entire genomes, synthetic pathways, and long DNA sequences - transforming fields such as synthetic biology, genomics, gene therapy, and bioengineering. By utilizing C. elegans as a biological DNA synthesis platform, we could eliminate the limitations of traditional chemical and enzymatic DNA synthesis, making ultra-long sequence generation far more accessible and affordable. This breakthrough could accelerate synthetic genome engineering, enable personalized medicine applications, and open new frontiers in DNA-based data storage.",
        "scientific_infrastructure": "",
    }

    research_objectives: list[ResearchObjective] = [
        {
            "number": 1,
            "title": "Decipher the rules of ECA formation in C. elegans",
            "research_tasks": [
                {"number": 1, "title": "Identify optimal homology length for ECA formation"},
                {"number": 2, "title": "Sequence the successful recombination products"},
                {
                    "number": 3,
                    "title": "Increase the number of homologous subunits with the optimal overlap length",
                },
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
    grant_application_id = await create_grant_application_data(
        workspace=workspace,
        research_objectives=research_objectives,
        form_inputs=form_inputs,
        async_session_maker=async_session_maker,
        fixture_id="f9e68907-5dd9-4802-b8c0-56cf98140b19",
        cfp_markdown_file_name="erc.md",
        source_file_names=["ERC- Information for Applicants PoC.pdf"],
        title="In-Vermis Ultra-Long DNA Synthesis",
    )
    logger.info("Running end-to-end test for generating a full grant application text format")

    text, section_texts = await grant_application_text_generation_pipeline_handler(
        application_id=grant_application_id,
        message_handler=AsyncMock(),
    )

    result_folder = RESULTS_FOLDER / grant_application_id
    result_folder.mkdir(parents=True, exist_ok=True)
    result_file = result_folder / f"full_text_result_text_asaf_{datetime.now(UTC).timestamp()}.md"
    result_file.write_text(text)
    result_file = result_folder / f"full_text_result_section_texts_asaf_{datetime.now(UTC).timestamp()}.json"
    result_file.write_bytes(serialize(section_texts))
