"""Shared fixtures for grant template E2E tests."""

from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

import pytest
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.json_objects import CFPAnalysis
from packages.db.src.tables import (
    GrantingInstitution,
    GrantingInstitutionSource,
    GrantTemplate,
    GrantTemplateSource,
    Organization,
    OrganizationUser,
    RagSource,
    TextVector,
)
from packages.shared_utils.src.serialization import deserialize
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import (
    GrantApplicationFactory,
    GrantingInstitutionFactory,
    GrantTemplateFactory,
    OrganizationFactory,
    OrganizationUserFactory,
    ProjectFactory,
    RagFileFactory,
)


@pytest.fixture
def cfp_files_dir() -> Path:
    """Directory containing CFP test files."""
    return Path("testing/test_data/sources/cfps")


@pytest.fixture
def mra_cfp_file(cfp_files_dir: Path) -> Path:
    """MRA CFP file path."""
    return cfp_files_dir / "MRA-2023-2024-RFP-Final.pdf"


@pytest.fixture
def nih_par_25_450_cfp_file(cfp_files_dir: Path) -> Path:
    """NIH PAR-25-450 CFP file path."""
    return cfp_files_dir / "PAR-25-450_ Clinical Trial Readiness for Rare Diseases, Disorders, and Syndromes (R21 Clinical Trial Not Allowed).pdf"


@pytest.fixture
def israeli_chief_scientist_cfp_file(cfp_files_dir: Path) -> Path:
    """Israeli Chief Scientist CFP file path."""
    return cfp_files_dir / "israeli_chief_scientist_cfp.html"


@pytest.fixture
def nih_tuberculosis_cfp_file(cfp_files_dir: Path) -> Path:
    """NIH Tuberculosis Research Units CFP file path."""
    return cfp_files_dir / "RFA-AI-25-027_ Tuberculosis Research Units (P01 Clinical Trial Optional).pdf"


@pytest.fixture
def nih_diabetes_cfp_file(cfp_files_dir: Path) -> Path:
    """NIH Digital Health Technology for Type 2 Diabetes CFP file path."""
    return cfp_files_dir / "RFA-DK-26-315_ Advancing Research on the Application of Digital Health Technology to the Management of Type 2 Diabetes (R01- Clinical Trail Required).pdf"


@pytest.fixture
async def test_organization(async_session_maker: async_sessionmaker[Any]) -> Organization:
    """Create test organization for CFP extraction tests."""
    async with async_session_maker() as session, session.begin():
        organization = OrganizationFactory.build()
        session.add(organization)
        await session.flush()
        await session.refresh(organization)
        return organization


@pytest.fixture
async def test_user(async_session_maker: async_sessionmaker[Any], test_organization: Organization) -> OrganizationUser:
    """Create test user for CFP extraction tests."""
    async with async_session_maker() as session, session.begin():
        user = OrganizationUserFactory.build(organization_id=test_organization.id)
        session.add(user)
        await session.flush()
        await session.refresh(user)
        return user


@pytest.fixture
async def mra_granting_institution(async_session_maker: async_sessionmaker[Any]) -> GrantingInstitution:
    """Create MRA granting institution."""
    async with async_session_maker() as session, session.begin():
        institution = GrantingInstitutionFactory.build(
            full_name="Melanoma Research Alliance",
            abbreviation="MRA",
        )
        session.add(institution)
        await session.flush()
        await session.refresh(institution)
        return institution


@pytest.fixture
async def nih_granting_institution(async_session_maker: async_sessionmaker[Any]) -> GrantingInstitution:
    """Get NIH granting institution from seeded data."""
    async with async_session_maker() as session:
        result = await session.execute(
            select(GrantingInstitution).where(GrantingInstitution.abbreviation == "NIH")
        )
        return result.scalar_one()


@pytest.fixture
async def erc_granting_institution(async_session_maker: async_sessionmaker[Any]) -> GrantingInstitution:
    """Get ERC granting institution from seeded data."""
    async with async_session_maker() as session:
        result = await session.execute(
            select(GrantingInstitution).where(GrantingInstitution.abbreviation == "ERC")
        )
        return result.scalar_one()


@pytest.fixture
async def israeli_granting_institution(async_session_maker: async_sessionmaker[Any]) -> GrantingInstitution:
    """Create Israeli Ministry of Health granting institution."""
    async with async_session_maker() as session, session.begin():
        institution = GrantingInstitutionFactory.build(
            full_name="Israeli Ministry of Health",
            abbreviation="IMOH",
        )
        session.add(institution)
        await session.flush()
        await session.refresh(institution)
        return institution


@pytest.fixture
async def nih_guideline_rag_sources(
    async_session_maker: async_sessionmaker[Any],
    nih_granting_institution: GrantingInstitution,
) -> list[RagSource]:
    """Load NIH guideline JSON and create RagSource + GrantingInstitutionSource entries."""
    guideline_file = Path("testing/test_data/fixtures/organization_files/nih/files/NIH- Instructions for Research (R).json")
    assert guideline_file.exists(), f"NIH guideline fixture not found: {guideline_file}"

    guideline_data = deserialize(guideline_file.read_bytes(), dict)
    rag_file_data = guideline_data["rag_file"]

    async with async_session_maker() as session, session.begin():
        # Create RagSource from guideline data
        rag_source = RagFileFactory.build(
            text_content=rag_file_data["text_content"],
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            filename=rag_file_data["filename"],
            mime_type=rag_file_data["mime_type"],
        )
        session.add(rag_source)
        await session.flush()

        # Link to GrantingInstitution via GrantingInstitutionSource
        granting_institution_source = GrantingInstitutionSource(
            rag_source_id=rag_source.id,
            granting_institution_id=nih_granting_institution.id,
        )
        session.add(granting_institution_source)
        await session.flush()

        # Create TextVector embeddings from guideline data
        text_vectors = []
        for vector_data in rag_file_data["text_vectors"]:
            text_vector = TextVector(
                rag_source_id=rag_source.id,
                chunk=vector_data["chunk"],
                embedding=vector_data["embedding"],
            )
            text_vectors.append(text_vector)

        session.add_all(text_vectors)
        await session.flush()
        await session.refresh(rag_source)

        return [rag_source]


@pytest.fixture
async def erc_guideline_rag_sources(
    async_session_maker: async_sessionmaker[Any],
    erc_granting_institution: GrantingInstitution,
) -> list[RagSource]:
    """Load ERC guideline JSON and create RagSource + GrantingInstitutionSource entries."""
    async with async_session_maker() as session, session.begin():

        guideline_file = Path("testing/test_data/fixtures/organization_files/erc/files/ERC- Information for Applicants PoC.json")
        assert guideline_file.exists(), f"ERC guideline fixture not found: {guideline_file}"

        guideline_data = deserialize(guideline_file.read_bytes(), dict)
        rag_file_data = guideline_data["rag_file"]

        # Create RagSource from guideline data
        rag_source = RagFileFactory.build(
            text_content=rag_file_data["text_content"],
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            filename=rag_file_data["filename"],
            mime_type=rag_file_data["mime_type"],
        )
        session.add(rag_source)
        await session.flush()

        # Link to GrantingInstitution via GrantingInstitutionSource
        granting_institution_source = GrantingInstitutionSource(
            rag_source_id=rag_source.id,
            granting_institution_id=erc_granting_institution.id,
        )
        session.add(granting_institution_source)
        await session.flush()

        # Create TextVector embeddings from guideline data
        text_vectors = []
        for vector_data in rag_file_data["text_vectors"]:
            text_vector = TextVector(
                rag_source_id=rag_source.id,
                chunk=vector_data["chunk"],
                embedding=vector_data["embedding"],
            )
            text_vectors.append(text_vector)

        session.add_all(text_vectors)
        await session.flush()
        await session.refresh(rag_source)

        return [rag_source]


@pytest.fixture
async def mra_cfp_rag_source(
    async_session_maker: async_sessionmaker[Any],
    mra_cfp_file: Path,
    mra_granting_institution: GrantingInstitution,
) -> RagSource:
    """Create MRA CFP RAG source with real content."""
    from testing import FIXTURES_FOLDER

    async with async_session_maker() as session, session.begin():
        # Use real MRA CFP content from fixtures instead of placeholder
        cfp_content_file = FIXTURES_FOLDER / "cfps" / "melanoma_alliance.md"
        assert cfp_content_file.exists(), f"MRA CFP fixture not found: {cfp_content_file}"
        cfp_content = cfp_content_file.read_text()

        rag_source = RagFileFactory.build(
            text_content=cfp_content,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            filename=mra_cfp_file.name,
            mime_type="application/pdf" if mra_cfp_file.suffix == ".pdf" else "text/html",
        )
        session.add(rag_source)
        await session.flush()
        await session.refresh(rag_source)
        return rag_source


@pytest.fixture
async def nih_par_25_450_cfp_rag_source(
    async_session_maker: async_sessionmaker[Any],
    nih_par_25_450_cfp_file: Path,
    nih_granting_institution: GrantingInstitution,
    nih_guideline_rag_sources: list[RagSource],  # Add dependency on guidelines
) -> RagSource:
    """Create NIH PAR-25-450 CFP RAG source with real content."""
    from testing import FIXTURES_FOLDER

    async with async_session_maker() as session, session.begin():
        # Use real NIH CFP content from fixtures
        cfp_content_file = FIXTURES_FOLDER / "cfps" / "nih.md"
        assert cfp_content_file.exists(), f"NIH CFP fixture not found: {cfp_content_file}"
        cfp_content = cfp_content_file.read_text()

        rag_source = RagFileFactory.build(
            text_content=cfp_content,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            filename=nih_par_25_450_cfp_file.name,
            mime_type="application/pdf",
        )
        session.add(rag_source)
        await session.flush()
        await session.refresh(rag_source)
        return rag_source


@pytest.fixture
async def israeli_chief_scientist_cfp_rag_source(
    async_session_maker: async_sessionmaker[Any],
    israeli_chief_scientist_cfp_file: Path,
    israeli_granting_institution: GrantingInstitution,
) -> RagSource:
    """Create Israeli Chief Scientist CFP RAG source with real content."""
    from testing import FIXTURES_FOLDER

    async with async_session_maker() as session, session.begin():
        # Use real Israeli CFP content from fixtures if available, otherwise use HTML file
        cfp_content_file = FIXTURES_FOLDER / "cfps" / "ics.md"
        if cfp_content_file.exists():
            cfp_content = cfp_content_file.read_text()
        else:
            # Fallback to reading the HTML file directly
            cfp_content = israeli_chief_scientist_cfp_file.read_text(encoding="utf-8")

        rag_source = RagFileFactory.build(
            text_content=cfp_content,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            filename=israeli_chief_scientist_cfp_file.name,
            mime_type="text/html",
        )
        session.add(rag_source)
        await session.flush()
        await session.refresh(rag_source)
        return rag_source


@pytest.fixture
async def nih_tuberculosis_cfp_rag_source(
    async_session_maker: async_sessionmaker[Any],
    nih_tuberculosis_cfp_file: Path,
    nih_granting_institution: GrantingInstitution,
    nih_guideline_rag_sources: list[RagSource],  # Add dependency on guidelines
) -> RagSource:
    """Create NIH Tuberculosis Research Units CFP RAG source with real content."""
    from testing import FIXTURES_FOLDER

    async with async_session_maker() as session, session.begin():
        # Use real NIH CFP content from fixtures
        cfp_content_file = FIXTURES_FOLDER / "cfps" / "nih.md"
        assert cfp_content_file.exists(), f"NIH CFP fixture not found: {cfp_content_file}"
        cfp_content = cfp_content_file.read_text()

        rag_source = RagFileFactory.build(
            text_content=cfp_content,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            filename=nih_tuberculosis_cfp_file.name,
            mime_type="application/pdf",
        )
        session.add(rag_source)
        await session.flush()
        await session.refresh(rag_source)
        return rag_source


@pytest.fixture
async def nih_diabetes_cfp_rag_source(
    async_session_maker: async_sessionmaker[Any],
    nih_diabetes_cfp_file: Path,
    nih_granting_institution: GrantingInstitution,
    nih_guideline_rag_sources: list[RagSource],  # Add dependency on guidelines
) -> RagSource:
    """Create NIH Digital Health Technology for Type 2 Diabetes CFP RAG source with real content."""
    from testing import FIXTURES_FOLDER

    async with async_session_maker() as session, session.begin():
        # Use real NIH CFP content from fixtures
        cfp_content_file = FIXTURES_FOLDER / "cfps" / "nih.md"
        assert cfp_content_file.exists(), f"NIH CFP fixture not found: {cfp_content_file}"
        cfp_content = cfp_content_file.read_text()

        rag_source = RagFileFactory.build(
            text_content=cfp_content,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
            filename=nih_diabetes_cfp_file.name,
            mime_type="application/pdf",
        )
        session.add(rag_source)
        await session.flush()
        await session.refresh(rag_source)
        return rag_source


@pytest.fixture
def organization_mapping(
    mra_granting_institution: GrantingInstitution,
    nih_granting_institution: GrantingInstitution,
    erc_granting_institution: GrantingInstitution,
    israeli_granting_institution: GrantingInstitution,
) -> dict[str, dict[str, str]]:
    """Organization mapping using actual DB UUIDs."""
    return {
        str(mra_granting_institution.id): {
            "full_name": mra_granting_institution.full_name,
            "abbreviation": mra_granting_institution.abbreviation,
        },
        str(nih_granting_institution.id): {
            "full_name": nih_granting_institution.full_name,
            "abbreviation": nih_granting_institution.abbreviation,
        },
        str(erc_granting_institution.id): {
            "full_name": erc_granting_institution.full_name,
            "abbreviation": erc_granting_institution.abbreviation,
        },
        str(israeli_granting_institution.id): {
            "full_name": israeli_granting_institution.full_name,
            "abbreviation": israeli_granting_institution.abbreviation,
        },
    }


@pytest.fixture
def mock_job_manager() -> AsyncMock:
    """Create mock job manager for CFP extraction tests."""
    mock_manager = AsyncMock()
    mock_manager.create_grant_template_job = AsyncMock()
    mock_manager.update_job_status = AsyncMock()
    mock_manager.add_notification = AsyncMock()
    mock_manager.check_if_cancelled = AsyncMock(return_value=False)
    mock_manager.handle_cancellation = AsyncMock()
    return mock_manager


@pytest.fixture
def mra_cfp_analysis_fixture() -> CFPAnalysis:
    """Load MRA CFP analysis fixture representing high-quality cfp_analysis output. ~keep"""
    fixture_file = Path("testing/test_data/fixtures/cfp_analysis/mra_2023_2024_cfp_analysis.json")
    assert fixture_file.exists(), f"MRA CFP analysis fixture not found: {fixture_file}"
    return deserialize(fixture_file.read_bytes(), CFPAnalysis)


@pytest.fixture
def nih_par_25_450_cfp_analysis_fixture() -> CFPAnalysis:
    """Load NIH PAR-25-450 CFP analysis fixture representing high-quality cfp_analysis output. ~keep"""
    fixture_file = Path("testing/test_data/fixtures/cfp_analysis/nih_par_25_450_cfp_analysis.json")
    assert fixture_file.exists(), f"NIH PAR-25-450 CFP analysis fixture not found: {fixture_file}"
    return deserialize(fixture_file.read_bytes(), CFPAnalysis)


@pytest.fixture
def expected_mra_sections(mra_cfp_analysis_fixture: CFPAnalysis) -> list[dict[str, Any]]:
    """Expected sections for MRA CFP derived from cfp_analysis fixture. ~keep

    Converts CFPContentSection format to expected test format for validation.
    """
    return [
        {
            "title": section["title"],
            "expected_subsections": section["subtitles"][:5],  # First 5 subtitles as key expectations
        }
        for section in mra_cfp_analysis_fixture["content"]
    ]


@pytest.fixture
def expected_nih_par_25_450_sections(nih_par_25_450_cfp_analysis_fixture: CFPAnalysis) -> list[dict[str, Any]]:
    """Expected sections for NIH PAR-25-450 CFP derived from cfp_analysis fixture. ~keep

    Converts CFPContentSection format to expected test format for validation.
    """
    return [
        {
            "title": section["title"],
            "expected_subsections": section["subtitles"][:5],  # First 5 subtitles as key expectations
        }
        for section in nih_par_25_450_cfp_analysis_fixture["content"]
    ]


@pytest.fixture
def expected_israeli_chief_scientist_sections() -> list[dict[str, Any]]:
    """Expected sections for Israeli Chief Scientist CFP based on manual analysis."""
    return [
        {
            "title": "Project Information",
            "expected_subsections": [
                "Project Title",
                "Principal Investigator",
                "Institution",
                "Duration",
            ],
        },
        {
            "title": "Research Plan",
            "expected_subsections": [
                "Research Objectives",
                "Background",
                "Methodology",
                "Expected Outcomes",
            ],
        },
        {
            "title": "Budget and Funding",
            "expected_subsections": [
                "Total Budget",
                "Budget Breakdown",
                "Funding Justification",
            ],
        },
        {
            "title": "Team and Collaboration",
            "expected_subsections": [
                "Research Team",
                "Institutional Support",
                "Collaboration",
            ],
        },
    ]


@pytest.fixture
def expected_nih_tuberculosis_sections() -> list[dict[str, Any]]:
    """Expected sections for NIH Tuberculosis Research Units CFP based on manual analysis."""
    return [
        {
            "title": "Research Plan",
            "expected_subsections": [
                "Specific Aims",
                "Research Strategy",
                "Approach",
                "Innovation",
            ],
        },
        {
            "title": "Multi-Component Program",
            "expected_subsections": [
                "Research Projects",
                "Core Facilities",
                "Administrative Core",
                "Integration Plan",
            ],
        },
        {
            "title": "Team and Leadership",
            "expected_subsections": [
                "Program Director",
                "Project Leaders",
                "Leadership Plan",
                "Team Science",
            ],
        },
        {
            "title": "Environment and Resources",
            "expected_subsections": [
                "Institutional Commitment",
                "Research Environment",
                "Facilities",
            ],
        },
    ]


@pytest.fixture
def expected_nih_diabetes_sections() -> list[dict[str, Any]]:
    """Expected sections for NIH Digital Health Technology for Type 2 Diabetes CFP based on manual analysis."""
    return [
        {
            "title": "Research Plan",
            "expected_subsections": [
                "Specific Aims",
                "Research Strategy",
                "Innovation",
                "Approach",
            ],
        },
        {
            "title": "Clinical Trial Components",
            "expected_subsections": [
                "Study Design",
                "Participants",
                "Intervention",
                "Outcomes",
            ],
        },
        {
            "title": "Digital Health Technology",
            "expected_subsections": [
                "Technology Description",
                "Implementation",
                "Usability",
                "Data Management",
            ],
        },
        {
            "title": "Team and Environment",
            "expected_subsections": [
                "Investigator Team",
                "Research Environment",
                "Collaboration",
            ],
        },
    ]


@pytest.fixture
async def mra_grant_template_with_rag_source(
    async_session_maker: async_sessionmaker[Any],
    mra_granting_institution: GrantingInstitution,
    test_organization: Organization,
    mra_cfp_rag_source: RagSource,
) -> GrantTemplate:
    """Create MRA grant template linked to RAG source."""
    async with async_session_maker() as session, session.begin():
        # First create a project
        project = ProjectFactory.build(organization_id=test_organization.id)
        session.add(project)
        await session.flush()

        # Then create a grant application
        grant_application = GrantApplicationFactory.build(
            title="MRA E2E Test Template",
            project_id=project.id,
        )
        session.add(grant_application)
        await session.flush()

        # Finally create the grant template
        template = GrantTemplateFactory.build(
            grant_application_id=grant_application.id,
            granting_institution_id=mra_granting_institution.id,
        )
        session.add(template)
        await session.flush()

        # Link RAG source to template
        template_source = GrantTemplateSource(
            grant_template_id=template.id,
            rag_source_id=mra_cfp_rag_source.id,
        )
        session.add(template_source)
        await session.flush()
        await session.refresh(template)
        # Note: session.begin() handles commit automatically
        return template


@pytest.fixture
async def nih_par_25_450_grant_template_with_rag_source(
    async_session_maker: async_sessionmaker[Any],
    nih_granting_institution: GrantingInstitution,
    test_organization: Organization,
    nih_par_25_450_cfp_rag_source: RagSource,
    nih_guideline_rag_sources: list[RagSource],  # Add dependency on guidelines
) -> GrantTemplate:
    """Create NIH PAR-25-450 grant template linked to RAG source."""
    async with async_session_maker() as session, session.begin():
        # First create a project
        project = ProjectFactory.build(organization_id=test_organization.id)
        session.add(project)
        await session.flush()

        # Then create a grant application
        grant_application = GrantApplicationFactory.build(
            title="NIH PAR-25-450 E2E Test Template",
            project_id=project.id,
        )
        session.add(grant_application)
        await session.flush()

        # Finally create the grant template
        template = GrantTemplateFactory.build(
            grant_application_id=grant_application.id,
            granting_institution_id=nih_granting_institution.id,
        )
        session.add(template)
        await session.flush()

        # Link RAG source to template
        template_source = GrantTemplateSource(
            grant_template_id=template.id,
            rag_source_id=nih_par_25_450_cfp_rag_source.id,
        )
        session.add(template_source)
        await session.flush()
        await session.refresh(template)
        # Note: session.begin() handles commit automatically
        return template


@pytest.fixture
async def israeli_chief_scientist_grant_template_with_rag_source(
    async_session_maker: async_sessionmaker[Any],
    israeli_granting_institution: GrantingInstitution,
    test_organization: Organization,
    israeli_chief_scientist_cfp_rag_source: RagSource,
) -> GrantTemplate:
    """Create Israeli Chief Scientist grant template linked to RAG source."""
    async with async_session_maker() as session, session.begin():
        # First create a project
        project = ProjectFactory.build(organization_id=test_organization.id)
        session.add(project)
        await session.flush()

        # Then create a grant application
        grant_application = GrantApplicationFactory.build(
            title="Israeli Chief Scientist E2E Test Template",
            project_id=project.id,
        )
        session.add(grant_application)
        await session.flush()

        # Finally create the grant template
        template = GrantTemplateFactory.build(
            grant_application_id=grant_application.id,
            granting_institution_id=israeli_granting_institution.id,
        )
        session.add(template)
        await session.flush()

        # Link RAG source to template
        template_source = GrantTemplateSource(
            grant_template_id=template.id,
            rag_source_id=israeli_chief_scientist_cfp_rag_source.id,
        )
        session.add(template_source)
        await session.flush()
        await session.refresh(template)
        # Note: session.begin() handles commit automatically
        return template


async def create_test_grant_template(
    async_session_maker: async_sessionmaker[Any],
    granting_institution: GrantingInstitution,
    organization: Organization,
    title: str,
) -> GrantTemplate:
    """Helper function to create a test grant template."""
    async with async_session_maker() as session, session.begin():
        # First create a project
        project = ProjectFactory.build(organization_id=organization.id)
        session.add(project)
        await session.flush()

        # Then create a grant application
        grant_application = GrantApplicationFactory.build(
            title=title,
            project_id=project.id,
        )
        session.add(grant_application)
        await session.flush()

        # Finally create the grant template
        template = GrantTemplateFactory.build(
            grant_application_id=grant_application.id,
            granting_institution_id=granting_institution.id,
        )
        session.add(template)
        await session.flush()
        await session.refresh(template)
        return template


# ============================================================================
# E2E Test Expectations and Validation Helpers
# ============================================================================


@pytest.fixture
def expected_nih_par_25_450_constraints() -> dict[str, dict[str, Any]]:
    """Expected constraints for NIH PAR-25-450 sections.

    Based on NIH grant application guidelines:
    - 1 page = 250 words (approximate)
    - Specific Aims: 1 page maximum
    - Research Strategy: 12 pages maximum
    - Various other section limits per NIH guidelines
    """
    return {
        "Specific Aims": {
            "length_limit": 250,  # 1 page
            "constraint_type": "page_limit",
            "source_keywords": ["one page", "1 page"],
        },
        "Research Strategy": {
            "length_limit": 3000,  # 12 pages
            "constraint_type": "page_limit",
            "source_keywords": ["12 pages", "twelve pages"],
        },
        "Significance": {
            "length_limit": 750,  # Part of Research Strategy (12 pages total)
            "constraint_type": "page_limit",
            "source_keywords": ["research strategy"],
        },
        "Innovation": {
            "length_limit": 500,  # Part of Research Strategy
            "constraint_type": "page_limit",
            "source_keywords": ["research strategy"],
        },
        "Approach": {
            "length_limit": 1750,  # Part of Research Strategy
            "constraint_type": "page_limit",
            "source_keywords": ["research strategy"],
        },
    }


@pytest.fixture
def expected_mra_constraints() -> dict[str, dict[str, Any]]:
    """Expected constraints for MRA CFP sections.

    MRA typically has fewer explicit constraints than NIH.
    """
    return {
        "Research Plan": {
            "length_limit": 1500,  # 6 pages
            "constraint_type": "page_limit",
            "source_keywords": ["6 pages", "six pages"],
        },
        "Budget Justification": {
            "length_limit": 500,  # 2 pages
            "constraint_type": "page_limit",
            "source_keywords": ["2 pages", "two pages"],
        },
    }


@pytest.fixture
def expected_nih_metadata_quality() -> dict[str, dict[str, int]]:
    """Expected metadata quality metrics for NIH sections.

    These ranges are based on typical LLM metadata generation
    for grant template sections.
    """
    return {
        "keywords_count": {"min": 3, "max": 10},
        "topics_count": {"min": 3, "max": 7},
        "search_queries_count": {"min": 3, "max": 7},
        "max_words_range": {"min": 50, "max": 3000},
    }


@pytest.fixture
def expected_mra_metadata_quality() -> dict[str, dict[str, int]]:
    """Expected metadata quality metrics for MRA sections."""
    return {
        "keywords_count": {"min": 3, "max": 10},
        "topics_count": {"min": 3, "max": 7},
        "search_queries_count": {"min": 3, "max": 7},
        "max_words_range": {"min": 50, "max": 2000},
    }


@pytest.fixture
def expected_conflict_sections() -> list[dict[str, Any]]:
    """Sections expected to have LLM vs CFP length conflicts.

    These represent cases where the CFP constraint is significantly
    different from the LLM's recommended length.
    """
    return [
        {
            "title": "Specific Aims",
            "expected_max_words_range": (200, 400),  # LLM typically recommends more
            "expected_length_limit": 250,  # CFP constraint (1 page)
            "conflict_reason": "CFP more restrictive than typical LLM recommendation",
        },
    ]


def validate_constraint_match(
    section: dict[str, Any],
    expected_constraint: dict[str, Any],
    tolerance: float = 0.15,  # 15% tolerance for conversion variations
) -> None:
    """Validate constraint matches expected values within tolerance.

    Args:
        section: ExtractedSectionDTO with constraint data
        expected_constraint: Expected constraint values
        tolerance: Allowable percentage difference (default 15%)

    Raises:
        AssertionError: If constraint doesn't match expectations
    """
    assert "length_limit" in section, f"Section missing length_limit: {section.get('title', 'Unknown')}"

    actual_limit = section["length_limit"]
    expected_limit = expected_constraint["length_limit"]

    # Allow tolerance for conversion differences (pages/chars → words)
    lower_bound = expected_limit * (1 - tolerance)
    upper_bound = expected_limit * (1 + tolerance)

    assert lower_bound <= actual_limit <= upper_bound, (
        f"Constraint mismatch for {section.get('title', 'Unknown')}: "
        f"expected {expected_limit} (±{tolerance*100}%), got {actual_limit}"
    )

    # Validate length_source is present
    assert section.get("length_source"), (
        f"Section missing length_source: {section.get('title', 'Unknown')}"
    )


def validate_metadata_quality(
    section: dict[str, Any],
    quality_metrics: dict[str, dict[str, int]],
) -> None:
    """Validate LLM metadata quality meets expected ranges.

    Args:
        section: GrantLongFormSection with metadata
        quality_metrics: Expected quality ranges for metadata fields

    Raises:
        AssertionError: If metadata quality is outside expected ranges
    """
    section_title = section.get("title", "Unknown")

    # Validate keywords
    keywords = section.get("keywords", [])
    min_keywords = quality_metrics["keywords_count"]["min"]
    max_keywords = quality_metrics["keywords_count"]["max"]
    assert min_keywords <= len(keywords) <= max_keywords, (
        f"Unexpected keyword count for {section_title}: {len(keywords)} "
        f"(expected {min_keywords}-{max_keywords})"
    )

    # Validate topics
    topics = section.get("topics", [])
    min_topics = quality_metrics["topics_count"]["min"]
    max_topics = quality_metrics["topics_count"]["max"]
    assert min_topics <= len(topics) <= max_topics, (
        f"Unexpected topic count for {section_title}: {len(topics)} "
        f"(expected {min_topics}-{max_topics})"
    )

    # Validate search_queries
    search_queries = section.get("search_queries", [])
    min_queries = quality_metrics["search_queries_count"]["min"]
    max_queries = quality_metrics["search_queries_count"]["max"]
    assert min_queries <= len(search_queries) <= max_queries, (
        f"Unexpected search_queries count for {section_title}: {len(search_queries)} "
        f"(expected {min_queries}-{max_queries})"
    )

    # Validate max_words
    max_words = section.get("max_words", 0)
    min_words = quality_metrics["max_words_range"]["min"]
    max_words_limit = quality_metrics["max_words_range"]["max"]
    assert min_words <= max_words <= max_words_limit, (
        f"Unexpected max_words for {section_title}: {max_words} "
        f"(expected {min_words}-{max_words_limit})"
    )


def validate_dual_field_preservation(
    section: dict[str, Any],
    has_cfp_constraint: bool = True,
) -> None:
    """Validate both max_words and length_limit are present when expected.

    Args:
        section: GrantLongFormSection to validate
        has_cfp_constraint: Whether section should have CFP constraint

    Raises:
        AssertionError: If required fields are missing
    """
    section_title = section.get("title", "Unknown")

    # max_words should always be present for long-form sections
    assert "max_words" in section, f"max_words missing for {section_title}"
    assert section["max_words"] > 0, f"max_words invalid for {section_title}: {section['max_words']}"

    if has_cfp_constraint:
        # When CFP specifies constraint, both fields should be present
        assert "length_limit" in section, f"length_limit missing for {section_title}"
        assert section["length_limit"], (
            f"length_limit must be truthy for {section_title}: {section.get('length_limit')}"
        )
        assert section["length_limit"] > 0, (
            f"length_limit must be positive for {section_title}: {section.get('length_limit')}"
        )
        assert section.get("length_source"), (
            f"length_source missing for {section_title}"
        )


def validate_guidelines_extraction(
    section: dict[str, Any],
    min_guidelines: int = 1,
    max_guidelines: int = 10,
) -> None:
    """Validate guideline extraction completeness and quality.

    Args:
        section: ExtractedSectionDTO or GrantLongFormSection with guidelines
        min_guidelines: Minimum expected guidelines
        max_guidelines: Maximum expected guidelines

    Raises:
        AssertionError: If guidelines don't meet expectations
    """
    section_title = section.get("title", "Unknown")

    assert "guidelines" in section, f"guidelines missing for {section_title}"
    guidelines = section["guidelines"]

    assert isinstance(guidelines, list), f"guidelines should be list for {section_title}"
    assert min_guidelines <= len(guidelines) <= max_guidelines, (
        f"Unexpected guidelines count for {section_title}: {len(guidelines)} "
        f"(expected {min_guidelines}-{max_guidelines})"
    )

    # Validate guidelines are non-empty strings
    for i, guideline in enumerate(guidelines):
        assert isinstance(guideline, str), (
            f"Guideline {i} should be string for {section_title}: {type(guideline)}"
        )
        assert len(guideline) > 0, f"Guideline {i} should not be empty for {section_title}"

    # Check for duplicates
    unique_guidelines = set(guidelines)
    assert len(unique_guidelines) == len(guidelines), (
        f"Duplicate guidelines found for {section_title}: {len(guidelines) - len(unique_guidelines)} duplicates"
    )


def validate_definition_generation(
    section: dict[str, Any],
    guidelines: list[str],
) -> None:
    """Validate definition generation quality based on guidelines.

    Rules:
    - Single guideline: definition should equal guideline
    - 2-3 guidelines: definition should use first guideline
    - 4+ guidelines: definition should include summary ("Plus X additional requirements")

    Args:
        section: ExtractedSectionDTO or GrantLongFormSection with definition
        guidelines: List of guidelines for the section

    Raises:
        AssertionError: If definition doesn't match expected pattern
    """
    section_title = section.get("title", "Unknown")

    if not guidelines:
        # No guidelines, no definition expected
        return

    assert "definition" in section, f"definition missing for {section_title}"
    definition = section["definition"]

    if len(guidelines) == 1:
        # Single guideline: definition should equal guideline
        assert definition == guidelines[0], (
            f"Definition should equal single guideline for {section_title}"
        )
    elif len(guidelines) <= 3:
        # 2-3 guidelines: definition should use first guideline
        assert definition == guidelines[0], (
            f"Definition should equal first guideline for {section_title}"
        )
    else:
        # 4+ guidelines: definition should include summary
        assert "Plus" in definition or "additional" in definition, (
            f"Definition should include summary for {section_title} with {len(guidelines)} guidelines"
        )
        assert guidelines[0] in definition, (
            f"Definition should include first guideline for {section_title}"
        )
