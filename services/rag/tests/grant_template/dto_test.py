from uuid import UUID, uuid4

import pytest

from services.rag.src.grant_template.dto import (
    CFPContentSection,
    ExtractedCFPData,
    OrganizationNamespace,
)


class TestCFPContentSection:
    """Test CFPContentSection TypedDict structure."""

    def test_cfp_content_section_required_fields(self) -> None:
        """Test required fields in CFPContentSection."""
        section: CFPContentSection = {
            "title": "Project Background",
            "subtitles": ["Introduction", "Problem Statement", "Literature Review"],
        }

        assert section["title"] == "Project Background"
        assert len(section["subtitles"]) == 3
        assert "Introduction" in section["subtitles"]
        assert "Problem Statement" in section["subtitles"]
        assert "Literature Review" in section["subtitles"]

    def test_cfp_content_section_empty_subtitles(self) -> None:
        """Test CFPContentSection with empty subtitles list."""
        section: CFPContentSection = {
            "title": "Simple Section",
            "subtitles": [],
        }

        assert section["title"] == "Simple Section"
        assert section["subtitles"] == []
        assert len(section["subtitles"]) == 0

    def test_cfp_content_section_single_subtitle(self) -> None:
        """Test CFPContentSection with single subtitle."""
        section: CFPContentSection = {
            "title": "Methodology",
            "subtitles": ["Research Approach"],
        }

        assert section["title"] == "Methodology"
        assert len(section["subtitles"]) == 1
        assert section["subtitles"][0] == "Research Approach"

    def test_cfp_content_section_multiple_subtitles(self) -> None:
        """Test CFPContentSection with multiple subtitles."""
        section: CFPContentSection = {
            "title": "Research Plan",
            "subtitles": [
                "Specific Aims",
                "Background and Significance",
                "Preliminary Studies",
                "Research Design and Methods",
                "Expected Outcomes",
            ],
        }

        assert section["title"] == "Research Plan"
        assert len(section["subtitles"]) == 5
        assert all(isinstance(subtitle, str) for subtitle in section["subtitles"])


class TestExtractedCFPData:
    """Test ExtractedCFPData TypedDict structure."""

    def test_extracted_cfp_data_required_fields(self) -> None:
        """Test required fields in ExtractedCFPData."""
        cfp_data: ExtractedCFPData = {
            "organization_id": "org-123",
            "cfp_subject": "Advanced Research Grant Program",
            "submission_date": "2025-03-31",
            "content": [
                {
                    "title": "Project Summary",
                    "subtitles": ["Overview", "Objectives"],
                },
                {
                    "title": "Research Plan",
                    "subtitles": ["Methods", "Timeline"],
                },
            ],
        }

        assert cfp_data["organization_id"] == "org-123"
        assert cfp_data["cfp_subject"] == "Advanced Research Grant Program"
        assert cfp_data["submission_date"] == "2025-03-31"
        assert len(cfp_data["content"]) == 2
        assert cfp_data["content"][0]["title"] == "Project Summary"
        assert cfp_data["content"][1]["title"] == "Research Plan"

    def test_extracted_cfp_data_null_organization(self) -> None:
        """Test ExtractedCFPData with null organization_id."""
        cfp_data: ExtractedCFPData = {
            "organization_id": None,
            "cfp_subject": "Generic Grant Program",
            "submission_date": "2025-12-31",
            "content": [],
        }

        assert cfp_data["organization_id"] is None
        assert cfp_data["cfp_subject"] == "Generic Grant Program"
        assert cfp_data["submission_date"] == "2025-12-31"
        assert cfp_data["content"] == []

    def test_extracted_cfp_data_null_submission_date(self) -> None:
        """Test ExtractedCFPData with null submission_date."""
        cfp_data: ExtractedCFPData = {
            "organization_id": "org-456",
            "cfp_subject": "Open-ended Grant",
            "submission_date": None,
            "content": [
                {
                    "title": "Proposal",
                    "subtitles": ["Description"],
                }
            ],
        }

        assert cfp_data["organization_id"] == "org-456"
        assert cfp_data["cfp_subject"] == "Open-ended Grant"
        assert cfp_data["submission_date"] is None
        assert len(cfp_data["content"]) == 1

    def test_extracted_cfp_data_empty_content(self) -> None:
        """Test ExtractedCFPData with empty content list."""
        cfp_data: ExtractedCFPData = {
            "organization_id": "org-789",
            "cfp_subject": "Minimal Grant",
            "submission_date": "2025-06-15",
            "content": [],
        }

        assert cfp_data["organization_id"] == "org-789"
        assert cfp_data["cfp_subject"] == "Minimal Grant"
        assert cfp_data["submission_date"] == "2025-06-15"
        assert cfp_data["content"] == []

    def test_extracted_cfp_data_with_error(self) -> None:
        """Test ExtractedCFPData with optional error field."""
        cfp_data: ExtractedCFPData = {
            "organization_id": None,
            "cfp_subject": "Failed Extraction",
            "submission_date": None,
            "content": [],
            "error": "Insufficient context to extract complete CFP data",
        }

        assert cfp_data["organization_id"] is None
        assert cfp_data["cfp_subject"] == "Failed Extraction"
        assert cfp_data["submission_date"] is None
        assert cfp_data["content"] == []
        assert cfp_data["error"] == "Insufficient context to extract complete CFP data"

    def test_extracted_cfp_data_complex_content(self) -> None:
        """Test ExtractedCFPData with complex content structure."""
        cfp_data: ExtractedCFPData = {
            "organization_id": "nih-001",
            "cfp_subject": "Multi-disciplinary Research Initiative",
            "submission_date": "2025-09-30",
            "content": [
                {
                    "title": "Project Description",
                    "subtitles": [
                        "Research Objectives",
                        "Innovation and Significance",
                        "Preliminary Studies",
                    ],
                },
                {
                    "title": "Research Plan",
                    "subtitles": [
                        "Specific Aims",
                        "Background and Significance",
                        "Research Design and Methods",
                        "Expected Outcomes",
                        "Timeline and Milestones",
                    ],
                },
                {
                    "title": "Team and Resources",
                    "subtitles": [
                        "Principal Investigator",
                        "Co-Investigators",
                        "Research Environment",
                        "Facilities and Equipment",
                    ],
                },
            ],
        }

        assert cfp_data["organization_id"] == "nih-001"
        assert cfp_data["cfp_subject"] == "Multi-disciplinary Research Initiative"
        assert cfp_data["submission_date"] == "2025-09-30"
        assert len(cfp_data["content"]) == 3

        # Verify content structure
        project_desc = cfp_data["content"][0]
        assert project_desc["title"] == "Project Description"
        assert len(project_desc["subtitles"]) == 3

        research_plan = cfp_data["content"][1]
        assert research_plan["title"] == "Research Plan"
        assert len(research_plan["subtitles"]) == 5

        team_resources = cfp_data["content"][2]
        assert team_resources["title"] == "Team and Resources"
        assert len(team_resources["subtitles"]) == 4


class TestOrganizationNamespace:
    """Test OrganizationNamespace TypedDict structure."""

    def test_organization_namespace_required_fields(self) -> None:
        """Test required fields in OrganizationNamespace."""
        org_id = uuid4()
        organization: OrganizationNamespace = {
            "full_name": "National Institutes of Health",
            "abbreviation": "NIH",
            "organization_id": org_id,
        }

        assert organization["full_name"] == "National Institutes of Health"
        assert organization["abbreviation"] == "NIH"
        assert organization["organization_id"] == org_id
        assert isinstance(organization["organization_id"], UUID)

    def test_organization_namespace_different_organizations(self) -> None:
        """Test OrganizationNamespace with different organization data."""
        nsf_id = uuid4()
        nsf: OrganizationNamespace = {
            "full_name": "National Science Foundation",
            "abbreviation": "NSF",
            "organization_id": nsf_id,
        }

        doe_id = uuid4()
        doe: OrganizationNamespace = {
            "full_name": "Department of Energy",
            "abbreviation": "DOE",
            "organization_id": doe_id,
        }

        # Verify NSF data
        assert nsf["full_name"] == "National Science Foundation"
        assert nsf["abbreviation"] == "NSF"
        assert nsf["organization_id"] == nsf_id

        # Verify DOE data
        assert doe["full_name"] == "Department of Energy"
        assert doe["abbreviation"] == "DOE"
        assert doe["organization_id"] == doe_id

        # Verify they are different
        assert nsf["organization_id"] != doe["organization_id"]
        assert nsf["full_name"] != doe["full_name"]
        assert nsf["abbreviation"] != doe["abbreviation"]

    def test_organization_namespace_uuid_validation(self) -> None:
        """Test that organization_id is properly typed as UUID."""
        org_id = uuid4()
        organization: OrganizationNamespace = {
            "full_name": "Test Organization",
            "abbreviation": "TO",
            "organization_id": org_id,
        }

        # Should be UUID type
        assert isinstance(organization["organization_id"], UUID)

        # Should have UUID string representation
        assert len(str(organization["organization_id"])) == 36
        assert "-" in str(organization["organization_id"])

    def test_organization_namespace_long_names(self) -> None:
        """Test OrganizationNamespace with long organization names."""
        org_id = uuid4()
        organization: OrganizationNamespace = {
            "full_name": "National Institute of Allergy and Infectious Diseases, National Institutes of Health",
            "abbreviation": "NIAID",
            "organization_id": org_id,
        }

        assert len(organization["full_name"]) > 50
        assert organization["abbreviation"] == "NIAID"
        assert isinstance(organization["organization_id"], UUID)

    def test_organization_namespace_minimal_abbreviation(self) -> None:
        """Test OrganizationNamespace with minimal abbreviation."""
        org_id = uuid4()
        organization: OrganizationNamespace = {
            "full_name": "Research Institute",
            "abbreviation": "RI",
            "organization_id": org_id,
        }

        assert organization["full_name"] == "Research Institute"
        assert len(organization["abbreviation"]) == 2
        assert organization["abbreviation"] == "RI"
        assert isinstance(organization["organization_id"], UUID)


class TestDTOIntegration:
    """Test integration scenarios between DTOs."""

    def test_cfp_data_with_cfp_content_sections(self) -> None:
        """Test integration between ExtractedCFPData and CFPContentSection."""
        sections: list[CFPContentSection] = [
            {
                "title": "Background",
                "subtitles": ["Context", "Problem Statement"],
            },
            {
                "title": "Methodology",
                "subtitles": ["Approach", "Timeline", "Evaluation"],
            },
        ]

        cfp_data: ExtractedCFPData = {
            "organization_id": "test-org",
            "cfp_subject": "Integration Test Grant",
            "submission_date": "2025-04-15",
            "content": sections,
        }

        # Verify the sections are properly integrated
        assert len(cfp_data["content"]) == 2
        assert cfp_data["content"][0]["title"] == "Background"
        assert cfp_data["content"][1]["title"] == "Methodology"
        assert len(cfp_data["content"][0]["subtitles"]) == 2
        assert len(cfp_data["content"][1]["subtitles"]) == 3

    def test_organization_in_cfp_context(self) -> None:
        """Test how OrganizationNamespace integrates with CFP extraction context."""
        org_id = uuid4()
        organization: OrganizationNamespace = {
            "full_name": "National Science Foundation",
            "abbreviation": "NSF",
            "organization_id": org_id,
        }

        cfp_data: ExtractedCFPData = {
            "organization_id": str(org_id),  # String representation for CFP data
            "cfp_subject": "NSF Research Grant",
            "submission_date": "2025-05-31",
            "content": [
                {
                    "title": "Project Summary",
                    "subtitles": ["Overview"],
                }
            ],
        }

        # Verify organization ID consistency
        assert cfp_data["organization_id"] == str(organization["organization_id"])
        assert UUID(cfp_data["organization_id"]) == organization["organization_id"]