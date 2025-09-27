from typing import Any, cast
from uuid import UUID

from google.auth.credentials import AnonymousCredentials
from google.cloud import storage
from google.cloud.exceptions import ClientError, NotFound
from google.oauth2.service_account import Credentials
from packages.shared_utils.src.constants import ONE_MINUTE_SECONDS
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.sync import run_sync

logger = get_logger(__name__)

logo_storage_client_ref = Ref[storage.Client]()
logo_bucket_ref = Ref[storage.Bucket]()

LOGO_MIME_TYPES: dict[str, str] = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/webp": "webp",
}


def get_max_logo_size() -> int:
    size_mb = int(get_env("LOGO_MAX_SIZE_MB", fallback="5"))
    return size_mb * 1024 * 1024


def get_logo_credentials() -> Credentials:
    if get_env("STORAGE_EMULATOR_HOST", raise_on_missing=False):
        return cast("Credentials", AnonymousCredentials())  # type: ignore[no-untyped-call]

    credentials_json = get_env("GCS_SERVICE_ACCOUNT_CREDENTIALS", raise_on_missing=False)
    if credentials_json:
        credentials = deserialize(credentials_json, dict[str, Any])
        return cast(
            "Credentials",
            Credentials.from_service_account_info(  # type: ignore[no-untyped-call]
                credentials,
                scopes=[
                    "https://www.googleapis.com/auth/cloud-platform",
                    "https://www.googleapis.com/auth/devstorage.read_write",
                ],
            ),
        )

    return cast("Credentials", None)


def get_logo_storage_client() -> storage.Client:
    if logo_storage_client_ref.value:
        return logo_storage_client_ref.value

    credentials = get_logo_credentials()
    logo_storage_client_ref.value = storage.Client(
        credentials=credentials,
        project=get_env("GOOGLE_CLOUD_PROJECT"),
    )

    return logo_storage_client_ref.value


def get_logo_bucket() -> storage.Bucket:
    if not logo_bucket_ref.value:
        storage_client = get_logo_storage_client()
        bucket_name = get_env("LOGO_BUCKET_NAME", raise_on_missing=False)
        if not bucket_name:
            environment = get_env("ENVIRONMENT", fallback="staging")
            bucket_name = f"grantflow-{environment}-logos"

        logo_bucket_ref.value = storage_client.bucket(bucket_name)

    return logo_bucket_ref.value


def construct_logo_path(organization_id: UUID) -> str:
    return f"organizations/{organization_id}/logo"


def get_logo_url(organization_id: UUID, file_extension: str) -> str:
    environment = get_env("ENVIRONMENT", fallback="staging")
    bucket_name = get_env("LOGO_BUCKET_NAME", fallback=f"grantflow-{environment}-logos")
    object_path = f"{construct_logo_path(organization_id)}.{file_extension}"
    return f"https://storage.googleapis.com/{bucket_name}/{object_path}"


def validate_logo_file(file_content: bytes, content_type: str) -> None:
    if content_type not in LOGO_MIME_TYPES:
        raise ValidationError(
            f"Unsupported logo format: {content_type}",
            context={"supported_formats": list(LOGO_MIME_TYPES.keys())},
        )

    max_size = get_max_logo_size()
    if len(file_content) > max_size:
        raise ValidationError(f"Logo file too large. Maximum size: {max_size // (1024 * 1024)}MB")


async def upload_organization_logo(organization_id: UUID, file_content: bytes, content_type: str) -> str:
    validate_logo_file(file_content, content_type)

    bucket = await run_sync(get_logo_bucket)
    file_extension = LOGO_MIME_TYPES[content_type]
    blob_path = f"{construct_logo_path(organization_id)}.{file_extension}"

    blob = bucket.blob(blob_path)
    await run_sync(lambda: blob.upload_from_string(file_content, content_type=content_type))

    blob.cache_control = "public, max-age=86400"
    await run_sync(blob.patch)

    await cleanup_old_logo_formats(organization_id, file_extension)

    public_url = get_logo_url(organization_id, file_extension)

    logger.info(
        "Organization logo uploaded",
        organization_id=str(organization_id),
        file_size=len(file_content),
        content_type=content_type,
        url=public_url,
    )

    return public_url


async def cleanup_old_logo_formats(organization_id: UUID, current_extension: str) -> None:
    try:
        bucket = await run_sync(get_logo_bucket)
        base_path = construct_logo_path(organization_id)

        for extension in LOGO_MIME_TYPES.values():
            if extension != current_extension:
                blob_path = f"{base_path}.{extension}"
                blob = bucket.blob(blob_path)
                try:
                    await run_sync(blob.delete)
                    logger.debug(
                        "Cleaned up old logo format",
                        organization_id=str(organization_id),
                        extension=extension,
                    )
                except NotFound:
                    pass

    except ClientError as e:
        logger.warning(
            "Failed to cleanup old logo formats",
            organization_id=str(organization_id),
            error=str(e),
        )


async def delete_organization_logo(organization_id: UUID) -> None:
    bucket = await run_sync(get_logo_bucket)
    base_path = construct_logo_path(organization_id)

    for extension in LOGO_MIME_TYPES.values():
        blob_path = f"{base_path}.{extension}"
        blob = bucket.blob(blob_path)
        try:
            await run_sync(blob.delete)
            logger.info(
                "Deleted organization logo",
                organization_id=str(organization_id),
                blob_path=blob_path,
            )
        except NotFound:
            pass


async def get_organization_logo_info(organization_id: UUID) -> dict[str, Any] | None:
    bucket = await run_sync(get_logo_bucket)
    base_path = construct_logo_path(organization_id)

    for extension in LOGO_MIME_TYPES.values():
        blob_path = f"{base_path}.{extension}"
        blob = bucket.blob(blob_path)

        exists = await run_sync(blob.exists)
        if exists:
            await run_sync(blob.reload)
            return {
                "url": get_logo_url(organization_id, extension),
                "size": blob.size,
                "content_type": blob.content_type,
                "updated": blob.updated.isoformat() if blob.updated else None,
            }

    return None


async def create_signed_logo_upload_url(organization_id: UUID, content_type: str) -> str:
    if content_type not in LOGO_MIME_TYPES:
        raise ValidationError(
            f"Unsupported logo format: {content_type}",
            context={"supported_formats": list(LOGO_MIME_TYPES.keys())},
        )

    bucket = await run_sync(get_logo_bucket)
    file_extension = LOGO_MIME_TYPES[content_type]
    blob_path = f"{construct_logo_path(organization_id)}.{file_extension}"

    blob = bucket.blob(blob_path)
    headers = {"Content-Type": content_type}

    signed_url = await run_sync(
        lambda: blob.generate_signed_url(
            version="v4",
            expiration=ONE_MINUTE_SECONDS * 5,
            method="PUT",
            headers=headers,
            content_type=content_type,
        )
    )

    logger.info(
        "Created signed logo upload URL",
        organization_id=str(organization_id),
        content_type=content_type,
    )

    return cast("str", signed_url)
