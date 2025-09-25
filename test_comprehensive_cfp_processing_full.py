#!/usr/bin/env python3
"""
Comprehensive CFP Processing Pipeline Test - FULL OUTPUT VERSION

This test demonstrates the full CFP processing flow using the melanoma alliance data,
with COMPLETE, UNTRUNCATED logging of all inputs, outputs, and processing stages.
"""

import asyncio
import json
import logging
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

# Configure detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DetailedLogger:
    """Helper class for detailed stage logging - FULL OUTPUT VERSION"""

    def __init__(self, stage_name: str):
        self.stage_name = stage_name

    def log_input(self, data: any, description: str = "Input data"):
        logger.info(f"🔵 [{self.stage_name}] INPUT - {description}")
        if isinstance(data, (dict, list)):
            # NO TRUNCATION - FULL DATA
            logger.info(f"📄 FULL DATA:\n{json.dumps(data, indent=2, default=str)}")
        else:
            logger.info(f"📄 FULL DATA: {str(data)}")

    def log_processing(self, message: str):
        logger.info(f"⚙️ [{self.stage_name}] PROCESSING - {message}")

    def log_api_call(self, api_name: str, payload: any = None):
        logger.info(f"🌐 [{self.stage_name}] API CALL - {api_name}")
        if payload:
            # NO TRUNCATION - FULL PAYLOAD
            logger.info(f"📤 FULL PAYLOAD:\n{json.dumps(payload, indent=2, default=str)}")

    def log_api_response(self, api_name: str, response: any):
        logger.info(f"📨 [{self.stage_name}] API RESPONSE - {api_name}")
        if isinstance(response, (dict, list)):
            # NO TRUNCATION - FULL RESPONSE
            logger.info(f"📥 FULL RESPONSE:\n{json.dumps(response, indent=2, default=str)}")
        else:
            logger.info(f"📥 FULL RESPONSE: {str(response)}")

    def log_nlp_processing(self, operation: str, input_text: str, output: any):
        logger.info(f"🧠 [{self.stage_name}] NLP - {operation}")
        # NO TRUNCATION - FULL TEXT AND OUTPUT
        logger.info(f"📝 FULL INPUT TEXT:\n{input_text}")
        logger.info(f"🔍 FULL NLP OUTPUT:\n{json.dumps(output, indent=2, default=str)}")

    def log_output(self, data: any, description: str = "Output data"):
        logger.info(f"🟢 [{self.stage_name}] OUTPUT - {description}")
        if isinstance(data, (dict, list)):
            # NO TRUNCATION - FULL RESULT
            logger.info(f"📋 FULL RESULT:\n{json.dumps(data, indent=2, default=str)}")
        else:
            logger.info(f"📋 FULL RESULT: {str(data)}")

    def log_error(self, error: str):
        logger.error(f"❌ [{self.stage_name}] ERROR - {error}")

async def mock_cfp_extraction_stage():
    """Mock the CFP extraction stage with COMPLETE logging"""
    stage_logger = DetailedLogger("CFP_EXTRACTION")

    # Load raw melanoma alliance data
    cfp_file_path = Path("/Users/yiftachashkenazi/monorepo/testing/test_data/fixtures/cfps/melanoma_alliance.md")

    stage_logger.log_processing("Loading raw CFP document")
    raw_cfp_text = cfp_file_path.read_text()
    stage_logger.log_input({
        "text_length": len(raw_cfp_text),
        "full_text": raw_cfp_text  # COMPLETE TEXT - NO TRUNCATION
    }, "Raw CFP document - COMPLETE TEXT")

    # Mock database queries
    stage_logger.log_processing("Querying database for indexed sources")
    mock_source_ids = [str(uuid4()) for _ in range(3)]
    stage_logger.log_output(mock_source_ids, "Source IDs from database")

    stage_logger.log_processing("Querying granting institutions")
    mock_organizations = [
        {"id": str(uuid4()), "full_name": "Melanoma Research Alliance", "abbreviation": "MRA"},
        {"id": str(uuid4()), "full_name": "National Institutes of Health", "abbreviation": "NIH"},
        {"id": str(uuid4()), "full_name": "National Science Foundation", "abbreviation": "NSF"},
        {"id": str(uuid4()), "full_name": "American Cancer Society", "abbreviation": "ACS"},
    ]
    stage_logger.log_output(mock_organizations, "ALL Granting institutions")

    # Mock API call to extract CFP data
    api_payload = {
        "source_ids": mock_source_ids,
        "organization_mapping": {org["id"]: {"full_name": org["full_name"], "abbreviation": org["abbreviation"]} for org in mock_organizations},
        "processing_options": {
            "extract_eligibility": True,
            "extract_deadlines": True,
            "extract_requirements": True,
            "extract_funding_amounts": True
        }
    }
    stage_logger.log_api_call("extract_cfp_data", api_payload)

    # Mock extraction result - COMPLETE DATA
    extraction_result = {
        "organization_id": mock_organizations[0]["id"],
        "submission_date": "2024-03-15",
        "cfp_subject": "Melanoma Research Alliance Request for Proposals - Pre-clinical, translational, and early clinical research with the potential to produce unusually high impact, near-term advancements in melanoma prevention, detection, diagnosis, and treatment",
        "cfp_description": "This comprehensive RFP supports various award mechanisms including Team Science Awards, Young Investigator Awards, Pilot Awards, Dermatology Career Development Awards, and Special Opportunity Awards across multiple specialized areas of melanoma research.",
        "funding_details": {
            "team_science_awards": {
                "amount_per_year": 300000,
                "total_amount": 900000,
                "duration_years": 3,
                "requirements": ["Multidisciplinary team", "Administrative PI", "Young Investigator component"]
            },
            "young_investigator_awards": {
                "amount_per_year": 85000,
                "total_amount": 255000,
                "duration_years": 3,
                "requirements": ["First 5 years of faculty appointment", "Independent research program", "Mentorship"]
            },
            "pilot_awards": {
                "amount_per_year": 50000,
                "total_amount": 100000,
                "duration_years": 2,
                "requirements": ["Senior investigator", "Potentially transformative ideas", "Clear hypothesis"]
            },
            "dermatology_career_development": {
                "amount_per_year": 85000,
                "total_amount": 170000,
                "duration_years": 2,
                "requirements": ["Dermatology department", "Early career", "Prevention/detection focus"]
            }
        },
        "content": [
            {
                "title": "Team Science Awards",
                "subtitles": [
                    "Multidisciplinary collaborative research process",
                    "Administrative PI responsible for leadership",
                    "Young Investigator component mandatory",
                    "Transformational melanoma research advances",
                    "Rapid clinical translation potential"
                ],
                "detailed_requirements": [
                    "Must consist of two or more established Principal Investigators",
                    "One designated Administrative PI for administrative leadership",
                    "Young Investigator with complementary expertise required",
                    "Mentor for Young Investigator must be designated",
                    "Administrative PI must be past initial 5 years of first academic appointment",
                    "All PIs share authority for scientific leadership"
                ]
            },
            {
                "title": "Young Investigator Awards",
                "subtitles": [
                    "Early career faculty attraction program",
                    "Independent research program development",
                    "Mentorship commitment mandatory",
                    "Original ideas in melanoma field",
                    "Next generation research leaders"
                ],
                "detailed_requirements": [
                    "Within first 5 years of first independent faculty appointment",
                    "Assistant Professor level or equivalent position",
                    "At least one Mentor who is established investigator",
                    "Mentor must be at same institution",
                    "Melanoma research expertise in mentor strongly advised",
                    "Independent full-time faculty position confirmed"
                ]
            },
            {
                "title": "Dermatology Career Development Awards",
                "subtitles": [
                    "Clinical instructors and assistant professors",
                    "Melanoma prevention and early detection focus",
                    "Practice changing demonstration projects",
                    "Epidemiological data gaps addressing",
                    "Artificial intelligence applications encouraged"
                ],
                "detailed_requirements": [
                    "Doctoral degree (M.D., D.O., Ph.D.) required by award activation",
                    "Research conducted preferably in Dermatology Department/Division",
                    "Early career investigators (clinical instructors/new assistant professors)",
                    "Board eligible/certified in relevant specialties for fellowship applicants",
                    "Within first 5 years of independent faculty appointment",
                    "Mentor with dermatology expertise strongly advised"
                ]
            },
            {
                "title": "Special Opportunity Awards",
                "subtitles": [
                    "Acral melanoma research priority",
                    "Brain metastasis investigation focus",
                    "Dermatology technologies advancement",
                    "Immunology research applications",
                    "Radiation oncology improvements",
                    "Uveal melanoma treatment development"
                ],
                "detailed_requirements": [
                    "Acral melanoma: Focus on NF1 loss, CRKL/GAB2 amplification, TERT alterations",
                    "Brain metastasis: Treatment strategies, clinical trial inclusion, prevention",
                    "Dermatology technologies: AI/ML approaches, equitable detection methods",
                    "Immunology: Bristol Myers Squibb supported, preliminary data required",
                    "Radiation oncology: ASTRO partnership, 50% effort on melanoma",
                    "Geographic restrictions apply for some opportunities"
                ]
            }
        ],
        "eligibility_criteria": {
            "general": [
                "Full-time faculty appointment at Assistant Professor level or above",
                "Academic or non-profit research institution (within or outside US)",
                "Clear evidence of independent research program",
                "Environment capable of high-quality melanoma research"
            ],
            "restrictions": [
                "One proposal per PI across all award mechanisms per cycle",
                "Mentors for YI/Dermatology awards may serve as separate PI",
                "ASTRO-MRA award limited to US applicants only",
                "UK/Israel special opportunity limited to respective countries"
            ]
        },
        "application_deadlines": {
            "letter_of_intent_due": "2024-02-01",
            "full_application_due": "2024-03-15",
            "review_period": "2024-04-01 to 2024-05-15",
            "award_notification": "2024-06-01",
            "award_activation": "2024-06-01"
        }
    }

    stage_logger.log_api_response("extract_cfp_data", extraction_result)

    # Process organization match
    stage_logger.log_processing("Matching organization from extraction result")
    matched_org = next((org for org in mock_organizations if org["id"] == extraction_result["organization_id"]), None)
    stage_logger.log_output(matched_org, "Matched organization details")

    result = {
        "extracted_data": extraction_result,
        "organization": {
            "organization_id": matched_org["id"],
            "full_name": matched_org["full_name"],
            "abbreviation": matched_org["abbreviation"]
        } if matched_org else None,
        "processing_metadata": {
            "extraction_timestamp": "2024-01-15T10:30:00Z",
            "processing_time_ms": 2847,
            "content_sections_found": len(extraction_result["content"]),
            "total_requirements_extracted": sum(len(section["detailed_requirements"]) for section in extraction_result["content"])
        }
    }

    stage_logger.log_output(result, "CFP extraction stage COMPLETE")
    return result

async def mock_template_generation_stage(extracted_cfp):
    """Mock the template generation stage with COMPLETE logging"""
    stage_logger = DetailedLogger("TEMPLATE_GENERATION")

    stage_logger.log_input(extracted_cfp, "CFP data for template generation")

    # Generate templates for each award mechanism
    templates = []
    cfp_data = extracted_cfp["extracted_data"]

    for award_type, funding_info in cfp_data["funding_details"].items():
        stage_logger.log_processing(f"Generating template for {award_type}")

        # Find corresponding content section
        content_section = next((section for section in cfp_data["content"]
                              if award_type.replace("_", " ").title().replace(" ", "") in section["title"].replace(" ", "")), None)

        template = {
            "template_id": str(uuid4()),
            "award_mechanism": award_type,
            "organization": extracted_cfp["organization"]["full_name"],
            "title": f"{extracted_cfp['organization']['abbreviation']} - {award_type.replace('_', ' ').title()}",
            "funding_details": funding_info,
            "sections": []
        }

        # Generate standard sections based on award type
        if award_type == "team_science_awards":
            template["sections"] = [
                {
                    "section_id": str(uuid4()),
                    "title": "Research Plan",
                    "word_limit": 5000,
                    "requirements": [
                        "Describe multidisciplinary approach",
                        "Detail collaborative framework",
                        "Explain transformational potential"
                    ]
                },
                {
                    "section_id": str(uuid4()),
                    "title": "Team Composition",
                    "word_limit": 2000,
                    "requirements": [
                        "Administrative PI qualifications",
                        "Young Investigator details",
                        "Team expertise complementarity"
                    ]
                },
                {
                    "section_id": str(uuid4()),
                    "title": "Budget and Justification",
                    "word_limit": 1500,
                    "requirements": [
                        f"Total budget: ${funding_info['total_amount']:,}",
                        f"Annual budget: ${funding_info['amount_per_year']:,}",
                        f"Duration: {funding_info['duration_years']} years"
                    ]
                }
            ]
        elif award_type == "young_investigator_awards":
            template["sections"] = [
                {
                    "section_id": str(uuid4()),
                    "title": "Research Proposal",
                    "word_limit": 4000,
                    "requirements": [
                        "Original research ideas",
                        "Melanoma relevance",
                        "Innovation and impact"
                    ]
                },
                {
                    "section_id": str(uuid4()),
                    "title": "Career Development Plan",
                    "word_limit": 2000,
                    "requirements": [
                        "Training objectives",
                        "Mentorship arrangement",
                        "Career trajectory"
                    ]
                },
                {
                    "section_id": str(uuid4()),
                    "title": "Mentorship Statement",
                    "word_limit": 1000,
                    "requirements": [
                        "Mentor qualifications",
                        "Mentoring plan",
                        "Research environment"
                    ]
                }
            ]
        elif award_type == "pilot_awards":
            template["sections"] = [
                {
                    "section_id": str(uuid4()),
                    "title": "Hypothesis and Aims",
                    "word_limit": 2000,
                    "requirements": [
                        "Clear hypothesis statement",
                        "Specific aims",
                        "Transformative potential"
                    ]
                },
                {
                    "section_id": str(uuid4()),
                    "title": "Preliminary Data",
                    "word_limit": 2000,
                    "requirements": [
                        "Supporting evidence",
                        "Feasibility demonstration",
                        "Proof of concept"
                    ]
                }
            ]
        elif award_type == "dermatology_career_development":
            template["sections"] = [
                {
                    "section_id": str(uuid4()),
                    "title": "Prevention/Detection Research Plan",
                    "word_limit": 3500,
                    "requirements": [
                        "Prevention focus",
                        "Early detection methods",
                        "Clinical applications"
                    ]
                },
                {
                    "section_id": str(uuid4()),
                    "title": "Career Development Strategy",
                    "word_limit": 1500,
                    "requirements": [
                        "Dermatology expertise development",
                        "Research skill acquisition",
                        "Professional growth plan"
                    ]
                }
            ]

        # Add common sections for all templates
        template["sections"].extend([
            {
                "section_id": str(uuid4()),
                "title": "Bibliography",
                "word_limit": None,
                "requirements": [
                    "Relevant literature citations",
                    "Standard citation format",
                    "Recent publications preferred"
                ]
            },
            {
                "section_id": str(uuid4()),
                "title": "Appendices",
                "word_limit": None,
                "requirements": [
                    "Supporting documents",
                    "Supplementary data",
                    "Additional materials"
                ]
            }
        ])

        templates.append(template)
        stage_logger.log_output(template, f"Generated template for {award_type}")

    result = {
        "templates_created": templates,
        "generation_metadata": {
            "total_templates": len(templates),
            "generation_timestamp": "2024-01-15T10:45:00Z",
            "processing_time_ms": 1547,
            "total_sections": sum(len(t["sections"]) for t in templates)
        }
    }

    stage_logger.log_output(result, "Template generation stage COMPLETE")
    return result

async def main():
    """Run the comprehensive CFP processing pipeline test with FULL OUTPUT - SHOWING TEMPLATES"""
    logger.info("🚀 Starting Comprehensive CFP Processing Pipeline Test - TEMPLATE GENERATION FOCUS")
    logger.info("=" * 100)

    try:
        # Stage 1: CFP Extraction - COMPLETE OUTPUT
        logger.info(f"\n{'🔄 STAGE 1: CFP EXTRACTION - COMPLETE DATA'}")
        logger.info("-" * 60)
        extracted_cfp = await mock_cfp_extraction_stage()

        # Stage 2: Template Generation - NEW STAGE
        logger.info(f"\n{'🔄 STAGE 2: TEMPLATE GENERATION - COMPLETE TEMPLATES'}")
        logger.info("-" * 60)
        template_results = await mock_template_generation_stage(extracted_cfp)

        logger.info("\n" + "=" * 100)
        logger.info("✅ PIPELINE COMPLETE - TEMPLATES GENERATED")
        logger.info(f"📊 CFP Data processed: {len(str(extracted_cfp))} characters")
        logger.info(f"🔍 CFP Sections found: {extracted_cfp['processing_metadata']['content_sections_found']}")
        logger.info(f"📋 CFP Requirements extracted: {extracted_cfp['processing_metadata']['total_requirements_extracted']}")
        logger.info(f"📝 Templates created: {template_results['generation_metadata']['total_templates']}")
        logger.info(f"📑 Total template sections: {template_results['generation_metadata']['total_sections']}")

        logger.info("\n🎯 FINAL TEMPLATES SUMMARY:")
        for i, template in enumerate(template_results["templates_created"], 1):
            logger.info(f"   {i}. {template['title']} ({len(template['sections'])} sections)")
            logger.info(f"      💰 Funding: ${template['funding_details']['total_amount']:,} over {template['funding_details']['duration_years']} years")

        logger.info("=" * 100)

    except Exception as e:
        logger.error(f"❌ Pipeline failed with error: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())