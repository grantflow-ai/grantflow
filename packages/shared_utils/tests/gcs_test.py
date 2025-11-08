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
from sqlalchemy.sql import True_

from packages.shared_utils.src.constants import ONE_MINUTE_SECONDS
from packages.shared_utils.src.exceptions import ExternalOperationError, ValidationError
from packages.shared_utils.src.gcs import (
    bucket_ref,
    construct_object_uri,
    create_signed_download_url,
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
def reset_refs() -> Generator[None, None, None]:
    storage_client_ref.value = None
    bucket_ref.value = None
    yield
    storage_client_ref.value = None
    bucket_ref.value = None


@pytest.fixture
def mock_env_vars() -> Generator[None, None, None]:
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

        def mock_get_env_impl(
            key: str, fallback: Any = None, raise_on_missing: bool = True
        ) -> str:
            if key == "STORAGE_EMULATOR_HOST":
                return ""
            else:
                return "credentials_json"

        mock_get_env.side_effect = mock_get_env_impl
        mock_deserialize.return_value = mock_credentials
        mock_creds_instance = MagicMock()
        mock_creds_class.from_service_account_info.return_value = mock_creds_instance

        credentials = get_credentials()

        mock_get_env.assert_any_call("STORAGE_EMULATOR_HOST", raise_on_missing=False)
        mock_deserialize.assert_called_once_with("credentials_json", dict[str, Any])
        mock_creds_class.from_service_account_info.assert_called_once_with(
            mock_credentials,
            scopes=[
                "https://www.googleapis.com/auth/cloud-platform",
                "https://www.googleapis.com/auth/devstorage.read_write",
            ],
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
            side_effect=lambda f, *args, **kwargs: f(*args, **kwargs)
            if callable(f)
            else f,
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
    mock_error = ClientError("Test error")
    mock_blob.download_as_bytes.side_effect = mock_error
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args, **kwargs: f(*args, **kwargs)
            if callable(f)
            else f,
        ),
        pytest.raises(ExternalOperationError) as exc_info,
    ):
        mock_get_bucket.return_value = mock_bucket

        await download_blob(blob_name)

    assert "Failed to download blob" in str(exc_info.value)
    assert exc_info.value.context["blob_name"] == blob_name
    assert "Test error" in exc_info.value.context["error"]


def test_construct_object_uri() -> None:
    entity_type = "grant_application"
    entity_id = "entity-456"
    source_id = "source-789"
    blob_name = "test-file.pdf"

    uri = construct_object_uri(
        entity_type="grant_application",
        entity_id=entity_id,
        source_id=source_id,
        blob_name=blob_name,
    )

    assert uri == f"{entity_type}/{entity_id}/{source_id}/{blob_name}"


def test_construct_object_uri_with_uuids() -> None:
    entity_type = "granting_institution"
    entity_id = UUID("223e4567-e89b-12d3-a456-426614174001")
    source_id = UUID("323e4567-e89b-12d3-a456-426614174002")
    blob_name = "test-file.pdf"

    uri = construct_object_uri(
        entity_type="granting_institution",
        entity_id=entity_id,
        source_id=source_id,
        blob_name=blob_name,
    )

    assert uri == f"{entity_type}/{entity_id}/{source_id}/{blob_name}"


def test_construct_object_uri_with_granting_institution() -> None:
    entity_type = "granting_institution"
    entity_id = UUID("223e4567-e89b-12d3-a456-426614174001")
    source_id = UUID("323e4567-e89b-12d3-a456-426614174002")
    blob_name = "test-file.pdf"

    uri = construct_object_uri(
        entity_type="granting_institution",
        entity_id=entity_id,
        source_id=source_id,
        blob_name=blob_name,
    )

    assert uri == f"{entity_type}/{entity_id}/{source_id}/{blob_name}"


def test_parse_object_uri_valid() -> None:
    entity_type = "grant_application"
    entity_id = "223e4567-e89b-12d3-a456-426614174001"
    source_id = "323e4567-e89b-12d3-a456-426614174002"
    blob_name = "test-file.pdf"
    object_path = f"{entity_type}/{entity_id}/{source_id}/{blob_name}"

    result = parse_object_uri(object_path=object_path)

    assert result["entity_type"] == entity_type
    assert result["entity_id"] == UUID(entity_id)
    assert result["source_id"] == UUID(source_id)
    assert result["blob_name"] == blob_name


async def test_create_signed_upload_url(
    mock_env_vars: None, mock_bucket: MagicMock
) -> None:
    entity_type = "grant_application"
    entity_id = "entity-456"
    source_id = "source-789"
    blob_name = "test-file.pdf"
    expected_blob_path = f"{entity_type}/{entity_id}/{source_id}/{blob_name}"
    expected_signed_url = "https://storage.googleapis.com/signed-url"

    mock_blob = MagicMock()
    mock_blob.generate_signed_url.return_value = expected_signed_url
    mock_bucket.blob.return_value = mock_blob

    storage_client_ref.value = None
    bucket_ref.value = None

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args, **kwargs: f(*args, **kwargs)
            if callable(f)
            else f,
        ),
        patch("packages.shared_utils.src.gcs.get_env") as mock_get_env,
    ):

        def mock_get_env_impl(
            key: str, fallback: str | None = None, raise_on_missing: bool = True
        ) -> str:
            if key == "DEBUG":
                return "False"
            elif key == "STORAGE_EMULATOR_HOST":
                return ""
            elif key == "GCS_BUCKET_NAME":
                return "test-bucket"
            else:
                return fallback or ""

        mock_get_env.side_effect = mock_get_env_impl
        mock_get_bucket.return_value = mock_bucket

        url = await create_signed_upload_url(
            entity_type="grant_application",
            entity_id=entity_id,
            source_id=source_id,
            blob_name=blob_name,
        )

        mock_bucket.blob.assert_called_once_with(expected_blob_path)
        mock_blob.generate_signed_url.assert_called_once_with(
            version="v4",
            expiration=ONE_MINUTE_SECONDS * 5,
            method="PUT",
            headers=None,
            content_type=None,
        )
        assert url == expected_signed_url


async def test_create_signed_upload_url_with_uuids(
    mock_env_vars: None, mock_bucket: MagicMock
) -> None:
    entity_type = "granting_institution"
    entity_id = UUID("223e4567-e89b-12d3-a456-426614174001")
    source_id = UUID("323e4567-e89b-12d3-a456-426614174002")
    blob_name = "test-file.pdf"
    expected_blob_path = f"{entity_type}/{entity_id}/{source_id}/{blob_name}"
    expected_signed_url = "https://storage.googleapis.com/signed-url"

    mock_blob = MagicMock()
    mock_blob.generate_signed_url.return_value = expected_signed_url
    mock_bucket.blob.return_value = mock_blob

    storage_client_ref.value = None
    bucket_ref.value = None

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args, **kwargs: f(*args, **kwargs)
            if callable(f)
            else f,
        ),
        patch("packages.shared_utils.src.gcs.get_env") as mock_get_env,
    ):

        def mock_get_env_impl(
            key: str, fallback: str | None = None, raise_on_missing: bool = True
        ) -> str:
            if key == "DEBUG":
                return "False"
            elif key == "STORAGE_EMULATOR_HOST":
                return ""
            elif key == "GCS_BUCKET_NAME":
                return "test-bucket"
            else:
                return fallback or ""

        mock_get_env.side_effect = mock_get_env_impl
        mock_get_bucket.return_value = mock_bucket

        url = await create_signed_upload_url(
            entity_type="granting_institution",
            entity_id=entity_id,
            source_id=source_id,
            blob_name=blob_name,
        )

        mock_bucket.blob.assert_called_once_with(expected_blob_path)
        mock_blob.generate_signed_url.assert_called_once_with(
            version="v4",
            expiration=ONE_MINUTE_SECONDS * 5,
            method="PUT",
            headers=None,
            content_type=None,
        )
        assert url == expected_signed_url


async def test_create_signed_upload_url_error(
    mock_env_vars: None, mock_bucket: MagicMock
) -> None:
    entity_type = "grant_application"
    entity_id = "entity-456"
    source_id = "source-789"
    blob_name = "test-file.pdf"
    expected_blob_path = f"{entity_type}/{entity_id}/{source_id}/{blob_name}"

    mock_blob = MagicMock()
    mock_error = ClientError("Test error")
    mock_blob.generate_signed_url.side_effect = mock_error
    mock_bucket.blob.return_value = mock_blob

    storage_client_ref.value = None
    bucket_ref.value = None

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args, **kwargs: f(*args, **kwargs)
            if callable(f)
            else f,
        ),
        patch("packages.shared_utils.src.gcs.get_env") as mock_get_env,
        pytest.raises(ExternalOperationError) as exc_info,
    ):

        def mock_get_env_impl(
            key: str, fallback: str | None = None, raise_on_missing: bool = True
        ) -> str:
            if key == "DEBUG":
                return "False"
            elif key == "STORAGE_EMULATOR_HOST":
                return ""
            elif key == "GCS_BUCKET_NAME":
                return "test-bucket"
            else:
                return fallback or ""

        mock_get_env.side_effect = mock_get_env_impl
        mock_get_bucket.return_value = mock_bucket

        await create_signed_upload_url(
            entity_type="grant_application",
            entity_id=entity_id,
            source_id=source_id,
            blob_name=blob_name,
        )

    assert "Failed to create signed upload URL" in str(exc_info.value)
    assert exc_info.value.context["blob_path"] == expected_blob_path
    assert "Test error" in exc_info.value.context["error"]


async def test_create_signed_upload_url_with_content_type(
    mock_env_vars: None, mock_bucket: MagicMock
) -> None:
    entity_type = "grant_application"
    entity_id = "entity-123"
    source_id = "source-456"
    blob_name = "test-file.pdf"
    content_type = "application/pdf"
    trace_id = "trace-789"
    expected_blob_path = f"{entity_type}/{entity_id}/{source_id}/{blob_name}"
    expected_signed_url = "https://storage.googleapis.com/signed-url"

    mock_blob = MagicMock()
    mock_blob.generate_signed_url.return_value = expected_signed_url
    mock_bucket.blob.return_value = mock_blob

    storage_client_ref.value = None
    bucket_ref.value = None

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args, **kwargs: f(*args, **kwargs)
            if callable(f)
            else f,
        ),
        patch("packages.shared_utils.src.gcs.get_env") as mock_get_env,
    ):

        def mock_get_env_impl(
            key: str, fallback: str | None = None, raise_on_missing: bool = True
        ) -> str:
            if key == "DEBUG":
                return "False"
            elif key == "STORAGE_EMULATOR_HOST":
                return ""
            elif key == "GCS_BUCKET_NAME":
                return "test-bucket"
            else:
                return fallback or ""

        mock_get_env.side_effect = mock_get_env_impl
        mock_get_bucket.return_value = mock_bucket

        url = await create_signed_upload_url(
            entity_type="grant_application",
            entity_id=entity_id,
            source_id=source_id,
            blob_name=blob_name,
            trace_id=trace_id,
            content_type=content_type,
        )

        mock_bucket.blob.assert_called_once_with(expected_blob_path)
        mock_blob.generate_signed_url.assert_called_once_with(
            version="v4",
            expiration=ONE_MINUTE_SECONDS * 5,
            method="PUT",
            headers={"Content-Type": content_type},
            content_type=content_type,
        )
        assert url == expected_signed_url


async def test_upload_blob_success(mock_env_vars: None, mock_bucket: MagicMock) -> None:
    blob_path = "project/project-123/test-file.pdf"
    content = b"test content"

    mock_blob = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args, **kwargs: f(*args, **kwargs)
            if callable(f)
            else f,
        ),
    ):
        mock_get_bucket.return_value = mock_bucket

        await upload_blob(blob_path, content)

        mock_bucket.blob.assert_called_once_with(blob_path)
        mock_blob.upload_from_string.assert_called_once_with(content)


async def test_upload_blob_error(mock_env_vars: None, mock_bucket: MagicMock) -> None:
    blob_path = "project/project-123/test-file.pdf"
    content = b"test content"

    mock_blob = MagicMock()
    mock_error = ClientError("Test error")
    mock_blob.upload_from_string.side_effect = mock_error
    mock_bucket.blob.return_value = mock_blob

    with (
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args, **kwargs: f(*args, **kwargs)
            if callable(f)
            else f,
        ),
        pytest.raises(ExternalOperationError) as exc_info,
    ):
        mock_get_bucket.return_value = mock_bucket

        await upload_blob(blob_path, content)

    assert "Failed to upload blob" in str(exc_info.value)
    assert exc_info.value.context["blob_path"] == blob_path
    assert "Test error" in exc_info.value.context["error"]


def test_parse_object_uri_granting_institution() -> None:
    entity_type = "granting_institution"
    entity_id = "223e4567-e89b-12d3-a456-426614174001"
    source_id = "323e4567-e89b-12d3-a456-426614174002"
    blob_name = "test-file.pdf"
    object_path = f"{entity_type}/{entity_id}/{source_id}/{blob_name}"

    result = parse_object_uri(object_path=object_path)

    assert result["entity_type"] == entity_type
    assert result["entity_id"] == UUID(entity_id)
    assert result["source_id"] == UUID(source_id)
    assert result["blob_name"] == blob_name


def test_parse_object_uri_invalid_three_components() -> None:
    object_path = "grant_application/parent-456/test-file.pdf"

    with pytest.raises(ValidationError) as exc_info:
        parse_object_uri(object_path=object_path)

    assert "Invalid object path format" in str(exc_info.value)


def test_parse_object_uri_invalid_five_components() -> None:
    object_path = "grant_application/ws-123/grant_application/app-456/test-file.pdf"

    with pytest.raises(ValidationError) as exc_info:
        parse_object_uri(object_path=object_path)

    assert "Invalid object path format" in str(exc_info.value)
    assert exc_info.value.context["object_path"] == object_path


def test_parse_object_uri_invalid_two_components() -> None:
    object_path = "grant_application/test-file.pdf"

    with pytest.raises(ValidationError) as exc_info:
        parse_object_uri(object_path=object_path)

    assert "Invalid object path format" in str(exc_info.value)
    assert exc_info.value.context["object_path"] == object_path


def test_parse_object_uri_invalid_uuid() -> None:
    object_path = "grant_application/invalid-uuid/source-789/test-file.pdf"

    with pytest.raises(ValueError) as exc_info:
        parse_object_uri(object_path=object_path)

    assert "badly formed hexadecimal UUID string" in str(exc_info.value)


def test_construct_and_parse_round_trip() -> None:
    entity_type = "grant_application"
    entity_id = UUID("223e4567-e89b-12d3-a456-426614174001")
    source_id = UUID("323e4567-e89b-12d3-a456-426614174002")
    blob_name = "test-file.pdf"

    uri = construct_object_uri(
        entity_type="grant_application",
        entity_id=entity_id,
        source_id=source_id,
        blob_name=blob_name,
    )

    result = parse_object_uri(object_path=uri)

    assert result["entity_type"] == entity_type
    assert result["entity_id"] == entity_id
    assert result["source_id"] == source_id
    assert result["blob_name"] == blob_name


async def test_create_signed_download_url(
    mock_env_vars: None, mock_bucket: MagicMock
) -> None:
    bucket_name = "test-bucket"
    object_path = "grant_application/entity-456/source-789/test-file.pdf"
    filename = "test-file.pdf"
    expected_signed_url = "https://storage.googleapis.com/signed-download-url"

    mock_blob = MagicMock()
    mock_blob.exists.return_value = True
    mock_blob.generate_signed_url.return_value = expected_signed_url
    mock_bucket.blob.return_value = mock_blob

    storage_client_ref.value = None
    bucket_ref.value = None

    mock_storage_client = MagicMock()
    mock_storage_client.bucket.return_value = mock_bucket

    with (
        patch(
            "packages.shared_utils.src.gcs.get_storage_client",
            return_value=mock_storage_client,
        ),
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args, **kwargs: f(*args, **kwargs)
            if callable(f)
            else f,
        ),
        patch("packages.shared_utils.src.gcs.get_env") as mock_get_env,
    ):

        def mock_get_env_impl(
            key: str, fallback: str | None = None, raise_on_missing: bool = True
        ) -> str:
            if key == "DEBUG":
                return "False"
            elif key == "STORAGE_EMULATOR_HOST":
                return ""
            else:
                return fallback or ""

        mock_get_env.side_effect = mock_get_env_impl
        mock_get_bucket.return_value = mock_bucket

        url = await create_signed_download_url(
            bucket_name=bucket_name,
            object_path=object_path,
            filename=filename,
        )

        mock_bucket.blob.assert_called_once_with(object_path)
        mock_blob.generate_signed_url.assert_called_once_with(
            version="v4",
            expiration=ONE_MINUTE_SECONDS * 60,
            method="GET",
            response_disposition=f'inline; filename="{filename}"',
        )
        assert url == expected_signed_url


async def test_create_signed_download_url_with_custom_expiration(
    mock_env_vars: None, mock_bucket: MagicMock
) -> None:
    bucket_name = "test-bucket"
    object_path = "grant_application/entity-456/source-789/test-file.pdf"
    filename = "test-file.pdf"
    custom_expiration = 1800
    expected_signed_url = "https://storage.googleapis.com/signed-download-url"

    mock_blob = MagicMock()
    mock_blob.exists.return_value = True
    mock_blob.generate_signed_url.return_value = expected_signed_url
    mock_bucket.blob.return_value = mock_blob

    storage_client_ref.value = None
    bucket_ref.value = None

    mock_storage_client = MagicMock()
    mock_storage_client.bucket.return_value = mock_bucket

    with (
        patch(
            "packages.shared_utils.src.gcs.get_storage_client",
            return_value=mock_storage_client,
        ),
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args, **kwargs: f(*args, **kwargs)
            if callable(f)
            else f,
        ),
        patch("packages.shared_utils.src.gcs.get_env") as mock_get_env,
    ):

        def mock_get_env_impl(
            key: str, fallback: str | None = None, raise_on_missing: bool = True
        ) -> str:
            if key == "DEBUG":
                return "False"
            elif key == "STORAGE_EMULATOR_HOST":
                return ""
            else:
                return fallback or ""

        mock_get_env.side_effect = mock_get_env_impl
        mock_get_bucket.return_value = mock_bucket

        url = await create_signed_download_url(
            bucket_name=bucket_name,
            object_path=object_path,
            filename=filename,
            expiration_seconds=custom_expiration,
        )

        mock_bucket.blob.assert_called_once_with(object_path)
        mock_blob.generate_signed_url.assert_called_once_with(
            version="v4",
            expiration=custom_expiration,
            method="GET",
            response_disposition=f'inline; filename="{filename}"',
        )
        assert url == expected_signed_url


async def test_create_signed_download_url_debug_mode(
    mock_env_vars: None, mock_bucket: MagicMock
) -> None:
    bucket_name = "test-bucket"
    object_path = "grant_application/entity-456/source-789/test-file.pdf"
    filename = "test-file.pdf"

    with patch("packages.shared_utils.src.gcs.get_env") as mock_get_env:

        def mock_get_env_impl(
            key: str, fallback: str | None = None, raise_on_missing: bool = True
        ) -> str:
            if key == "DEBUG":
                return "true"
            elif key == "STORAGE_EMULATOR_HOST":
                return ""
            else:
                return fallback or ""

        mock_get_env.side_effect = mock_get_env_impl

        url = await create_signed_download_url(
            bucket_name=bucket_name,
            object_path=object_path,
            filename=filename,
        )

        expected_dev_url = f"dev://download/{bucket_name}/{object_path}"
        assert url == expected_dev_url
        mock_bucket.blob.assert_not_called()


async def test_create_signed_download_url_emulator_mode(
    mock_env_vars: None, mock_bucket: MagicMock
) -> None:
    bucket_name = "test-bucket"
    object_path = "grant_application/entity-456/source-789/test-file.pdf"
    filename = "test-file.pdf"
    emulator_host = "http://localhost:9023"

    with patch("packages.shared_utils.src.gcs.get_env") as mock_get_env:

        def mock_get_env_impl(
            key: str, fallback: str | None = None, raise_on_missing: bool = True
        ) -> str:
            if key == "DEBUG":
                return "False"
            elif key == "STORAGE_EMULATOR_HOST":
                return emulator_host
            elif key == "GCS_BUCKET_NAME":
                return bucket_name
            else:
                return fallback or ""

        mock_get_env.side_effect = mock_get_env_impl

        url = await create_signed_download_url(
            bucket_name=bucket_name,
            object_path=object_path,
            filename=filename,
        )

        expected_emulator_url = (
            f"{emulator_host}/storage/v1/b/{bucket_name}/o/{object_path}?alt=media"
        )
        assert url == expected_emulator_url
        mock_bucket.blob.assert_not_called()


async def test_create_signed_download_url_without_filename(
    mock_env_vars: None, mock_bucket: MagicMock
) -> None:
    bucket_name = "test-bucket"
    object_path = "grant_application/entity-456/source-789/test-file.pdf"
    filename = ""
    expected_signed_url = "https://storage.googleapis.com/signed-download-url"

    mock_blob = MagicMock()
    mock_blob.exists.return_value = True_
    mock_blob.generate_signed_url.return_value = expected_signed_url
    mock_bucket.blob.return_value = mock_blob

    storage_client_ref.value = None
    bucket_ref.value = None

    mock_storage_client = MagicMock()
    mock_storage_client.bucket.return_value = mock_bucket

    with (
        patch(
            "packages.shared_utils.src.gcs.get_storage_client",
            return_value=mock_storage_client,
        ),
        patch("packages.shared_utils.src.gcs.get_bucket") as mock_get_bucket,
        patch(
            "packages.shared_utils.src.gcs.run_sync",
            side_effect=lambda f, *args, **kwargs: f(*args, **kwargs)
            if callable(f)
            else f,
        ),
        patch("packages.shared_utils.src.gcs.get_env") as mock_get_env,
    ):

        def mock_get_env_impl(
            key: str, fallback: str | None = None, raise_on_missing: bool = True
        ) -> str:
            if key == "DEBUG":
                return "False"
            elif key == "STORAGE_EMULATOR_HOST":
                return ""
            else:
                return fallback or ""

        mock_get_env.side_effect = mock_get_env_impl
        mock_get_bucket.return_value = mock_bucket

        url = await create_signed_download_url(
            bucket_name=bucket_name,
            object_path=object_path,
            filename=filename,
        )

        mock_bucket.blob.assert_called_once_with(object_path)
        mock_blob.generate_signed_url.assert_called_once_with(
            version="v4",
            expiration=ONE_MINUTE_SECONDS * 60,
            method="GET",
            response_disposition=None,
        )
        assert url == expected_signed_url
