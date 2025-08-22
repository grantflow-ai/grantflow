"""Firestore utilities for the scraper service."""

from __future__ import annotations

import time
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from google.cloud import firestore
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger

if TYPE_CHECKING:
    from google.cloud.firestore import AsyncClient, AsyncCollectionReference
    from services.scraper.src.dtos import GrantInfo

logger = get_logger(__name__)


def get_firestore_client() -> AsyncClient:
    """Get Firestore client instance.

    Returns:
        AsyncClient: Firestore async client
    """
    project_id = get_env("GCP_PROJECT_ID", fallback="grantflow")
    return firestore.AsyncClient(project=project_id)


async def get_grants_collection() -> AsyncCollectionReference:
    """Get the grants collection reference.

    Returns:
        AsyncCollectionReference: Reference to grants collection
    """
    client = get_firestore_client()
    return client.collection("grants")


async def get_subscriptions_collection() -> AsyncCollectionReference:
    """Get the subscriptions collection reference.

    Returns:
        AsyncCollectionReference: Reference to subscriptions collection
    """
    client = get_firestore_client()
    return client.collection("subscriptions")


async def save_grant_document(grant_info: GrantInfo) -> str:
    """Save a grant document to Firestore.

    Args:
        grant_info: Grant information dictionary

    Returns:
        str: Document ID of saved grant
    """
    start_time = time.time()
    collection = await get_grants_collection()

    # Extract identifier from URL if available
    url = grant_info.get("url", "")
    grant_id = url.split("/")[-1] if url else None

    # Prepare document data
    doc_data = {
        **grant_info,
        "created_at": datetime.now(UTC).isoformat(),
        "updated_at": datetime.now(UTC).isoformat(),
        "scraped_at": datetime.now(UTC).isoformat(),
    }

    # Save document with custom ID if available, otherwise auto-generate
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

    return grant_id


async def save_grant_page_content(grant_id: str, content: str) -> None:
    """Save grant page content to Firestore.

    Args:
        grant_id: Grant document ID
        content: Markdown content of grant page
    """
    start_time = time.time()
    collection = await get_grants_collection()

    doc_ref = collection.document(grant_id)
    await doc_ref.update(
        {
            "page_content": content,
            "content_scraped_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
        }
    )

    duration = time.time() - start_time
    logger.info(
        "Saved grant page content to Firestore",
        grant_id=grant_id,
        content_length=len(content),
        duration_ms=round(duration * 1000, 2),
    )


async def get_existing_grant_identifiers() -> set[str]:
    """Get existing grant identifiers from Firestore.

    Returns:
        set[str]: Set of existing grant IDs
    """
    start_time = time.time()
    collection = await get_grants_collection()

    # Query all documents but only fetch IDs
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
    """Save multiple grants to Firestore in batch.

    Args:
        grants: List of grant information dictionaries

    Returns:
        int: Number of grants saved
    """
    start_time = time.time()
    client = get_firestore_client()
    collection = await get_grants_collection()

    batch = client.batch()
    saved_count = 0

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

        # Firestore batch limit is 500 operations
        if saved_count % 500 == 0:
            await batch.commit()
            batch = client.batch()

    # Commit remaining operations
    if saved_count % 500 != 0:
        await batch.commit()

    duration = time.time() - start_time
    logger.info(
        "Batch saved grants to Firestore",
        count=saved_count,
        duration_ms=round(duration * 1000, 2),
    )

    return saved_count
