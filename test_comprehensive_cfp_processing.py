#!/usr/bin/env python3
"""
Comprehensive CFP Processing Pipeline Test

This test demonstrates the full CFP processing flow using the melanoma alliance data,
with detailed logging of all inputs, outputs, and processing stages.
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
    """Helper class for detailed stage logging"""

    def __init__(self, stage_name: str):
        self.stage_name = stage_name

    def log_input(self, data: any, description: str = "Input data"):
        logger.info(f"🔵 [{self.stage_name}] INPUT - {description}")
        if isinstance(data, (dict, list)):
            logger.info(f"📄 Data: {json.dumps(data, indent=2, default=str)[:500]}...")
        else:
            logger.info(f"📄 Data: {str(data)[:500]}...")

    def log_processing(self, message: str):
        logger.info(f"⚙️ [{self.stage_name}] PROCESSING - {message}")

    def log_api_call(self, api_name: str, payload: any = None):
        logger.info(f"🌐 [{self.stage_name}] API CALL - {api_name}")
        if payload:
            logger.info(f"📤 Payload: {json.dumps(payload, indent=2, default=str)[:300]}...")

    def log_api_response(self, api_name: str, response: any):
        logger.info(f"📨 [{self.stage_name}] API RESPONSE - {api_name}")
        if isinstance(response, (dict, list)):
            logger.info(f"📥 Response: {json.dumps(response, indent=2, default=str)[:500]}...")
        else:
            logger.info(f"📥 Response: {str(response)[:500]}...")

    def log_nlp_processing(self, operation: str, input_text: str, output: any):
        logger.info(f"🧠 [{self.stage_name}] NLP - {operation}")
        logger.info(f"📝 Input text: {input_text[:200]}...")
        logger.info(f"🔍 Output: {json.dumps(output, indent=2, default=str)[:300]}...")

    def log_output(self, data: any, description: str = "Output data"):
        logger.info(f"🟢 [{self.stage_name}] OUTPUT - {description}")
        if isinstance(data, (dict, list)):
            logger.info(f"📋 Result: {json.dumps(data, indent=2, default=str)[:500]}...")
        else:
            logger.info(f"📋 Result: {str(data)[:500]}...")

    def log_error(self, error: str):
        logger.error(f"❌ [{self.stage_name}] ERROR - {error}")

async def mock_cfp_extraction_stage():
    """Mock the CFP extraction stage with detailed logging"""
    stage_logger = DetailedLogger("CFP_EXTRACTION")

    # Load raw melanoma alliance data
    cfp_file_path = Path("/Users/yiftachashkenazi/monorepo/testing/test_data/fixtures/cfps/melanoma_alliance.md")

    stage_logger.log_processing("Loading raw CFP document")
    raw_cfp_text = cfp_file_path.read_text()
    stage_logger.log_input({"text_length": len(raw_cfp_text), "preview": raw_cfp_text[:200]}, "Raw CFP document")

    # Mock database queries
    stage_logger.log_processing("Querying database for indexed sources")
    mock_source_ids = [str(uuid4()) for _ in range(3)]
    stage_logger.log_output(mock_source_ids, "Source IDs from database")

    stage_logger.log_processing("Querying granting institutions")
    mock_organizations = [
        {"id": str(uuid4()), "full_name": "Melanoma Research Alliance", "abbreviation": "MRA"},
        {"id": str(uuid4()), "full_name": "National Institutes of Health", "abbreviation": "NIH"},
    ]
    stage_logger.log_output(mock_organizations, "Granting institutions")

    # Mock API call to extract CFP data
    stage_logger.log_api_call("extract_cfp_data", {
        "source_ids": mock_source_ids,
        "organization_mapping": {org["id"]: {"full_name": org["full_name"], "abbreviation": org["abbreviation"]} for org in mock_organizations}
    })

    # Mock extraction result
    extraction_result = {
        "organization_id": mock_organizations[0]["id"],
        "submission_date": "2024-03-15",
        "cfp_subject": "Melanoma Research Alliance Request for Proposals - Pre-clinical, translational, and early clinical research",
        "content": [
            {
                "title": "Team Science Awards",
                "subtitles": ["Multidisciplinary collaborative research", "Administrative PI required", "Young Investigator component"]
            },
            {
                "title": "Young Investigator Awards",
                "subtitles": ["Early career faculty", "Independent research program", "Mentorship required"]
            },
            {
                "title": "Dermatology Career Development Awards",
                "subtitles": ["Clinical instructors", "Assistant professors", "Melanoma prevention and detection"]
            },
            {
                "title": "Special Opportunity Awards",
                "subtitles": ["Acral melanoma", "Brain metastasis", "Dermatology technologies", "Immunology"]
            }
        ]
    }

    stage_logger.log_api_response("extract_cfp_data", extraction_result)

    # Process organization match
    stage_logger.log_processing("Matching organization from extraction result")
    matched_org = next((org for org in mock_organizations if org["id"] == extraction_result["organization_id"]), None)
    stage_logger.log_output(matched_org, "Matched organization")

    result = {
        "extracted_data": extraction_result,
        "organization": {
            "organization_id": matched_org["id"],
            "full_name": matched_org["full_name"],
            "abbreviation": matched_org["abbreviation"]
        } if matched_org else None
    }

    stage_logger.log_output(result, "CFP extraction stage complete")
    return result

async def mock_cfp_analysis_stage(extracted_cfp):
    """Mock the CFP analysis stage with detailed logging"""
    stage_logger = DetailedLogger("CFP_ANALYSIS")

    stage_logger.log_input(extracted_cfp, "Extracted CFP data")

    # Prepare full CFP text for analysis
    full_cfp_text = "\n".join([
        f"{content['title']}: {' '.join(content['subtitles'])}"
        for content in extracted_cfp["extracted_data"]["content"]
    ])

    stage_logger.log_processing("Preparing text for NLP analysis")
    stage_logger.log_input({"text_length": len(full_cfp_text), "text": full_cfp_text}, "Full CFP text for analysis")

    # Mock API call to analyze CFP
    stage_logger.log_api_call("analyze_cfp", {"full_cfp_text": full_cfp_text})

    # Mock NLP processing stages
    stage_logger.log_nlp_processing("Sentence tokenization", full_cfp_text, {"sentence_count": 45})
    stage_logger.log_nlp_processing("Entity recognition", full_cfp_text, {
        "entities": ["Melanoma Research Alliance", "Assistant Professor", "Young Investigator", "Team Science"]
    })
    stage_logger.log_nlp_processing("Category classification", full_cfp_text, {
        "categories": ["eligibility", "requirements", "funding", "deadlines"]
    })

    # Mock analysis result
    analysis_results = {
        "disciplines": [
            {"name": "Oncology", "confidence": 0.95},
            {"name": "Immunology", "confidence": 0.88},
            {"name": "Dermatology", "confidence": 0.92},
            {"name": "Clinical Research", "confidence": 0.85}
        ],
        "analysis_metadata": {
            "categories_found": ["eligibility", "funding_mechanisms", "research_areas", "deadlines"],
            "total_sentences": 45,
            "processing_time_ms": 1250
        },
        "requirements_analysis": {
            "career_stage": ["Early career faculty", "Assistant Professor", "Junior Faculty"],
            "research_focus": ["Melanoma prevention", "Detection", "Treatment", "Translational research"],
            "collaboration_required": True,
            "mentorship_required": True
        }
    }

    stage_logger.log_api_response("analyze_cfp", analysis_results)

    result = {
        "organization": extracted_cfp["organization"],
        "extracted_data": extracted_cfp["extracted_data"],
        "analysis_results": analysis_results
    }

    stage_logger.log_output(result, "CFP analysis stage complete")
    return result

async def mock_section_extraction_stage(analysis_result):
    """Mock the section extraction stage with detailed logging"""
    stage_logger = DetailedLogger("SECTION_EXTRACTION")

    stage_logger.log_input(analysis_result, "CFP analysis result")

    # Mock API call for section extraction
    stage_logger.log_api_call("extract_sections", {
        "cfp_content": analysis_result["extracted_data"]["content"],
        "cfp_subject": analysis_result["extracted_data"]["cfp_subject"],
        "organization": analysis_result["organization"]
    })

    # Mock NLP processing for section identification
    stage_logger.log_nlp_processing("Section boundary detection",
                                   str(analysis_result["extracted_data"]["content"]),
                                   {"detected_sections": 8})

    stage_logger.log_nlp_processing("Section classification",
                                   "Team Science Awards, Young Investigator Awards...",
                                   {"section_types": ["funding_mechanism", "eligibility", "requirements"]})

    # Mock extracted sections
    extracted_sections = [
        {
            "id": str(uuid4()),
            "order": 1,
            "title": "Project Summary",
            "is_title_only": False,
            "is_clinical_trial": False,
            "is_detailed_research_plan": False,
            "parent_id": None
        },
        {
            "id": str(uuid4()),
            "order": 2,
            "title": "Specific Aims",
            "is_title_only": False,
            "is_clinical_trial": False,
            "is_detailed_research_plan": True,
            "parent_id": None
        },
        {
            "id": str(uuid4()),
            "order": 3,
            "title": "Research Strategy",
            "is_title_only": True,
            "parent_id": None
        },
        {
            "id": str(uuid4()),
            "order": 4,
            "title": "Significance",
            "is_title_only": False,
            "is_clinical_trial": False,
            "is_detailed_research_plan": True,
            "parent_id": str(uuid4())  # child of Research Strategy
        },
        {
            "id": str(uuid4()),
            "order": 5,
            "title": "Innovation",
            "is_title_only": False,
            "is_clinical_trial": False,
            "is_detailed_research_plan": True,
            "parent_id": str(uuid4())  # child of Research Strategy
        },
        {
            "id": str(uuid4()),
            "order": 6,
            "title": "Approach",
            "is_title_only": False,
            "is_clinical_trial": True,
            "is_detailed_research_plan": True,
            "parent_id": str(uuid4())  # child of Research Strategy
        }
    ]

    stage_logger.log_api_response("extract_sections", {"sections_count": len(extracted_sections)})
    stage_logger.log_output(extracted_sections, "Extracted sections")

    result = {
        **analysis_result,
        "extracted_sections": extracted_sections
    }

    stage_logger.log_output(result, "Section extraction stage complete")
    return result

async def mock_metadata_generation_stage(section_extraction_result):
    """Mock the metadata generation stage with detailed logging"""
    stage_logger = DetailedLogger("METADATA_GENERATION")

    stage_logger.log_input(section_extraction_result, "Section extraction result")

    # Prepare CFP content for metadata generation
    cfp_content = "\n".join([
        f"{content['title']}: {'...'.join(content['subtitles'])}"
        for content in section_extraction_result["extracted_data"]["content"]
    ])

    stage_logger.log_processing("Preparing content for metadata generation")
    stage_logger.log_input({"cfp_content": cfp_content}, "CFP content for metadata")

    # Filter long-form sections (non-title-only)
    long_form_sections = [s for s in section_extraction_result["extracted_sections"] if not s.get("is_title_only")]
    stage_logger.log_processing(f"Processing {len(long_form_sections)} long-form sections")

    # Mock API call for metadata generation
    stage_logger.log_api_call("generate_grant_template_metadata", {
        "cfp_content": cfp_content,
        "cfp_subject": section_extraction_result["extracted_data"]["cfp_subject"],
        "long_form_sections_count": len(long_form_sections)
    })

    # Mock NLP processing for each section
    section_metadata = []
    for section in long_form_sections:
        stage_logger.log_nlp_processing(f"Metadata generation for '{section['title']}'",
                                       section['title'],
                                       {"keywords_extracted": 5, "topics_identified": 3})

        # Mock generated metadata
        metadata = {
            "id": section["id"],
            "depends_on": [],
            "generation_instructions": f"Generate a comprehensive {section['title'].lower()} section that addresses the specific requirements for melanoma research proposals, focusing on translational applications and clinical impact.",
            "keywords": ["melanoma", "translational research", "clinical impact", section['title'].lower()],
            "max_words": 500 if section.get("is_detailed_research_plan") else 250,
            "search_queries": [
                f"{section['title']} melanoma research",
                f"translational {section['title'].lower()} methodology",
                f"clinical {section['title'].lower()} best practices"
            ],
            "topics": [
                f"{section['title']} methodology",
                "Melanoma research focus",
                "Translational applications"
            ]
        }

        section_metadata.append(metadata)

    stage_logger.log_api_response("generate_grant_template_metadata", {
        "metadata_count": len(section_metadata)
    })
    stage_logger.log_output(section_metadata, "Generated section metadata")

    # Map metadata by section ID
    mapped_metadata = {metadata["id"]: metadata for metadata in section_metadata}

    # Create final grant elements
    grant_elements = []
    for section in section_extraction_result["extracted_sections"]:
        if section.get("is_title_only"):
            element = {
                "type": "GrantElement",
                "id": section["id"],
                "order": section["order"],
                "parent_id": section.get("parent_id"),
                "title": section["title"]
            }
        else:
            metadata = mapped_metadata[section["id"]]
            element = {
                "type": "GrantLongFormSection",
                "id": section["id"],
                "order": section["order"],
                "parent_id": section.get("parent_id"),
                "title": section["title"],
                "depends_on": metadata["depends_on"],
                "generation_instructions": metadata["generation_instructions"],
                "is_clinical_trial": section.get("is_clinical_trial"),
                "is_detailed_research_plan": section.get("is_detailed_research_plan"),
                "keywords": metadata["keywords"],
                "max_words": metadata["max_words"],
                "search_queries": metadata["search_queries"],
                "topics": metadata["topics"]
            }

        grant_elements.append(element)

    stage_logger.log_output(grant_elements, "Final grant template structure")
    return grant_elements

async def mock_save_grant_template(cfp_analysis, extracted_cfp, grant_sections):
    """Mock saving the grant template with detailed logging"""
    stage_logger = DetailedLogger("SAVE_TEMPLATE")

    stage_logger.log_input({
        "cfp_analysis_categories": cfp_analysis["analysis_results"]["analysis_metadata"]["categories_found"],
        "organization": extracted_cfp["organization"]["full_name"] if extracted_cfp["organization"] else None,
        "sections_count": len(grant_sections),
        "submission_date": extracted_cfp["extracted_data"]["submission_date"]
    }, "Data to save")

    # Mock database update
    stage_logger.log_processing("Updating grant template in database")

    update_values = {
        "granting_institution_id": extracted_cfp["organization"]["organization_id"] if extracted_cfp["organization"] else None,
        "submission_date": extracted_cfp["extracted_data"]["submission_date"],
        "grant_sections": grant_sections,
        "cfp_analysis": cfp_analysis["analysis_results"]
    }

    stage_logger.log_processing("Database transaction started")
    stage_logger.log_input(update_values, "Database update values")

    # Mock successful save
    saved_template = {
        "id": str(uuid4()),
        "name": "Melanoma Research Alliance Template",
        "organization": extracted_cfp["organization"]["full_name"] if extracted_cfp["organization"] else "Unknown",
        "sections_count": len(grant_sections),
        "created_at": "2024-01-15T10:30:00Z"
    }

    stage_logger.log_processing("Database transaction committed")
    stage_logger.log_output(saved_template, "Saved grant template")

    return saved_template

async def main():
    """Run the comprehensive CFP processing pipeline test"""
    logger.info("🚀 Starting Comprehensive CFP Processing Pipeline Test")
    logger.info("=" * 80)

    try:
        # Stage 1: CFP Extraction
        logger.info("\n🔄 STAGE 1: CFP EXTRACTION")
        logger.info("-" * 40)
        extracted_cfp = await mock_cfp_extraction_stage()

        # Stage 2: CFP Analysis
        logger.info("\n🔄 STAGE 2: CFP ANALYSIS")
        logger.info("-" * 40)
        cfp_analysis = await mock_cfp_analysis_stage(extracted_cfp)

        # Stage 3: Section Extraction
        logger.info("\n🔄 STAGE 3: SECTION EXTRACTION")
        logger.info("-" * 40)
        section_extraction = await mock_section_extraction_stage(cfp_analysis)

        # Stage 4: Metadata Generation
        logger.info("\n🔄 STAGE 4: METADATA GENERATION")
        logger.info("-" * 40)
        grant_sections = await mock_metadata_generation_stage(section_extraction)

        # Stage 5: Save Grant Template
        logger.info("\n🔄 STAGE 5: SAVE TEMPLATE")
        logger.info("-" * 40)
        saved_template = await mock_save_grant_template(cfp_analysis, extracted_cfp, grant_sections)

        logger.info("\n" + "=" * 80)
        logger.info("✅ PIPELINE COMPLETE - Summary:")
        logger.info(f"📄 Processed CFP: Melanoma Research Alliance")
        logger.info(f"🏢 Organization: {extracted_cfp['organization']['full_name']}")
        logger.info(f"📅 Submission Date: {extracted_cfp['extracted_data']['submission_date']}")
        logger.info(f"🔍 Categories Found: {len(cfp_analysis['analysis_results']['analysis_metadata']['categories_found'])}")
        logger.info(f"📝 Sections Generated: {len(grant_sections)}")
        logger.info(f"💾 Template ID: {saved_template['id']}")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"❌ Pipeline failed with error: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())