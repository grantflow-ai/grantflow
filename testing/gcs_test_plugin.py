import os
from collections.abc import AsyncGenerator
from socket import AF_INET, SOCK_STREAM, socket
from uuid import uuid4

import pytest
from anyio import run_process, sleep
from google.cloud import storage
from packages.shared_utils.src.gcs import bucket_ref, get_bucket, get_storage_client, storage_client_ref
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)


@pytest.fixture(scope="session")
async def gcs_emulator_host() -> AsyncGenerator[str]:
    container_name = f"test_gcs_emulator_{uuid4().hex[:8]}"

    with socket(AF_INET, SOCK_STREAM) as s:
        s.bind(("", 0))
        local_port = s.getsockname()[1]

    await run_process(["docker", "rm", "-f", container_name], check=False)

    await run_process(
        [
            "docker",
            "run",
            "--name",
            container_name,
            "-p",
            f"{local_port}:4443",
            "-d",
            "fsouza/fake-gcs-server:latest",
            "-scheme",
            "routes",
            "-port",
            "4443",
            "-public-host",
            "localhost",
            "-backend",
            "memory",
        ]
    )

    await sleep(3)

    emulator_host = f"http://localhost:{local_port}"
    os.environ["STORAGE_EMULATOR_HOST"] = emulator_host
    os.environ["GCS_BUCKET_NAME"] = "test-bucket"
    os.environ["GOOGLE_CLOUD_PROJECT"] = "test-project"

    storage_client_ref.value = None
    bucket_ref.value = None

    yield emulator_host

    await run_process(["docker", "rm", "-f", container_name], check=False)


@pytest.fixture
async def storage_client(gcs_emulator_host: str) -> storage.Client:
    storage_client_ref.value = None
    bucket_ref.value = None

    return get_storage_client()


@pytest.fixture
async def storage_bucket(storage_client: storage.Client) -> storage.Bucket:
    bucket_ref.value = None

    return get_bucket()
