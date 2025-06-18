import os
from collections.abc import Generator
from typing import Any
from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from google.auth.credentials import AnonymousCredentials
from google.cloud import storage
from google.cloud.exceptions import ClientError
from google.cloud.storage import Bucket

from packages.shared_utils.src.constants import ONE_MINUTE_SECONDS
from packages.shared_utils.src.exceptions import ExternalOperationError, ValidationError
from packages.shared_utils.src.gcs import (
    bucket_ref,
    construct_object_uri,
    create_signed_upload_url,
    download_blob,
    get_bucket,
    get_credentials,
    get_storage_client,
    parse_object_uri,
    storage_client_ref,
    upload_blob,
)


@pytest.fixture(autouse=True)
def reset_refs() -> None:
    storage_client_ref.value = None
    bucket_ref.value = None


@pytest.fixture
def mock_env_vars() -> Generator[None]:
    with patch.dict(
        os.environ,
        {
            "GOOGLE_CLOUD_PROJECT": "test-project",
            "GCS_BUCKET_NAME": "test-bucket",
        },
    ):
        yield


@pytest.fixture
def mock_storage_client() -> MagicMock:
    return MagicMock(spec=storage.Client)


@pytest.fixture
def mock_bucket() -> MagicMock:
    mock = MagicMock(spec=Bucket)
    mock.exists.return_value = True
    return mock


def test_get_credentials_with_emulator() -> None:
    with patch.dict(os.environ, {"STORAGE_EMULATOR_HOST": "localhost:8080"}):
        credentials = get_credentials()
        assert isinstance(credentials, AnonymousCredentials)


def test_get_credentials_with_service_account(mock_env_vars: None) -> None:
    mock_credentials = {"type": "service_account", "project_id": "test-project"}

    with (
        patch("packages.shared_utils.src.gcs.get_env") as mock_get_env,
        patch("packages.shared_utils.src.gcs.deserialize") as mock_deserialize,
        patch("packages.shared_utils.src.gcs.Credentials") as mock_creds_class,
    ):
        mock_get_env.side_effect = (
            lambda key, fallback=None: ""
            if key == "STORAGE_EMULATOR_HOST"
            else "credentials_json"
        )
        mock_deserialize.return_value = mock_credentials
        mock_creds_instance = MagicMock()
        mock_creds_class.from_service_account_info.return_value = mock_creds_instance

        credentials = get_credentials()

        mock_get_env.assert_any_call("STORAGE_EMULATOR_HOST", fallback="")
        mock_deserialize.assert_called_once_with("credentials_json", dict[str, Any])
        mock_creds_class.from_service_account_info.assert_called_once_with(
            mock_credentials
        )
        assert credentials == mock_creds_instance


def test_get_storage_client(mock_env_vars: None) -> None:
    with (
        patch("packages.shared_utils.src.gcs.get_credentials") as mock_get_credentials,
        patch("packages.shared_utils.src.gcs.storage.Client") as mock_client_class,
        patch("packages.shared_utils.src.gcs.get_env") as mock_get_env,
    ):
        mock_get_env.return_value = "test-project"
        mock_credentials = MagicMock()
        mock_get_credentials.return_value = mock_credentials
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        client1 = get_storage_client()
        mock_client_class.assert_called_once_with(
            credentials=mock_credentials,
            project="test-project",
        )
        assert client1 == mock_client

        mock_client_class.reset_mock()
        client2 = get_storage_client()
        mock_client_class.assert_not_called()
        assert client2 == mock_client
        assert client1 is client2


def test_get_bucket_creates_new_bucket(
    mock_env_vars: None, mock_storage_client: MagicMock
) -> None:
    mock_bucket_instance = MagicMock()
    mock_bucket_instance.exists.return_value = False

    mock_storage_client.bucket.return_value = mock_bucket_instance

    with (
        patch("packages.shared_utils.src.gcs.get_storage_client") as mock_get_client,
        patch("packages.shared_utils.src.gcs.get_env", return_value="test-bucket"),
    ):
        mock_get_client.return_value = mock_storage_client

        bucket = get_bucket()

        mock_storage_client.bucket.assert_called_once_with("test-bucket")
        mock_bucket_instance.exists.assert_called_once()
        mock_bucket_instance.create.assert_called_once()
        assert bucket == mock_bucket_instance


def test_get_bucket_existing_bucket(
    mock_env_vars: None, mock_storage_client: MagicMock, mock_bucket: MagicMock
) -> None:
    mock_storage_client.bucket.return_value = mock_bucket

    with (
        patch("packages.shared_utils.src.gcs.get_storage_client") as mock_get_client,
        patch("packages.shared_utils.src.gcs.get_env", return_value="test-bucket"),
    ):
        mock_get_client.return_value = mock_storage_client

        bucket = get_bucket()

        mock_storage_client.bucket.assert_called_once_with("test-bucket")
        mock_bucket.exists.assert_called_once()
        mock_bucket.create.assert_not_called()
        assert bucket == mock_bucket


def test_get_bucket_caches_bucket(
    mock_env_vars: None, mock_storage_client: MagicMock, mock_bucket: MagicMock
) -> None:
    mock_storage_client.bucket.return_value = mock_bucket

    with (
        patch("packages.shared_utils.src.gcs.get_storage_client") as mock_get_client,
        patch("packages.shared_utils.src.gcs.get_env", return_value="test-bucket"),
    ):
        mock_get_client.return_value = mock_storage_client

        bucket1 = get_bucket()
        assert bucket1 == mock_bucket

        mock_storage_client.reset_mock()
        bucket2 = get_bucket()
        mock_storage_client.bucket.assert_not_called()
        assert bucket2 == mock_bucket
        assert bucket1 is bucket2


async def test_download_blob_success(
    mock_env_vars: None, mock_bucket: MagicMock
) -> None:
    blob_name = "test-blob"
    mock_blob = MagicMock()
    mock_blob.download_as_bytes.return_value = b"test content"
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args: f(*args) if callable(f) else f,
        ),
    ):
        mock_get_bucket.return_value = mock_bucket

        content = await download_blob(blob_name)

        mock_bucket.blob.assert_called_once_with(blob_name)
        mock_blob.download_as_bytes.assert_called_once()
        assert content == b"test content"


async def test_download_blob_error(mock_env_vars: None, mock_bucket: MagicMock) -> None:
    blob_name = "test-blob"
    mock_blob = MagicMock()
    mock_error = ClientError("Test error")  # type: ignore[no-untyped-call]
    mock_blob.download_as_bytes.side_effect = mock_error
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args: f(*args) if callable(f) else f,
        ),
        pytest.raises(ExternalOperationError) as exc_info,
    ):
        mock_get_bucket.return_value = mock_bucket

        await download_blob(blob_name)

    assert "Failed to download blob" in str(exc_info.value)
    assert exc_info.value.context["blob_name"] == blob_name
    assert "Test error" in exc_info.value.context["error"]


def test_construct_object_uri() -> None:
    workspace_id = "workspace-123"
    parent_id = "parent-456"
    source_id = "source-789"
    blob_name = "test-file.pdf"

    uri = construct_object_uri(
        workspace_id=workspace_id,
        parent_id=parent_id,
        source_id=source_id,
        blob_name=blob_name,
    )

    assert uri == f"{workspace_id}/{parent_id}/{source_id}/{blob_name}"


def test_construct_object_uri_with_uuids() -> None:
    workspace_id = UUID("123e4567-e89b-12d3-a456-426614174000")
    parent_id = UUID("223e4567-e89b-12d3-a456-426614174001")
    source_id = UUID("323e4567-e89b-12d3-a456-426614174002")
    blob_name = "test-file.pdf"

    uri = construct_object_uri(
        workspace_id=workspace_id,
        parent_id=parent_id,
        source_id=source_id,
        blob_name=blob_name,
    )

    assert uri == f"{workspace_id}/{parent_id}/{source_id}/{blob_name}"


def test_parse_object_uri_valid() -> None:
    workspace_id = "123e4567-e89b-12d3-a456-426614174000"
    parent_id = "223e4567-e89b-12d3-a456-426614174001"
    source_id = "323e4567-e89b-12d3-a456-426614174002"
    blob_name = "test-file.pdf"
    object_path = f"{workspace_id}/{parent_id}/{source_id}/{blob_name}"

    result = parse_object_uri(object_path=object_path)

    assert result["workspace_id"] == UUID(workspace_id)
    assert result["parent_id"] == UUID(parent_id)
    assert result["source_id"] == UUID(source_id)
    assert result["blob_name"] == blob_name


async def test_create_signed_upload_url(
    mock_env_vars: None, mock_bucket: MagicMock
) -> None:
    workspace_id = "workspace-123"
    parent_id = "parent-456"
    source_id = "source-789"
    blob_name = "test-file.pdf"
    expected_blob_path = f"{workspace_id}/{parent_id}/{source_id}/{blob_name}"
    expected_signed_url = "https://storage.googleapis.com/signed-url"

    mock_blob = MagicMock()
    mock_blob.generate_signed_url.return_value = expected_signed_url
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args: f(*args) if callable(f) else f,
        ),
    ):
        mock_get_bucket.return_value = mock_bucket

        url = await create_signed_upload_url(
            workspace_id=workspace_id,
            parent_id=parent_id,
            source_id=source_id,
            blob_name=blob_name,
        )

        mock_bucket.blob.assert_called_once_with(expected_blob_path)
        mock_blob.generate_signed_url.assert_called_once_with(
            version="v4",
            expiration=ONE_MINUTE_SECONDS * 5,
            method="PUT",
        )
        assert url == expected_signed_url


async def test_create_signed_upload_url_with_uuids(
    mock_env_vars: None, mock_bucket: MagicMock
) -> None:
    workspace_id = UUID("123e4567-e89b-12d3-a456-426614174000")
    parent_id = UUID("223e4567-e89b-12d3-a456-426614174001")
    source_id = UUID("323e4567-e89b-12d3-a456-426614174002")
    blob_name = "test-file.pdf"
    expected_blob_path = f"{workspace_id}/{parent_id}/{source_id}/{blob_name}"
    expected_signed_url = "https://storage.googleapis.com/signed-url"

    mock_blob = MagicMock()
    mock_blob.generate_signed_url.return_value = expected_signed_url
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args: f(*args) if callable(f) else f,
        ),
    ):
        mock_get_bucket.return_value = mock_bucket

        url = await create_signed_upload_url(
            workspace_id=workspace_id,
            parent_id=parent_id,
            source_id=source_id,
            blob_name=blob_name,
        )

        mock_bucket.blob.assert_called_once_with(expected_blob_path)
        mock_blob.generate_signed_url.assert_called_once_with(
            version="v4",
            expiration=ONE_MINUTE_SECONDS * 5,
            method="PUT",
        )
        assert url == expected_signed_url


async def test_create_signed_upload_url_error(
    mock_env_vars: None, mock_bucket: MagicMock
) -> None:
    workspace_id = "workspace-123"
    parent_id = "parent-456"
    source_id = "source-789"
    blob_name = "test-file.pdf"
    expected_blob_path = f"{workspace_id}/{parent_id}/{source_id}/{blob_name}"

    mock_blob = MagicMock()
    mock_error = ClientError("Test error")  # type: ignore[no-untyped-call]
    mock_blob.generate_signed_url.side_effect = mock_error
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args: f(*args) if callable(f) else f,
        ),
        pytest.raises(ExternalOperationError) as exc_info,
    ):
        mock_get_bucket.return_value = mock_bucket

        await create_signed_upload_url(
            workspace_id=workspace_id,
            parent_id=parent_id,
            source_id=source_id,
            blob_name=blob_name,
        )

    assert "Failed to create signed upload URL" in str(exc_info.value)
    assert exc_info.value.context["blob_path"] == expected_blob_path
    assert "Test error" in exc_info.value.context["error"]


async def test_upload_blob_success(mock_env_vars: None, mock_bucket: MagicMock) -> None:
    blob_path = "workspace/workspace-123/test-file.pdf"
    content = b"test content"

    mock_blob = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args: f(*args) if callable(f) else f,
        ),
    ):
        mock_get_bucket.return_value = mock_bucket

        await upload_blob(blob_path, content)

        mock_bucket.blob.assert_called_once_with(blob_path)
        mock_blob.upload_from_string.assert_called_once_with(content)


async def test_upload_blob_error(mock_env_vars: None, mock_bucket: MagicMock) -> None:
    blob_path = "workspace/workspace-123/test-file.pdf"
    content = b"test content"

    mock_blob = MagicMock()
    mock_error = ClientError("Test error")  # type: ignore[no-untyped-call]
    mock_blob.upload_from_string.side_effect = mock_error
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args: f(*args) if callable(f) else f,
        ),
        pytest.raises(ExternalOperationError) as exc_info,
    ):
        mock_get_bucket.return_value = mock_bucket

        await upload_blob(blob_path, content)

    assert "Failed to upload blob" in str(exc_info.value)
    assert exc_info.value.context["blob_path"] == blob_path
    assert "Test error" in exc_info.value.context["error"]


def test_parse_object_uri_invalid_three_components() -> None:
    object_path = "workspace-123/parent-456/test-file.pdf"

    with pytest.raises(ValidationError) as exc_info:
        parse_object_uri(object_path=object_path)

    assert "Invalid object path format" in str(exc_info.value)
    assert "Expected format: <workspace_id>/<parent_id>/<source_id>/<blob_name>" in str(
        exc_info.value
    )
    assert exc_info.value.context["object_path"] == object_path


def test_parse_object_uri_invalid_five_components() -> None:
    object_path = "workspace/ws-123/grant_application/app-456/test-file.pdf"

    with pytest.raises(ValidationError) as exc_info:
        parse_object_uri(object_path=object_path)

    assert "Invalid object path format" in str(exc_info.value)
    assert "Expected format: <workspace_id>/<parent_id>/<source_id>/<blob_name>" in str(
        exc_info.value
    )
    assert exc_info.value.context["object_path"] == object_path


def test_parse_object_uri_invalid_two_components() -> None:
    object_path = "workspace-123/test-file.pdf"

    with pytest.raises(ValidationError) as exc_info:
        parse_object_uri(object_path=object_path)

    assert "Invalid object path format" in str(exc_info.value)
    assert "Expected format: <workspace_id>/<parent_id>/<source_id>/<blob_name>" in str(
        exc_info.value
    )
    assert exc_info.value.context["object_path"] == object_path


def test_parse_object_uri_invalid_uuid() -> None:
    object_path = "invalid-uuid/parent-456/source-789/test-file.pdf"

    with pytest.raises(ValueError) as exc_info:
        parse_object_uri(object_path=object_path)

    assert "badly formed hexadecimal UUID string" in str(exc_info.value)


def test_construct_and_parse_round_trip() -> None:
    workspace_id = UUID("123e4567-e89b-12d3-a456-426614174000")
    parent_id = UUID("223e4567-e89b-12d3-a456-426614174001")
    source_id = UUID("323e4567-e89b-12d3-a456-426614174002")
    blob_name = "test-file.pdf"

    uri = construct_object_uri(
        workspace_id=workspace_id,
        parent_id=parent_id,
        source_id=source_id,
        blob_name=blob_name,
    )

    result = parse_object_uri(object_path=uri)

    assert result["workspace_id"] == workspace_id
    assert result["parent_id"] == parent_id
    assert result["source_id"] == source_id
    assert result["blob_name"] == blob_name
