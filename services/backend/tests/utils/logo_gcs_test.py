from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from packages.shared_utils.src.exceptions import ValidationError

from services.backend.src.utils.logo_gcs import (
    LOGO_MIME_TYPES,
    cleanup_old_logo_formats,
    construct_logo_path,
    create_signed_logo_upload_url,
    delete_organization_logo,
    get_logo_url,
    get_max_logo_size,
    get_organization_logo_info,
    upload_organization_logo,
    validate_logo_file,
)


def test_construct_logo_path() -> None:
    org_id = uuid4()
    expected_path = f"organizations/{org_id}/logo"
    assert construct_logo_path(org_id) == expected_path


def test_get_logo_url() -> None:
    org_id = uuid4()
    file_extension = "png"

    with patch("services.backend.src.utils.logo_gcs.get_env") as mock_get_env:
        mock_get_env.side_effect = lambda key, fallback=None: {
            "ENVIRONMENT": "staging",
            "LOGO_BUCKET_NAME": "grantflow-staging-logos",
        }.get(key, fallback)

        expected_url = (
            f"https://storage.googleapis.com/grantflow-staging-logos/organizations/{org_id}/logo.{file_extension}"
        )
        assert get_logo_url(org_id, file_extension) == expected_url


def test_get_max_logo_size_default() -> None:
    with patch("services.backend.src.utils.logo_gcs.get_env") as mock_get_env:
        mock_get_env.return_value = "5"
        assert get_max_logo_size() == 5 * 1024 * 1024


def test_get_max_logo_size_custom() -> None:
    with patch("services.backend.src.utils.logo_gcs.get_env") as mock_get_env:
        mock_get_env.return_value = "10"
        assert get_max_logo_size() == 10 * 1024 * 1024


def test_validate_logo_file_success() -> None:
    file_content = b"fake png data"
    content_type = "image/png"
    validate_logo_file(file_content, content_type)


def test_validate_logo_file_invalid_mime_type() -> None:
    file_content = b"fake data"
    content_type = "application/pdf"

    with pytest.raises(ValidationError) as exc_info:
        validate_logo_file(file_content, content_type)

    assert "Unsupported logo format" in str(exc_info.value)


def test_validate_logo_file_too_large() -> None:
    with patch("services.backend.src.utils.logo_gcs.get_max_logo_size", return_value=100):
        file_content = b"x" * 101
        content_type = "image/png"

        with pytest.raises(ValidationError) as exc_info:
            validate_logo_file(file_content, content_type)

        assert "Logo file too large" in str(exc_info.value)


@pytest.mark.asyncio
async def test_upload_organization_logo_success() -> None:
    org_id = uuid4()
    file_content = b"fake png data"
    content_type = "image/png"

    mock_bucket = MagicMock()
    mock_blob = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("services.backend.src.utils.logo_gcs.run_sync") as mock_run_sync,
        patch(
            "services.backend.src.utils.logo_gcs.get_logo_bucket",
            return_value=mock_bucket,
        ),
        patch("services.backend.src.utils.logo_gcs.cleanup_old_logo_formats") as mock_cleanup,
        patch("services.backend.src.utils.logo_gcs.get_logo_url") as mock_get_url,
    ):
        mock_get_url.return_value = "https://storage.googleapis.com/bucket/path/logo.png"
        mock_run_sync.return_value = None

        result = await upload_organization_logo(org_id, file_content, content_type)

        assert result == "https://storage.googleapis.com/bucket/path/logo.png"
        mock_cleanup.assert_called_once_with(org_id, "png")
        mock_bucket.blob.assert_called_once_with(f"organizations/{org_id}/logo.png")


@pytest.mark.asyncio
async def test_cleanup_old_logo_formats() -> None:
    org_id = uuid4()
    current_extension = "png"

    mock_bucket = MagicMock()
    mock_blob = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("services.backend.src.utils.logo_gcs.run_sync") as mock_run_sync,
        patch(
            "services.backend.src.utils.logo_gcs.get_logo_bucket",
            return_value=mock_bucket,
        ),
    ):
        from google.cloud.exceptions import NotFound

        mock_run_sync.side_effect = [NotFound("not found")] * (len(LOGO_MIME_TYPES) - 1)

        await cleanup_old_logo_formats(org_id, current_extension)

        expected_calls = len(LOGO_MIME_TYPES) - 1
        assert mock_bucket.blob.call_count == expected_calls


@pytest.mark.asyncio
async def test_delete_organization_logo_success() -> None:
    org_id = uuid4()

    mock_bucket = MagicMock()
    mock_blob = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("services.backend.src.utils.logo_gcs.run_sync") as mock_run_sync,
        patch(
            "services.backend.src.utils.logo_gcs.get_logo_bucket",
            return_value=mock_bucket,
        ),
    ):
        from google.cloud.exceptions import NotFound

        mock_run_sync.side_effect = [NotFound("not found")] * len(LOGO_MIME_TYPES)

        await delete_organization_logo(org_id)

        assert mock_bucket.blob.call_count == len(LOGO_MIME_TYPES.values())


@pytest.mark.asyncio
async def test_get_organization_logo_info_exists() -> None:
    org_id = uuid4()

    mock_bucket = MagicMock()
    mock_blob = MagicMock()
    mock_blob.size = 1024
    mock_blob.content_type = "image/png"
    mock_blob.updated = None
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("services.backend.src.utils.logo_gcs.run_sync") as mock_run_sync,
        patch(
            "services.backend.src.utils.logo_gcs.get_logo_bucket",
            return_value=mock_bucket,
        ),
        patch("services.backend.src.utils.logo_gcs.get_logo_url") as mock_get_url,
    ):
        mock_get_url.return_value = "https://storage.googleapis.com/bucket/path/logo.png"
        mock_run_sync.side_effect = [
            True,
            None,
        ]

        result = await get_organization_logo_info(org_id)

        assert result is not None
        assert result["url"] == "https://storage.googleapis.com/bucket/path/logo.png"
        assert result["size"] == 1024
        assert result["content_type"] == "image/png"


@pytest.mark.asyncio
async def test_get_organization_logo_info_not_exists() -> None:
    org_id = uuid4()

    mock_bucket = MagicMock()
    mock_blob = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("services.backend.src.utils.logo_gcs.run_sync") as mock_run_sync,
        patch(
            "services.backend.src.utils.logo_gcs.get_logo_bucket",
            return_value=mock_bucket,
        ),
    ):
        mock_run_sync.return_value = False

        result = await get_organization_logo_info(org_id)

        assert result is None


@pytest.mark.asyncio
async def test_create_signed_logo_upload_url_success() -> None:
    org_id = uuid4()
    content_type = "image/png"

    mock_bucket = MagicMock()
    mock_blob = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("services.backend.src.utils.logo_gcs.run_sync") as mock_run_sync,
        patch(
            "services.backend.src.utils.logo_gcs.get_logo_bucket",
            return_value=mock_bucket,
        ),
    ):
        mock_run_sync.return_value = "https://signed-url.com"

        result = await create_signed_logo_upload_url(org_id, content_type)

        assert result == "https://signed-url.com"
        mock_bucket.blob.assert_called_once_with(f"organizations/{org_id}/logo.png")


@pytest.mark.asyncio
async def test_create_signed_logo_upload_url_invalid_mime_type() -> None:
    org_id = uuid4()
    content_type = "application/pdf"

    with pytest.raises(ValidationError) as exc_info:
        await create_signed_logo_upload_url(org_id, content_type)

    assert "Unsupported logo format" in str(exc_info.value)
