import os
import time
from datetime import UTC, datetime

import google.auth.credentials
from google.cloud import firestore
from google.cloud.exceptions import GoogleCloudError
from google.cloud.firestore import AsyncClient, AsyncCollectionReference
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from services.scraper.src.dtos import GrantInfo, validate_grant_data

logger = get_logger(__name__)


def get_firestore_client() -> AsyncClient:
    project_id = get_env("GCP_PROJECT_ID", fallback="grantflow")

    emulator_host = os.getenv("FIRESTORE_EMULATOR_HOST")

    try:
        if emulator_host:
            logger.info("Using Firestore emulator", host=emulator_host, project_id=project_id)
            credentials = google.auth.credentials.AnonymousCredentials()  # type: ignore[no-untyped-call]
            return firestore.AsyncClient(project=project_id, credentials=credentials)
        logger.info("Using production Firestore", project_id=project_id)
        return firestore.AsyncClient(project=project_id)
    except GoogleCloudError as e:
        logger.error(
            "Failed to create Firestore client", project_id=project_id, emulator_host=emulator_host, error=str(e)
        )
        raise


async def get_grants_collection() -> AsyncCollectionReference:
    client = get_firestore_client()
    return client.collection("grants")


async def save_grant_document(grant_info: GrantInfo) -> str:
    start_time = time.time()

    validation_errors = validate_grant_data(grant_info)
    if validation_errors:
        logger.warning("Invalid grant data", errors=validation_errors, grant_info=grant_info)
        raise ValueError(f"Invalid grant data: {', '.join(validation_errors)}")

    try:
        collection = await get_grants_collection()

        url = grant_info.get("url", "")
        grant_id: str | None = url.split("/")[-1] if url else None

        doc_data = {
            **grant_info,
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            "scraped_at": datetime.now(UTC).isoformat(),
        }

        if grant_id:
            doc_ref = collection.document(grant_id)
            await doc_ref.set(doc_data, merge=True)
        else:
            doc_ref = await collection.add(doc_data)
            grant_id = doc_ref.id

        duration = time.time() - start_time
        logger.info(
            "Saved grant document to Firestore",
            grant_id=grant_id,
            duration_ms=round(duration * 1000, 2),
        )

        if grant_id is None:
            raise ValueError("Grant ID should never be None at this point")
        return grant_id

    except GoogleCloudError as e:
        duration = time.time() - start_time
        logger.error(
            "Failed to save grant document to Firestore",
            grant_info=grant_info,
            duration_ms=round(duration * 1000, 2),
            error=str(e),
        )
        raise


async def save_grant_page_content(grant_id: str, content: str) -> None:
    start_time = time.time()
    collection = await get_grants_collection()

    doc_ref = collection.document(grant_id)
    await doc_ref.set(
        {
            "page_content": content,
            "content_scraped_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
        },
        merge=True,
    )

    duration = time.time() - start_time
    logger.info(
        "Saved grant page content to Firestore",
        grant_id=grant_id,
        content_length=len(content),
        duration_ms=round(duration * 1000, 2),
    )


async def get_existing_grant_identifiers() -> set[str]:
    start_time = time.time()
    collection = await get_grants_collection()

    docs = collection.select([]).stream()
    identifiers = {doc.id async for doc in docs}

    duration = time.time() - start_time
    logger.info(
        "Retrieved existing grant identifiers from Firestore",
        count=len(identifiers),
        duration_ms=round(duration * 1000, 2),
    )

    return identifiers


async def batch_save_grants(grants: list[GrantInfo]) -> int:
    start_time = time.time()
    saved_count = 0

    try:
        client = get_firestore_client()
        collection = await get_grants_collection()

        batch = client.batch()

        for grant_info in grants:
            url = grant_info.get("url", "")
            grant_id = url.split("/")[-1] if url else None

            doc_data = {
                **grant_info,
                "created_at": datetime.now(UTC).isoformat(),
                "updated_at": datetime.now(UTC).isoformat(),
                "scraped_at": datetime.now(UTC).isoformat(),
            }

            doc_ref = collection.document(grant_id) if grant_id else collection.document()

            batch.set(doc_ref, doc_data, merge=True)
            saved_count += 1

            if saved_count % 500 == 0:
                await batch.commit()
                batch = client.batch()

        if saved_count % 500 != 0:
            await batch.commit()

        duration = time.time() - start_time
        logger.info(
            "Batch saved grants to Firestore",
            count=saved_count,
            duration_ms=round(duration * 1000, 2),
        )

        return saved_count

    except GoogleCloudError as e:
        duration = time.time() - start_time
        logger.error(
            "Failed to batch save grants to Firestore",
            total_grants=len(grants),
            saved_count=saved_count,
            duration_ms=round(duration * 1000, 2),
            error=str(e),
        )
        raise
