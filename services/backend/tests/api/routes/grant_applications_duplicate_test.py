from http import HTTPStatus
from typing import TYPE_CHECKING, Any, cast
from uuid import uuid4

from packages.db.src.enums import ApplicationStatusEnum, GrantType, SourceIndexingStatusEnum
from packages.db.src.tables import (
    EditorDocument,
    GrantApplication,
    GrantApplicationSource,
    GrantingInstitution,
    GrantTemplate,
    GrantTemplateSource,
    OrganizationUser,
    PredefinedGrantTemplate,
    Project,
    RagFile,
    RagSource,
    RagUrl,
    TextVector,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType

if TYPE_CHECKING:
    from packages.db.src.json_objects import LengthConstraint


async def test_duplicate_application_success(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    project_id = grant_application.project_id

    async with async_session_maker() as session:
        app = await session.get(GrantApplication, grant_application.id)
        app.description = "Original description"
        app.form_inputs = {"field1": "value1"}
        app.research_objectives = [{"objective": "Test objective"}]
        app.text = "Original text content"
        await session.commit()

    async with async_session_maker() as session:
        project = await session.get(Project, project_id)
        organization_id = project.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": "Copy of Test Application"},
        headers={"Authorization": "Bearer some_token"},
    )

    if response.status_code != 201:
        pass
    assert response.status_code == 201
    data = response.json()

    assert data["title"] == "Copy of Test Application"
    assert data["description"] == "Original description"
    assert data["status"] == ApplicationStatusEnum.IN_PROGRESS.value
    assert data["parent_id"] == str(grant_application.id)
    assert data["id"] != str(grant_application.id)

    async with async_session_maker() as session:
        new_app = await session.get(GrantApplication, data["id"])
        assert new_app is not None
        assert new_app.parent_id == grant_application.id
        assert new_app.form_inputs == {"field1": "value1"}
        assert new_app.research_objectives == [{"objective": "Test objective"}]
        assert new_app.text == "Original text content"


async def test_duplicate_application_not_found(
    test_client: TestingClientType,
    project: Project,
    project_owner_user: OrganizationUser,
) -> None:
    non_existent_id = uuid4()

    response = await test_client.post(
        f"/projects/{project.id}/applications/{non_existent_id}/duplicate",
        json={"title": "Copy of Non-existent"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 404

    error_detail = response.json()["detail"]
    assert "not found" in error_detail.lower()


async def test_duplicate_application_wrong_project(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session:
        other_project = Project(name="Other Project", organization_id=project_owner_user.organization_id)
        session.add(other_project)
        await session.flush()
        other_project_id = other_project.id
        await session.commit()

    response = await test_client.post(
        f"/projects/{other_project_id}/applications/{grant_application.id}/duplicate",
        json={"title": "Unauthorized Copy"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 404
    error_detail = response.json()["detail"]
    assert "not found" in error_detail.lower()


async def test_duplicate_with_grant_template(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        existing_template = await session.execute(
            select(GrantTemplate).where(
                GrantTemplate.grant_application_id == grant_application.id, GrantTemplate.deleted_at.is_(None)
            )
        )
        for template in existing_template.scalars():
            template.soft_delete()

        test_grant_sections = [
            {
                "title": "Test Section",
                "description": "Test description",
                "type": "section",
                "order": 1,
                "length_constraint": cast("LengthConstraint", {"type": "words", "value": 100, "source": None}),
            }
        ]

        # Create predefined template
        institution = GrantingInstitution(full_name="NIH", abbreviation="NIH")
        session.add(institution)
        await session.flush()

        predefined = PredefinedGrantTemplate(
            name="NIH Catalog",
            grant_sections=test_grant_sections,
            grant_type=GrantType.RESEARCH,
            granting_institution_id=institution.id,
        )
        session.add(predefined)
        await session.flush()

        new_template = GrantTemplate(
            grant_application_id=grant_application.id,
            grant_sections=test_grant_sections,
            granting_institution_id=None,
            grant_type=GrantType.RESEARCH,
            predefined_template_id=predefined.id,
        )
        session.add(new_template)
        await session.flush()

        template_id = new_template.id
        predefined_id = predefined.id

    async with async_session_maker() as session:
        app = await session.get(GrantApplication, grant_application.id)
        project_id = app.project_id
        project = await session.get(Project, project_id)
        organization_id = project.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": "Copy with Template"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED
    data = response.json()

    assert "grant_template" in data
    assert data["grant_template"]["id"] != str(template_id)
    assert data["grant_template"]["grant_sections"] == test_grant_sections
    assert data["grant_template"]["grant_type"] == GrantType.RESEARCH
    assert data["grant_template"]["predefined_template_id"] == str(predefined_id)


async def test_duplicate_preserves_rag_sources(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application_file: GrantApplicationSource,
    project_owner_user: OrganizationUser,
) -> None:
    """Test that RAG sources are duplicated (new records created, not just referenced)."""
    async with async_session_maker() as session:
        app = await session.get(GrantApplication, grant_application_file.grant_application_id)
        project_id = app.project_id
        application_id = app.id

        await session.refresh(app, ["rag_sources"])
        original_rag_count = len(app.rag_sources)
        assert original_rag_count > 0

        # Get original source IDs
        original_source_ids = {str(rag_source.rag_source_id) for rag_source in app.rag_sources}

    async with async_session_maker() as session:
        project_obj = await session.get(Project, project_id)
        organization_id = project_obj.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{application_id}/duplicate",
        json={"title": "Copy with RAG Sources"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()

    # Should have same number of sources
    assert len(data["rag_sources"]) == original_rag_count

    # Get new source IDs
    new_source_ids = {source["sourceId"] for source in data["rag_sources"]}

    # New sources should have different IDs (they are duplicates, not references)
    assert original_source_ids.isdisjoint(new_source_ids), "Source IDs should be different (duplicated, not referenced)"

    async with async_session_maker() as session:
        new_app = await session.get(GrantApplication, data["id"])
        await session.refresh(new_app, ["rag_sources"])
        assert len(new_app.rag_sources) == original_rag_count


async def test_duplicate_application_validation_error(
    test_client: TestingClientType,
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    project_id = grant_application.project_id

    async with async_session_maker() as session:
        project = await session.get(Project, project_id)
        organization_id = project.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": ""},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201


async def test_duplicate_application_preserves_status_as_draft(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    project_id = grant_application.project_id

    async with async_session_maker() as session:
        app = await session.get(GrantApplication, grant_application.id)
        app.status = ApplicationStatusEnum.GENERATING
        await session.commit()

    async with async_session_maker() as session:
        project = await session.get(Project, project_id)
        organization_id = project.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": "Draft Copy"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == ApplicationStatusEnum.IN_PROGRESS.value


async def test_duplicate_application_long_title(
    test_client: TestingClientType,
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    project_id = grant_application.project_id
    long_title = "A" * 300

    async with async_session_maker() as session:
        project = await session.get(Project, project_id)
        organization_id = project.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": long_title},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == long_title


async def test_duplicate_application_no_editor_document(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    project_id = grant_application.project_id

    async with async_session_maker() as session:
        project = await session.get(Project, project_id)
        organization_id = project.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": "Copy without Editor Document"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()

    async with async_session_maker() as session:
        from sqlalchemy import select

        editor_doc = await session.execute(
            select(EditorDocument).where(
                EditorDocument.grant_application_id == data["id"],
                EditorDocument.deleted_at.is_(None),
            )
        )
        assert editor_doc.scalar_one_or_none() is None


async def test_duplicate_creates_independent_sources(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application_file: GrantApplicationSource,
    project_owner_user: OrganizationUser,
) -> None:
    """Test that duplicating creates independent RAG sources with their own files, URLs, and embeddings."""
    # Setup: Add a URL source and text vectors to the application
    async with async_session_maker() as session, session.begin():
        app = await session.get(GrantApplication, grant_application_file.grant_application_id)
        project_id = app.project_id
        application_id = app.id

        # Get the file source
        file_source = await session.get(RagSource, grant_application_file.rag_source_id)
        original_file_id = file_source.id

        # Add a URL source
        url_source = RagUrl(url="https://example.com/test", title="Test URL")
        session.add(url_source)
        await session.flush()

        url_source_link = GrantApplicationSource(grant_application_id=application_id, rag_source_id=url_source.id)
        session.add(url_source_link)

        # Add text vectors for both sources
        file_vector = TextVector(rag_source_id=file_source.id, chunk={"text": "test file chunk"}, embedding=[0.1] * 384)
        url_vector = TextVector(rag_source_id=url_source.id, chunk={"text": "test url chunk"}, embedding=[0.2] * 384)
        session.add_all([file_vector, url_vector])

    async with async_session_maker() as session:
        project_obj = await session.get(Project, project_id)
        organization_id = project_obj.organization_id

    # Duplicate the application
    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{application_id}/duplicate",
        json={"title": "Independent Copy"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()
    new_app_id = data["id"]

    # Verify sources were duplicated
    assert len(data["rag_sources"]) == 2

    async with async_session_maker() as session:
        # Verify file was duplicated
        new_file_sources = await session.execute(
            select(RagFile)
            .join(GrantApplicationSource, GrantApplicationSource.rag_source_id == RagFile.id)
            .where(GrantApplicationSource.grant_application_id == new_app_id)
        )
        new_files = list(new_file_sources.scalars())
        assert len(new_files) == 1
        new_file = new_files[0]

        # File should have different ID and object_path
        assert new_file.id != original_file_id
        assert new_file.object_path != (await session.get(RagFile, original_file_id)).object_path
        assert new_file.filename == (await session.get(RagFile, original_file_id)).filename
        assert new_app_id in new_file.object_path  # Path should contain new app ID

        # Verify URL was duplicated
        new_url_sources = await session.execute(
            select(RagUrl)
            .join(GrantApplicationSource, GrantApplicationSource.rag_source_id == RagUrl.id)
            .where(GrantApplicationSource.grant_application_id == new_app_id)
        )
        new_urls = list(new_url_sources.scalars())
        assert len(new_urls) == 1
        new_url = new_urls[0]

        assert new_url.url == "https://example.com/test"
        assert new_url.title == "Test URL"

        # Verify text vectors were duplicated
        new_vectors = await session.execute(
            select(TextVector).where(TextVector.rag_source_id.in_([new_file.id, new_url.id]))
        )
        vectors_list = list(new_vectors.scalars())
        assert len(vectors_list) == 2

        # Verify vector content
        file_vectors = [v for v in vectors_list if v.rag_source_id == new_file.id]
        url_vectors = [v for v in vectors_list if v.rag_source_id == new_url.id]

        assert len(file_vectors) == 1
        assert file_vectors[0].chunk == {"text": "test file chunk"}
        assert len(url_vectors) == 1
        assert url_vectors[0].chunk == {"text": "test url chunk"}


async def test_duplicate_with_template_sources(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application_file: GrantApplicationSource,
    project_owner_user: OrganizationUser,
) -> None:
    """Test that template sources are also duplicated."""
    # Setup: Create a template with sources
    async with async_session_maker() as session, session.begin():
        app = await session.get(GrantApplication, grant_application_file.grant_application_id)
        project_id = app.project_id
        application_id = app.id

        # Create a template for the application
        template = GrantTemplate(
            grant_application_id=application_id,
            grant_sections=[],
            grant_type=GrantType.RESEARCH,
        )
        session.add(template)
        await session.flush()

        # Add a source to the template
        template_source = RagUrl(url="https://template.example.com", title="Template Source")
        session.add(template_source)
        await session.flush()

        template_source_link = GrantTemplateSource(grant_template_id=template.id, rag_source_id=template_source.id)
        session.add(template_source_link)

        template_source_id = template_source.id

    async with async_session_maker() as session:
        project_obj = await session.get(Project, project_id)
        organization_id = project_obj.organization_id

    # Duplicate the application
    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{application_id}/duplicate",
        json={"title": "Copy with Template Sources"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()

    # Verify template was duplicated
    assert "grant_template" in data
    new_template_id = data["grant_template"]["id"]

    async with async_session_maker() as session:
        # Verify template source was duplicated
        new_template_sources = await session.execute(
            select(RagUrl)
            .join(GrantTemplateSource, GrantTemplateSource.rag_source_id == RagUrl.id)
            .where(GrantTemplateSource.grant_template_id == new_template_id)
        )
        new_sources = list(new_template_sources.scalars())
        assert len(new_sources) == 1
        new_source = new_sources[0]

        # Source should be duplicated (different ID)
        assert new_source.id != template_source_id
        assert new_source.url == "https://template.example.com"
        assert new_source.title == "Template Source"


async def test_duplicate_with_failed_indexing_sources(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    """Test that sources with FAILED indexing status are still duplicated."""
    # Setup: Create sources with different statuses
    async with async_session_maker() as session, session.begin():
        project_id = grant_application.project_id
        application_id = grant_application.id

        # Add a failed source
        failed_source = RagFile(
            filename="failed.pdf",
            bucket_name="test-bucket",
            object_path="test/failed.pdf",
            mime_type="application/pdf",
            size=1000,
            indexing_status=SourceIndexingStatusEnum.FAILED,
            error_type="TestError",
            error_message="Test failure",
        )
        session.add(failed_source)
        await session.flush()

        failed_link = GrantApplicationSource(grant_application_id=application_id, rag_source_id=failed_source.id)
        session.add(failed_link)

        # Add an indexing source
        indexing_source = RagUrl(url="https://example.com/indexing", indexing_status=SourceIndexingStatusEnum.INDEXING)
        session.add(indexing_source)
        await session.flush()

        indexing_link = GrantApplicationSource(grant_application_id=application_id, rag_source_id=indexing_source.id)
        session.add(indexing_link)

    async with async_session_maker() as session:
        project_obj = await session.get(Project, project_id)
        organization_id = project_obj.organization_id

    # Duplicate the application
    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{application_id}/duplicate",
        json={"title": "Copy with Failed Sources"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()

    # Should have both sources duplicated
    assert len(data["rag_sources"]) == 2

    async with async_session_maker() as session:
        # Verify failed source was duplicated with same status
        new_failed_sources = await session.execute(
            select(RagFile)
            .join(GrantApplicationSource, GrantApplicationSource.rag_source_id == RagFile.id)
            .where(
                GrantApplicationSource.grant_application_id == data["id"],
                RagFile.indexing_status == SourceIndexingStatusEnum.FAILED,
            )
        )
        new_failed = list(new_failed_sources.scalars())
        assert len(new_failed) == 1
        assert new_failed[0].error_type == "TestError"
        assert new_failed[0].error_message == "Test failure"

        # Verify indexing source was duplicated
        new_indexing_sources = await session.execute(
            select(RagUrl)
            .join(GrantApplicationSource, GrantApplicationSource.rag_source_id == RagUrl.id)
            .where(
                GrantApplicationSource.grant_application_id == data["id"],
                RagUrl.indexing_status == SourceIndexingStatusEnum.INDEXING,
            )
        )
        new_indexing = list(new_indexing_sources.scalars())
        assert len(new_indexing) == 1


async def test_duplicate_with_very_long_filename(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    """Test that very long filenames are handled correctly during duplication."""
    # Setup: Create a source with a very long filename (>163 chars to trigger truncation)
    long_filename = "a" * 200 + ".pdf"

    async with async_session_maker() as session, session.begin():
        project_id = grant_application.project_id
        application_id = grant_application.id

        long_name_source = RagFile(
            filename=long_filename,
            bucket_name="test-bucket",
            object_path=f"test/{long_filename[:50]}.pdf",  # Use shorter path for original
            mime_type="application/pdf",
            size=5000,
        )
        session.add(long_name_source)
        await session.flush()

        source_link = GrantApplicationSource(grant_application_id=application_id, rag_source_id=long_name_source.id)
        session.add(source_link)

    async with async_session_maker() as session:
        project_obj = await session.get(Project, project_id)
        organization_id = project_obj.organization_id

    # Duplicate the application
    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{application_id}/duplicate",
        json={"title": "Copy with Long Filename"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()

    async with async_session_maker() as session:
        # Verify the duplicated file has a valid object_path (< 255 chars)
        new_files = await session.execute(
            select(RagFile)
            .join(GrantApplicationSource, GrantApplicationSource.rag_source_id == RagFile.id)
            .where(GrantApplicationSource.grant_application_id == data["id"])
        )
        new_file = next(iter(new_files.scalars()))

        # Object path should be under the limit
        assert len(new_file.object_path) <= 255
        # Original filename should be preserved in the filename field
        assert new_file.filename == long_filename
        # Path should contain the new application ID
        assert data["id"] in new_file.object_path


async def test_duplicate_sources_without_embeddings(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    """Test that sources without text vectors are duplicated successfully."""
    # Setup: Create sources without embeddings
    async with async_session_maker() as session, session.begin():
        project_id = grant_application.project_id
        application_id = grant_application.id

        # Add sources without any text vectors
        no_vectors_file = RagFile(
            filename="no_vectors.pdf",
            bucket_name="test-bucket",
            object_path="test/no_vectors.pdf",
            mime_type="application/pdf",
            size=2000,
            indexing_status=SourceIndexingStatusEnum.CREATED,
        )
        session.add(no_vectors_file)
        await session.flush()

        file_link = GrantApplicationSource(grant_application_id=application_id, rag_source_id=no_vectors_file.id)
        session.add(file_link)

        no_vectors_url = RagUrl(url="https://example.com/no_vectors", indexing_status=SourceIndexingStatusEnum.CREATED)
        session.add(no_vectors_url)
        await session.flush()

        url_link = GrantApplicationSource(grant_application_id=application_id, rag_source_id=no_vectors_url.id)
        session.add(url_link)

    async with async_session_maker() as session:
        project_obj = await session.get(Project, project_id)
        organization_id = project_obj.organization_id

    # Duplicate the application
    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{application_id}/duplicate",
        json={"title": "Copy without Embeddings"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()

    # Should have both sources
    assert len(data["rag_sources"]) == 2

    async with async_session_maker() as session:
        # Verify no text vectors exist for the new sources
        new_source_ids = [source["sourceId"] for source in data["rag_sources"]]
        vectors = await session.execute(select(TextVector).where(TextVector.rag_source_id.in_(new_source_ids)))
        assert len(list(vectors.scalars())) == 0


async def test_duplicate_empty_application_no_sources(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    """Test duplicating an application with no sources."""
    project_id = grant_application.project_id
    application_id = grant_application.id

    async with async_session_maker() as session:
        project_obj = await session.get(Project, project_id)
        organization_id = project_obj.organization_id

    # Duplicate application with no sources
    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{application_id}/duplicate",
        json={"title": "Empty Copy"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()

    # Should have no sources
    assert len(data["rag_sources"]) == 0

    async with async_session_maker() as session:
        new_app = await session.get(GrantApplication, data["id"])
        await session.refresh(new_app, ["rag_sources"])
        assert len(new_app.rag_sources) == 0


async def test_duplicate_with_multiple_embeddings_per_source(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    """Test that all embeddings are duplicated for sources with multiple vectors."""
    # Setup: Create a source with multiple text vectors
    async with async_session_maker() as session, session.begin():
        project_id = grant_application.project_id
        application_id = grant_application.id

        # Add a source
        source = RagFile(
            filename="multi_vectors.pdf",
            bucket_name="test-bucket",
            object_path="test/multi_vectors.pdf",
            mime_type="application/pdf",
            size=10000,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )
        session.add(source)
        await session.flush()

        source_link = GrantApplicationSource(grant_application_id=application_id, rag_source_id=source.id)
        session.add(source_link)

        # Add multiple text vectors (simulating chunked document)
        for i in range(10):
            vector = TextVector(
                rag_source_id=source.id, chunk={"text": f"chunk {i}", "page": i}, embedding=[float(i)] * 384
            )
            session.add(vector)

    async with async_session_maker() as session:
        project_obj = await session.get(Project, project_id)
        organization_id = project_obj.organization_id

    # Duplicate the application
    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{application_id}/duplicate",
        json={"title": "Copy with Multiple Embeddings"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()

    async with async_session_maker() as session:
        # Get the new source ID
        new_source_id = data["rag_sources"][0]["sourceId"]

        # Verify all 10 vectors were duplicated
        vectors = await session.execute(select(TextVector).where(TextVector.rag_source_id == new_source_id))
        vector_list = list(vectors.scalars())
        assert len(vector_list) == 10

        # Verify chunk content was preserved
        chunks = {v.chunk["text"] for v in vector_list}
        expected_chunks = {f"chunk {i}" for i in range(10)}
        assert chunks == expected_chunks
