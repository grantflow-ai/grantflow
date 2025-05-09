from typing import Any, Literal, NotRequired, TypedDict, cast

from google.auth.credentials import AnonymousCredentials
from google.cloud import storage
from google.cloud.exceptions import ClientError
from google.cloud.storage import Bucket
from google.oauth2.service_account import Credentials

from packages.shared_utils.src.constants import ONE_MINUTE_SECONDS
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import ExternalOperationError, ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.sync import run_sync

logger = get_logger(__name__)

storage_client_ref = Ref[storage.Client]()
bucket_ref = Ref[Bucket]()


class URIParseResult(TypedDict):
    parent_type: Literal["grant_application", "funding_organization", "grant_template"]
    workspace_id: NotRequired[str]
    parent_id: str
    filename: str


def get_credentials() -> Credentials:
    if get_env("STORAGE_EMULATOR_HOST", fallback=""):
        return cast("Credentials", AnonymousCredentials())  # type: ignore[no-untyped-call]
    credentials = deserialize(get_env("GCS_SERVICE_ACCOUNT_CREDENTIALS"), dict[str, Any])
    return cast("Credentials", Credentials.from_service_account_info(credentials))  # type: ignore[no-untyped-call]


def get_storage_client() -> storage.Client:
    if storage_client_ref.value:
        return storage_client_ref.value

    storage_client_ref.value = storage.Client(
        credentials=get_credentials(),
        project=get_env("GOOGLE_CLOUD_PROJECT"),
    )

    return storage_client_ref.value


def get_bucket() -> Bucket:
    if not bucket_ref.value:
        storage_client = get_storage_client()
        bucket = storage_client.bucket(get_env("GCS_BUCKET_NAME", fallback="grantflow-uploads"))

        if not bucket.exists():
            bucket.create()

        bucket_ref.value = bucket

    return bucket_ref.value


async def download_blob(blob_name: str) -> bytes:
    try:
        bucket_name = get_env("GCS_BUCKET_NAME", fallback="grantflow-uploads")
        bucket = await run_sync(get_bucket)

        blob = bucket.blob(blob_name)
        content = await run_sync(blob.download_as_bytes)
        logger.info(
            "Downloaded blob",
            blob_name=blob_name,
            bucket_name=bucket_name,
        )
        return cast("bytes", content)
    except ClientError as e:
        logger.error("Failed to download blob", blob_name=blob_name, exc_info=e)
        raise ExternalOperationError(
            "Failed to download blob",
            context={
                "blob_name": blob_name,
                "error": str(e),
            },
        ) from e


def construct_object_uri(
    *,
    application_id: str | None,
    blob_name: str,
    organization_id: str | None,
    template_id: str | None,
    workspace_id: str | None,
) -> str:
    if workspace_id and not (application_id or template_id):
        raise ValidationError(
            "Either application_id or template_id must be provided if workspace_id is provided",
            context={
                "workspace_id": workspace_id,
                "application_id": application_id,
                "template_id": template_id,
            },
        )
    if (application_id or template_id) and not workspace_id:
        raise ValidationError(
            "workspace_id must be provided if application_id or template_id is provided",
            context={
                "workspace_id": workspace_id,
                "application_id": application_id,
                "template_id": template_id,
            },
        )
    if not workspace_id and not organization_id:
        raise ValidationError(
            "Either workspace_id or organization_id must be provided",
            context={
                "workspace_id": workspace_id,
                "organization_id": organization_id,
            },
        )

    components = []
    if workspace_id:
        components.append(f"workspace/{workspace_id}")

        if application_id:
            components.append(f"grant_application/{application_id}")

        elif template_id:
            components.append(f"grant_template/{template_id}")

        else:
            raise ValidationError(
                "Either application_id or template_id must be provided",
                context={
                    "workspace_id": workspace_id,
                    "application_id": application_id,
                    "template_id": template_id,
                },
            )

    else:
        components.append(f"funding_organization/{organization_id}")

    components.append(blob_name)

    return "/".join(components)


def parse_object_uri(
    *,
    object_path: str,
) -> URIParseResult:
    components = object_path.split("/")

    if len(components) == 3:
        parent_type, parent_id, filename = components

        if parent_type != "funding_organization":
            raise ValidationError(
                "Invalid object path format. Expected format: funding_organization/<organization_id>/<filename>.<extension>",
                context={
                    "object_path": object_path,
                },
            )

        return URIParseResult(
            parent_type="funding_organization",
            parent_id=components[1],
            filename=components[2],
        )
    if len(components) == 5:
        top_level, workspace_id, parent_type, parent_id, filename = components
        if top_level != "workspace":
            raise ValidationError(
                "Invalid object path format. Expected format: workspace/<workspace_id>/<parent_type>/<parent_id>/<filename>.<extension>",
                context={
                    "object_path": object_path,
                },
            )

        if parent_type == "grant_application":
            return URIParseResult(
                parent_type="grant_application",
                workspace_id=workspace_id,
                parent_id=parent_id,
                filename=filename,
            )
        if parent_type == "grant_template":
            return URIParseResult(
                parent_type="grant_template",
                workspace_id=workspace_id,
                parent_id=parent_id,
                filename=filename,
            )
        raise ValidationError(
            "Invalid object path format. Expected format: workspace/<workspace_id>/<parent_type>/<parent_id>/<filename>.<extension>",
            context={
                "object_path": object_path,
            },
        )

    raise ValidationError(
        "Invalid object path format. Expected format: funding_organization/<organization_id>/<filename>.<extension> or workspace/<workspace_id>/<parent_type>/<parent_id>/<filename>.<extension>",
        context={
            "object_path": object_path,
        },
    )


async def create_signed_upload_url(
    application_id: str | None,
    blob_name: str,
    organization_id: str | None,
    template_id: str | None,
    workspace_id: str | None,
) -> str:
    blob_path = construct_object_uri(
        application_id=application_id,
        blob_name=blob_name,
        organization_id=organization_id,
        template_id=template_id,
        workspace_id=workspace_id,
    )
    try:
        bucket = await run_sync(get_bucket)

        blob = bucket.blob(blob_path)

        signed_url = await run_sync(
            lambda: blob.generate_signed_url(
                version="v4",
                expiration=ONE_MINUTE_SECONDS * 5,
                method="PUT",
            )
        )

        logger.info(
            "Created signed upload URL",
            blob_name=blob_name,
        )

        return cast("str", signed_url)
    except ClientError as e:
        logger.error("Failed to create signed upload URL", blob_path=blob_path, exc_info=e)
        raise ExternalOperationError(
            "Failed to create signed upload URL",
            context={
                "blob_path": blob_path,
                "error": str(e),
            },
        ) from e


async def upload_blob(blob_path: str, content: bytes) -> None:
    try:
        bucket = await run_sync(get_bucket)
        blob = bucket.blob(blob_path)

        await run_sync(lambda: blob.upload_from_string(content))

        logger.info(
            "Uploaded blob",
            blob_path=blob_path,
        )
    except ClientError as e:
        logger.error("Failed to upload blob", blob_path=blob_path, exc_info=e)
        raise ExternalOperationError(
            "Failed to upload blob",
            context={
                "blob_path": blob_path,
                "error": str(e),
            },
        ) from e
