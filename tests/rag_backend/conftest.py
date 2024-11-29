import pytest

from src.rag_backend.dto import DraftGenerationRequest


@pytest.fixture(scope="session")
def generation_request() -> DraftGenerationRequest:
    return DraftGenerationRequest(
        workspace_id="3d8f40f3-5053-4b55-b431-ede2a167201c",
        application_id="9e4cf818-a3f6-4f3e-9cc2-6e8a3fcf3a05",
        cfp_title="R01 - Research Project",
        application_title="Development of a novel class of immunotherapeutic molecules: Myeloid-targeted immunocytokine and NK-T cell enhancers",
        grant_funding_organization="NIH",
        significance_description="Use the following document and extract from it elements discussing the importance and potential of immunotherapies in cancer treatment. Use it also to discuss specifically the potential and the limitations of currently available 1) myeloid targeting immunotherapies and 2) cytokines. Summarize with a description of how our project aims to overcome those limitations with the construction of a dual molecule - targeting both the myeloid compartment via the TREM2 pathway and also T and NK cells with cytokines and how this new molecule could help patients suffering from tumors resistant to currently available immunotherapies. This grant is less business oriented so you don't need to touch the business side and plans or the economic impact.",
        innovation_description="Use the following document to discuss the innovative technologies we will be using in the project. Elaborate about our different single cell technologies and our data-driven approach to drug design. Describe the novelty of our planned construct in activating both the myeloid compartment and NK and T cells and our innovative approach of designing the cytokines with the masking enabling their activation only in the tumor microenvironment (TME).",
        research_aims=[
            {
                "title": "Discovery campaign of cytokine candidates with optimal synergistic effects with anti-TREM2 antibody",
                "description": "In aim 1, we will l screen the effects of ~30 different cytokines in combination with the E3C7 mAb. The cytokines screened will be from this list: CCL3, CSCL7, CCL26, TGFBRII, IL-1, IL-2, IL-6, IL-7, IL-12, IL-15, IL-18, IL-21, IFNa, IFNb, IFNg, CCL1, CCL2, CCL3, CCL5, CCL7, CCL8/MCP-2, CCL11, CCL13/MCP-4, CCL14/HCC-1, CCL17/CTAC, CCL19, CCL22, CCL23, CCL24, CCL26, CCL27, lymphotactin/XCL1, Eotaxin, CXCL6/GCP-2, CXCL7/NAP-2, CXCL8, CXCL10, CXCL11/ITAC, CXCL12, CXCL13, CXCL15. This aim has 5 tasks.",
                "requires_clinical_trials": False,
                "tasks": [
                    {
                        "title": "Measure cytokine and anti-TREM2 effects on myeloid, NK and T cell activity",
                        "description": "We will evaluate the impact of the cytokines in combination with the E3C7 mAb on inducing immune cell activity by performing in-vitro assays of co-cultured huMDMs, NK,or T cells. As control, we will conduct the same assays without the anti-TREM2 mAb or without adding cytokines. NK and T cell activity in each assay will be measured by quantifying the proliferative potential using flow cytometry, and cytokine secretion using ELISA and qPCRs.",
                    },
                    {
                        "title": "Killing assays.",
                        "description": "We will assess the ability of different cytokines in combination with the E3C7 mAb to induce cytotoxic T and NK cell activity. This will entail treating assays of co-cultured huMDMs, NK or T cells and tumor cells with the various cytokines and E3C7 mAb combinations. As control, the same experiments will be conducted with only the tested cytokines or E3C7 mAb. NK and T cell activity and cytotoxicity levels will be measured by quantifying the amount of tumor cell death using FACS (pre-staining the tumor cells).",
                    },
                    {
                        "title": "Select the most effective cytokines.",
                        "description": "We will combine and evaluate the data collected in Tasks 1.1-1.2 to identify 8-10 anti-TREM2 mAb and cytokine combinations with the best performance in terms of down-regulating myeloid cell suppressive activity and enhancing myeloid and T cell inflammatory activity.",
                    },
                    {
                        "title": "Single-cell analysis using an in-vitro functional screening system.",
                        "description": "We developed an in-vitro system for bone-marrow-derived monocyte diversification toward the M2 suppressor macrophage state and incorporated in the system a control culture of monocytes derived from TREM2-/- mice that do not differentiate toward the M2 macrophage state under the cytokine-induced conditions. On the backbone of this system, we will co-culture myeloid and NK-T cells, and apply scRNA-seq analysis to obtain an in-depth understanding of the effects of the perturbation created by treatment with the 8-10 cytokines selected in Task 1.3 in combination with our E3C7 mAb and compare them to the effects of the co-cultured T cells and TREM2-/- myeloid cells.",
                    },
                    {
                        "title": "Single-cell analysis of in vivo screening system.",
                        "description": "We developed a platform to over-express cytokines in an inducible fashion by barcoded (Pro-Code) tumor cell lines. The 5-8 most promising cytokines selected from task 1.4 will be cloned into our vectors and screened in combination with our anti-TREM2 mAbs in vivo. We will apply our in depth scRNA-seq analysis pipeline to make a data-driven selection of the 3-5 cytokines with the most promising modulatory function in combination with our anti-TREM2 mAb",
                    },
                ],
            },
            {
                "title": "Design, development and production of novel mAb-cytokine fusion molecules",
                "description": "In this aim, we will focus on the design, development and production of novel mAb-cytokine fusion molecules and the validation of their pro-inflammatory and antineoplastic activity.",
                "requires_clinical_trials": False,
                "tasks": [
                    {
                        "title": "Design fusion proteins and cleavage sites.",
                        "description": "We will develop the optimal structures for the fusion proteins of the top 3-5 mAb-cytokine combinations identified in WP1, using advanced techniques in protein design. The design process will include the selection of the most suitable peptide linkers, blocking moieties, TAM-specific cleavage sites and the computational optimization of protein structure and stability.",
                    },
                    {
                        "title": "Produce fusion proteins.",
                        "description": "Building on the designs developed in Task 2.1, we will manufacture the 3-5 mAb-cytokine fusion proteins. The protein synthesis will be done by a contract research organization (CRO) selected based on our experience with leading CROs based on quality and punctual production. The production will include the selection of stable molecules with high protein expression and no aggregation.",
                    },
                    {
                        "title": "Validate proteins in silico and in vitro.",
                        "description": "We will confirm the binding via SPR, ELISA, cell-based binding and reporter assays.",
                    },
                    {
                        "title": "Validate MiTE's effects on myeloid, NK, and T cell activity.",
                        "description": "We will validate MiTEs' impact on interactions between myeloid and lymphoid cell activity using in-vitro assays of co-cultured huMDMs, NK or T cells. The data from Task 1.1 will be used as control. Cell activity will be measured as in Task 1.1.",
                    },
                    {
                        "title": "Validate MiTE activity in NK and T cell killing assays.",
                        "description": "To assess the efficacy of the fusion proteins in inducing cytotoxic NK and T cell activity, assays of co-cultured huMDMs, NK, or T cells and tumor cells will be treated with the various mAb-cytokine chimeras. The data collected in Task 1.2 will be used as control. NK and T cell activity and cytotoxicity levels will be measured as in Task 1.2.",
                    },
                ],
            },
            {
                "title": "In depth investigation of our molecules' in vivo activity and efficacy.",
                "description": "This aim will include a thorough investigatoin of the efficacy of potential anti-cancer therapeutics requires in-vivo testing of the molecules with different dosing levels and treatment regimens against several tumor models. scRNA-seq analysis will aid us in reaching an in-depth understanding of the effects of different molecules. Comparative single-cell analysis will enable the selection of the most relevant animal tumor models that incorporate the desired features of the TME seen in patients. Longitudinal time-course single-cell profiling of tumors from treated murine models will assist in the characterization of cell types and pathways directly targeted by the MiTE molecules and tested in this aim as well as secondary responses of the on-target cell populations; this would enable an evaluation of the various therapeutic molecules and treatment courses. Despite their many benefits, murine models often do not recapitulate carcinogenic processes in humans, and the histological complexity and genetic heterogeneity of human cancers are typically not reflected in genetically engineered animal models. This limitation will be addressed by using complex ex-vivo tumor models. The ex-vivo human tumor fragment platform provides a final layer of preclinical validation and efficacy study for the selection of the most promising MiTE molecules to proceed to future clinical trials. This aim has 8 tasks. Task 3.1: Test MiTE molecules' efficacy on different cancer types using in-vivo models. Task 3.2: MoA analysis of TME reprogramming. Task 3.3: In-vivo validation of MiTEs' TME specificity and toxicity. Task 3.4: In-vivo calibration of dosing levels. Task 3.5: Temporal analysis of treatment regimens. Task 3.6: Spatial transcriptomics. Task 3.7: Select the highest-performing molecules. Task 3.8: Quantify the efficacy of therapeutic molecules on human tumor fragment models",
                "requires_clinical_trials": False,
                "tasks": [
                    {
                        "title": "Test MiTE molecules' efficacy on different cancer types using in-vivo models.",
                        "description": "To validate the anti-tumor in-vivo activity of the 3-5 MiTE molecules, we will employ transgenic human TREM2 mice models harboring relevant tumors. Validation will be done by quantifying tumor volumes and survival.",
                    },
                    {
                        "title": "MoA analysis of TME reprogramming.",
                        "description": "To complement the efficacy testing in Task 3.1 and inform on the optimal selection of molecules, we will conduct an in-depth in-vivo MoA validation of the effects of our selected molecules on TME reprogramming. Tumor mouse models highlighted in Task 3.1 will be treated with relevant dosages of the MiTE molecules selected in previous WPs. The MoA analysis will be done using FACS sorting of the immune compartment to quantify the activity and states of different immune cells. Cytokine secretion in the TME will be measured using ELISA. An in-depth understanding of each molecule's MoA will be acquired using our advanced single-cell multi-omics.",
                    },
                    {
                        "title": "In-vivo validation of MiTEs' TME specificity and toxicity.",
                        "description": "Using cytokine release syndrome (CRS) models and assays, we will demonstrate the specificity of our conditionally activated immunocytokine constructs in vivo. This includes IFNG, IL-6 and TNFa in serum, weight loss in mice, and ALT/ALS enzyme levels.",
                    },
                    {
                        "title": "In-vivo calibration of dosing levels.",
                        "description": "Different doses of the best performing MiTE molecules selected in WPs 1 and 2 will be tested on tumor murine models highlighted in Task 3.1. Efficacy levels will be estimated by measuring tumor volumes and survival times.",
                    },
                    {
                        "title": "Temporal analysis of treatment regimens.",
                        "description": "We will test the various treatment regimens and determine the timing of treatment and sampling in murine models, which will enable a high-resolution temporal analysis of the tumor TME and its periphery. Efficacy of the molecules and different treatment schedules will be estimated by quantifying the survival time of murine models and tumor volumes. In-depth single-cell profiling of the tumor and TME will serve to determine the effects of each molecule and highlight its potential MoA.",
                    },
                ],
            },
        ],
    )
