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
