"""Shared fixtures for grant template E2E tests."""

import logging
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

import pytest
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import GrantTemplate, GrantingInstitution, GrantingInstitutionSource, GrantTemplateSource, Organization, OrganizationUser, RagSource, TextVector
from packages.shared_utils.src.serialization import deserialize
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import (
    GrantApplicationFactory,
    GrantTemplateFactory,
    GrantingInstitutionFactory,
    OrganizationFactory,
    OrganizationUserFactory,
    ProjectFactory,
    RagFileFactory,
    RagUrlFactory,
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
        institution = result.scalar_one()
        return institution


@pytest.fixture
async def erc_granting_institution(async_session_maker: async_sessionmaker[Any]) -> GrantingInstitution:
    """Get ERC granting institution from seeded data."""
    async with async_session_maker() as session:
        result = await session.execute(
            select(GrantingInstitution).where(GrantingInstitution.abbreviation == "ERC")
        )
        institution = result.scalar_one()
        return institution


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
            cfp_content = israeli_chief_scientist_cfp_file.read_text(encoding='utf-8')

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
def expected_mra_sections() -> list[dict[str, Any]]:
    """Expected sections for MRA CFP based on manual analysis."""
    return [
        {
            "title": "Application Requirements",
            "expected_subsections": [
                "Project Summary",
                "Research Plan",
                "Budget Justification",
                "Institutional Commitment",
            ],
        },
        {
            "title": "Research Plan",
            "expected_subsections": [
                "Specific Aims",
                "Background and Significance",
                "Preliminary Studies",
                "Research Design and Methods",
                "Timeline",
            ],
        },
        {
            "title": "Team Information",
            "expected_subsections": [
                "Principal Investigator",
                "Co-Investigators",
                "Research Team",
                "Collaboration",
            ],
        },
        {
            "title": "Budget and Resources",
            "expected_subsections": [
                "Budget Summary",
                "Budget Justification",
                "Resources and Environment",
            ],
        },
    ]


@pytest.fixture
def expected_nih_par_25_450_sections() -> list[dict[str, Any]]:
    """Expected sections for NIH PAR-25-450 CFP based on manual analysis."""
    return [
        {
            "title": "Research Plan",
            "expected_subsections": [
                "Specific Aims",
                "Research Strategy",
                "Preliminary Studies",
                "Approach",
            ],
        },
        {
            "title": "Clinical Trial Readiness",
            "expected_subsections": [
                "Regulatory Requirements",
                "Trial Design",
                "Outcome Measures",
                "Safety Considerations",
            ],
        },
        {
            "title": "Team and Environment",
            "expected_subsections": [
                "Personnel",
                "Research Environment",
                "Collaboration",
            ],
        },
        {
            "title": "Budget",
            "expected_subsections": [
                "Budget Pages",
                "Budget Justification",
            ],
        },
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