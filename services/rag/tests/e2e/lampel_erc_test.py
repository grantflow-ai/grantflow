import logging
from datetime import UTC, datetime
from os import environ
from typing import TYPE_CHECKING, Any
from uuid import UUID

import pytest
from packages.db.src.tables import FundingOrganization, Workspace
from packages.shared_utils.src.serialization import serialize
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing import RESULTS_FOLDER
from testing.test_utils import create_grant_application_data

from services.rag.src.grant_application.handler import grant_application_text_generation_pipeline_handler

if TYPE_CHECKING:
    from packages.db.src.json_objects import ResearchDeepDive, ResearchObjective


@pytest.mark.timeout(60 * 30)
@pytest.mark.skipif(
    not environ.get("E2E_TESTS"), reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests"
)
async def test_generate_erc_application_for_lampel(
    logger: logging.Logger,
    async_session_maker: async_sessionmaker[Any],
    workspace: Workspace,
    erc_organization: FundingOrganization,
) -> None:
    form_inputs: ResearchDeepDive = {
        "background_context": "The problem we aim to address is the environmental and sustainability challenges associated with traditional drug and macromolecule-drug conjugates synthesis, which relies heavily on organic solvents, contributing to waste generation and environmental harm.",
        "hypothesis": "The capacity to spatially regulate the partitioning of hydrophobic organic molecules and their chemical transformation i.e., reaction rate and conversion, is determined by the chemical composition of the condensate building block i.e. peptide sequence, which in turn controls the condensate architecture and materials properties.",
        "rationale": "The research is important and motivated by the need for sustainable and environmentally friendly drug synthesis methods. The approach builds upon the principles of micellar catalysis, which enables organic reactions in solvent-free aqueous media, while offering enhanced versatility and tunability in chemical composition and reaction control through condensates. These innovations aim to revolutionize green drug synthesis, providing a sustainable and efficient alternative to traditional organic solvent-based methods. Our approach includes: Employing biomolecular condensates as dynamic, tunable, organic solvent-free reaction systems for green drug synthesis. Focusing on creating sustainable, biocompatible microenvironments that enhance reaction efficiency while addressing the pressing need for environmentally friendly practices in pharmaceutical manufacturing. Key aspects include leveraging liquid-liquid phase separation (LLPS) for system design and targeting precise control over reactant recruitment and catalytic activity.",
        "novelty_and_innovation": "The approach builds upon the principles of micellar catalysis, which enables organic reactions in solvent-free aqueous media, while offering enhanced versatility and tunability in chemical composition and reaction control through condensates. These innovations aim to revolutionize green drug synthesis, providing a sustainable and efficient alternative to traditional organic solvent-based methods. Our approach includes: Employing biomolecular condensates as dynamic, tunable, organic solvent-free reaction systems for green drug synthesis. Focusing on creating sustainable, biocompatible microenvironments that enhance reaction efficiency while addressing the pressing need for environmentally friendly practices in pharmaceutical manufacturing. Key aspects include leveraging liquid-liquid phase separation (LLPS) for system design and targeting precise control over reactant recruitment and catalytic activity.",
        "team_excellence": "Over the past 8 years, I have gained extensive experience in developing peptide-based bioinspired materials. I showed that peptides with tunable level of supramolecular order/disorder56 can be utilized for applications in photoprotection (Science 2017, Angew. Chem. 2021)56-58 as conductive materials (Adv. Mater. 2020)59, and materials whose properties change in response to chemical (Angew. Chem., 2021, Adv. Funct. Mater. 2022)57,60,51 or physical stimuli (ACS Appl. Mater. Interfaces 2022, Adv. Mater 2022)39,58. My group has been developing tools to design and characterize peptide condensates38,39,51,50 (Figs. 2-4).",
        "preliminary_data": "Yes, most of the data is found in the manuscript I added to the Drive folder.",
        "research_feasibility": "",
        "impact": "Our peptide LLPS-based approach for condensate production opens new opportunities for sustainable drug synthesis in organic solvent-free aqueous environment, in accordance with the guidelines of green chemistry. The advantages of our approach are: Environmentally Friendly: The technology enables drug synthesis in an organic solvent-free environment, aligning with green chemistry principles and reducing environmental impact. Dynamic and Tunable Systems: Biomolecular condensates are highly adaptable, offering tunable microenvironments that can be customized for specific reactions and conditions. Scalability and Versatility: The use of phase-separated systems ensures the scalability of the platform for a variety of chemical and enzymatic reactions. Enhanced Reactivity: Condensates offer localized high concentrations of reactants, facilitating reaction efficiency and conversion rates. Sustainability: By eliminating the reliance on organic solvents and leveraging biomolecular systems, the approach provides a sustainable alternative to traditional methods. Biocompatibility: These systems are inherently biocompatible, allowing potential integration into biomedical and pharmaceutical applications.",
        "scientific_infrastructure": "",
    }

    research_objectives: list[ResearchObjective] = [
        {
            "number": 1,
            "title": "Develop and optimize conditions for antibody-drug conjugate click reactions as model systems",
            "research_tasks": [
                {
                    "number": 1,
                    "title": "Develop and optimize reaction conditions of two click reaction models involving formation of antibody-drug conjugates.",
                },
                {
                    "number": 2,
                    "title": "Develop and optimize conditions for LLPS and condensate formation under reaction conditions.",
                },
            ],
        },
        {
            "number": 2,
            "title": "Characterization of reactant and product encapsulation",
            "research_tasks": [
                {
                    "number": 1,
                    "title": "Analysing the reactant and product encapsulation efficiency (EE) in condensates.",
                },
                {
                    "number": 2,
                    "title": "Optimization of reactant EE in the condensate by tuning the peptide composition and reaction conditions.",
                },
                {
                    "number": 3,
                    "title": "Optimization of product EE in the condensate by tuning the peptide composition and reaction conditions aiming at product exclusion following separation of the phases (dilute and dense) by centrifugation.",
                },
            ],
        },
        {
            "number": 3,
            "title": "Characterization of reactions in condensates",
            "research_tasks": [
                {
                    "number": 1,
                    "title": "Quantitative analysis of reaction kinetics, conversion and initial rate in condensates.",
                },
                {
                    "number": 2,
                    "title": "Microscopy analysis of reaction kinetics to elucidate product localization in the two phases (dilute vs. dense phases).",
                },
                {
                    "number": 3,
                    "title": "Optimization of condensate reactors composition and reaction conditions to increase reaction efficiency.",
                },
            ],
        },
        {
            "number": 4,
            "title": "System sustainability and scalability",
            "research_tasks": [
                {
                    "number": 1,
                    "title": "Analysing reaction sustainability and ability to perform multiple reaction cycles following product separation.",
                },
                {
                    "number": 2,
                    "title": "Analysing condensate formation and reaction performance at larger scales at the mL-L range.",
                },
            ],
        },
        {
            "number": 5,
            "title": "Path to industrialization and commercialization of the system",
            "research_tasks": [
                {
                    "number": 1,
                    "title": "What is the impact (social, scientific, economic, etc.) of the success of this technology and its mass scale market adoption?",
                },
                {
                    "number": 2,
                    "title": "Identification of the most suitable system use-cases, and benchmarking of the system with similar competitors (technical and business, including business model).",
                },
                {
                    "number": 3,
                    "title": "Analysis of the activities needed to study a solid market strategy for the system once the R&D is completed. Moreover, to study a proper stakeholders' involvement strategy for the system and IPR strategy.",
                },
            ],
        },
    ]
    grant_application_id = await create_grant_application_data(
        workspace=workspace,
        research_objectives=research_objectives,
        form_inputs=form_inputs,
        async_session_maker=async_session_maker,
        fixture_id="8b5e85e4-f962-418e-bdb0-6780edce3247",
        cfp_markdown_file_name="erc.md",
        source_file_names=["ERC- Information for Applicants PoC.pdf"],
        title="Regulation of organic reactions by controlled microenvironments using designer condensates",
    )
    logger.info("Running end-to-end test for generating a full grant application text format")

    text, section_texts = await grant_application_text_generation_pipeline_handler(
        grant_application_id=UUID(grant_application_id),
        session_maker=async_session_maker,
    )

    result_folder = RESULTS_FOLDER / grant_application_id
    result_folder.mkdir(parents=True, exist_ok=True)
    result_file = result_folder / f"full_text_result_text_lampel_{datetime.now(UTC).timestamp()}.md"
    result_file.write_text(text)
    result_file = result_folder / f"full_text_result_section_texts_lampel_{datetime.now(UTC).timestamp()}.json"
    result_file.write_bytes(serialize(section_texts))
