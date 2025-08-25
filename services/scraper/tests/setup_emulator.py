import os
import subprocess
import sys
import time
from pathlib import Path

from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)


def is_firestore_emulator_running() -> bool:
    try:
        import socket

        emulator_host = os.getenv("FIRESTORE_EMULATOR_HOST", "localhost:8080")
        host, port = emulator_host.split(":")

        with socket.create_connection((host, int(port)), timeout=2):
            return True
    except Exception:
        return False


def start_firestore_emulator() -> subprocess.Popen[bytes]:
    logger.info("Starting Firestore emulator")

    cmd = ["gcloud", "emulators", "firestore", "start", "--host-port=localhost:8080", "--project=grantflow-test"]

    process = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=Path(__file__).parent.parent.parent.parent
    )

    max_wait = 30
    waited = 0
    while waited < max_wait:
        if is_firestore_emulator_running():
            logger.info("Firestore emulator is ready")
            return process
        time.sleep(1)
        waited += 1

    process.terminate()
    raise RuntimeError("Firestore emulator failed to start within 30 seconds")


def ensure_firestore_emulator() -> None:
    os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
    os.environ["GCP_PROJECT_ID"] = "grantflow-test"

    if is_firestore_emulator_running():
        logger.info("Firestore emulator is already running")
        return

    logger.info("Firestore emulator not running, attempting to start")
    try:
        start_firestore_emulator()
    except Exception as e:
        logger.error("Failed to start Firestore emulator", error=str(e))
        sys.exit(1)


def setup_test_environment() -> None:
    logger.info("Setting up scraper e2e test environment")

    ensure_firestore_emulator()

    os.environ.update(
        {
            "FIRESTORE_EMULATOR_HOST": "localhost:8080",
            "GCP_PROJECT_ID": "grantflow-test",
            "ENVIRONMENT": "test",
            "E2E_TESTS": "1",
            "DISCORD_WEBHOOK_URL": "",
        }
    )

    logger.info("Scraper e2e test environment ready")


if __name__ == "__main__":
    setup_test_environment()
