from unittest.mock import patch

from services.backend.tests.conftest import TestingClientType


async def test_convert_file_pdf(test_client: TestingClientType) -> None:
    """Test converting HTML to PDF format."""
    response = await test_client.post(
        "/files/convert",
        headers={"Authorization": "Bearer test-token"},
        json={
            "html_content": "<html><body><h1>Test Document</h1><p>This is a test.</p></body></html>",
            "output_format": "pdf",
            "filename": "test_document.pdf",
        },
    )

    assert response.status_code == 201
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == 'attachment; filename="test_document.pdf"'
    assert len(response.content) > 0


async def test_convert_file_docx(test_client: TestingClientType) -> None:
    """Test converting HTML to DOCX format."""
    response = await test_client.post(
        "/files/convert",
        headers={"Authorization": "Bearer test-token"},
        json={
            "html_content": "<html><body><h1>Test Document</h1><p>This is a test.</p></body></html>",
            "output_format": "docx",
            "filename": "test_document.docx",
        },
    )

    assert response.status_code == 201
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert response.headers["content-disposition"] == 'attachment; filename="test_document.docx"'
    assert len(response.content) > 0


async def test_convert_file_empty_html(test_client: TestingClientType) -> None:
    """Test converting empty HTML content."""
    response = await test_client.post(
        "/files/convert",
        headers={"Authorization": "Bearer test-token"},
        json={
            "html_content": "",
            "output_format": "pdf",
            "filename": "test.pdf",
        },
    )

    assert response.status_code == 400
    data = response.json()
    assert "HTML content cannot be empty" in data["detail"]


async def test_convert_file_unauthenticated(test_client: TestingClientType) -> None:
    """Test unauthenticated api call"""
    response = await test_client.post(
        "/files/convert",
        json={
            "html_content": "<h1>Grantflow</h1>",
            "output_format": "pdf",
            "filename": "test.pdf",
        },
    )

    assert response.status_code == 401


async def test_convert_file_filename_without_extension(test_client: TestingClientType) -> None:
    """Test converting with filename that doesn't have the correct extension."""
    response = await test_client.post(
        "/files/convert",
        headers={"Authorization": "Bearer test-token"},
        json={
            "html_content": "<html><body><h1>Test</h1></body></html>",
            "output_format": "docx",
            "filename": "test_document",
        },
    )

    assert response.status_code == 201
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert response.headers["content-disposition"] == 'attachment; filename="test_document.docx"'


async def test_convert_file_pdf_memory_error(test_client: TestingClientType) -> None:
    """Test PDF conversion with memory error."""
    with patch("services.backend.src.api.routes.files.html_to_pdf") as mock_html_to_pdf:
        mock_html_to_pdf.side_effect = MemoryError("Out of memory")

        response = await test_client.post(
            "/files/convert",
            headers={"Authorization": "Bearer test-token"},
            json={
                "html_content": "<html><body><h1>Test Document</h1></body></html>",
                "output_format": "pdf",
                "filename": "test_document.pdf",
            },
        )

        assert response.status_code == 500
        data = response.json()
        assert "Failed to convert file to pdf" in data["detail"]


async def test_convert_file_invalid_output_format(test_client: TestingClientType) -> None:
    """Test with invalid output format."""
    response = await test_client.post(
        "/files/convert",
        headers={"Authorization": "Bearer test-token"},
        json={
            "html_content": "<html><body><h1>Test Document</h1></body></html>",
            "output_format": "invalid_format",
            "filename": "test_document.invalid",
        },
    )

    assert response.status_code == 400
    data = response.json()
    assert "Validation failed" in data["detail"]


async def test_convert_file_missing_required_fields(test_client: TestingClientType) -> None:
    """Test with missing required fields."""
    response = await test_client.post(
        "/files/convert",
        headers={"Authorization": "Bearer test-token"},
        json={
            "html_content": "<html><body><h1>Test Document</h1></body></html>",
        },
    )

    assert response.status_code == 400  # Validation error
