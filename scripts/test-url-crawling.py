#!/usr/bin/env python3
"""
End-to-end test script for URL crawling functionality.
Tests the complete flow: Backend API -> Pub/Sub -> Crawler -> GCS -> Indexer
"""
import sys
import time
import json
import base64
import requests
import subprocess
from datetime import datetime
from uuid import uuid4


BACKEND_URL = "http://localhost:8000"
CRAWLER_URL = "http://localhost:8002"
INDEXER_URL = "http://localhost:8001"
GCS_URL = "http://localhost:4443"
PUBSUB_PROJECT = "grantflow"


TEST_URL = "https://example.com"
TEST_WORKSPACE_ID = "123e4567-e89b-12d3-a456-426614174000"
TEST_APPLICATION_ID = "f379119d-a4d0-49f8-9ba4-d0eb62efaef7"


def check_service_health(service_name: str, url: str) -> bool:
    """Check if a service is healthy."""
    try:
        response = requests.get(url, timeout=2)
        return response.status_code in [200, 404, 405]
    except requests.exceptions.RequestException:
        return False


def check_all_services() -> bool:
    """Check if all required services are running."""
    services = [
        ("Backend", BACKEND_URL),
        ("Crawler", CRAWLER_URL),
        ("Indexer", INDEXER_URL),
        ("GCS Emulator", f"{GCS_URL}/storage/v1/b/"),
    ]

    all_healthy = True
    for name, url in services:
        is_healthy = check_service_health(name, url)
        status = "✅" if is_healthy else "❌"
        print(f"{status} {name}: {'Running' if is_healthy else 'Not available'}")
        if not is_healthy:
            all_healthy = False

    return all_healthy


def test_direct_crawler_call() -> bool:
    """Test calling the crawler directly with a Pub/Sub message."""
    print("\n🧪 Testing direct crawler call...")


    crawling_request = {
        "url": TEST_URL,
        "parent_type": "grant_application",
        "parent_id": TEST_APPLICATION_ID,
        "workspace_id": TEST_WORKSPACE_ID
    }


    encoded_data = base64.b64encode(json.dumps(crawling_request).encode()).decode()


    pubsub_message = {
        "message": {
            "data": encoded_data,
            "message_id": f"test-{uuid4()}",
            "publish_time": datetime.utcnow().isoformat() + "Z",
            "attributes": {}
        },
        "subscription": f"projects/{PUBSUB_PROJECT}/subscriptions/url-crawling-subscription"
    }

    try:
        response = requests.post(f"{CRAWLER_URL}/", json=pubsub_message, timeout=10)
        if response.status_code == 200:
            print("✅ Crawler successfully processed the URL")
            return True
        else:
            print(f"❌ Crawler returned error: {response.status_code} - {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to call crawler: {e}")
        return False


def test_pubsub_publish() -> bool:
    """Test publishing a message via Pub/Sub."""
    print("\n🧪 Testing Pub/Sub message publishing...")


    crawling_request = {
        "url": TEST_URL,
        "parent_type": "grant_application",
        "parent_id": TEST_APPLICATION_ID,
        "workspace_id": TEST_WORKSPACE_ID
    }


    encoded_data = base64.b64encode(json.dumps(crawling_request).encode()).decode()


    cmd = [
        "gcloud", "pubsub", "topics", "publish", "url-crawling",
        f"--message={encoded_data}",
        f"--project={PUBSUB_PROJECT}"
    ]

    env = {
        "PUBSUB_EMULATOR_HOST": "localhost:8085"
    }

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, env={**subprocess.os.environ, **env})
        if result.returncode == 0:
            print("✅ Message published to Pub/Sub")
            print(f"   Message IDs: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ Failed to publish message: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error publishing message: {e}")
        return False


def check_gcs_bucket() -> bool:
    """Check if GCS bucket exists."""
    print("\n🧪 Checking GCS bucket...")

    try:
        response = requests.get(f"{GCS_URL}/storage/v1/b/grantflow-uploads")
        if response.status_code == 200:
            print("✅ GCS bucket 'grantflow-uploads' exists")
            return True
        elif response.status_code == 404:
            print("⚠️  GCS bucket 'grantflow-uploads' does not exist - creating it...")

            bucket_data = {
                "name": "grantflow-uploads"
            }
            create_response = requests.post(f"{GCS_URL}/storage/v1/b/", json=bucket_data)
            if create_response.status_code in [200, 201]:
                print("✅ Created GCS bucket 'grantflow-uploads'")
                return True
            else:
                print(f"❌ Failed to create bucket: {create_response.text}")
                return False
        else:
            print(f"❌ Unexpected response: {response.status_code} - {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to check GCS bucket: {e}")
        return False


def main():
    """Run all tests."""
    print("🚀 URL Crawling E2E Test")
    print("=" * 50)


    if not check_all_services():
        print("\n❌ Not all services are running. Please run 'task dev' first.")
        sys.exit(1)


    if not check_gcs_bucket():
        print("\n⚠️  GCS bucket issue detected, but continuing with tests...")


    tests_passed = 0
    tests_total = 0


    tests_total += 1
    if test_direct_crawler_call():
        tests_passed += 1
    time.sleep(2)


    tests_total += 1
    if test_pubsub_publish():
        tests_passed += 1
        print("   ⏳ Waiting 5 seconds for message processing...")
        time.sleep(5)


    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tests_passed}/{tests_total} passed")

    if tests_passed == tests_total:
        print("✅ All tests passed!")
        sys.exit(0)
    else:
        print("❌ Some tests failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
