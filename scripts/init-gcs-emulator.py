#!/usr/bin/env python3
import json
import os
import sys
import time
from urllib import request
from urllib.error import URLError

EMULATOR_HOST = os.getenv("STORAGE_EMULATOR_HOST", "http://localhost:4443")
BUCKET_NAME = "grantflow-uploads"
MAX_RETRIES = 30
RETRY_DELAY = 1


def wait_for_emulator() -> bool:
    print(f"Waiting for GCS emulator at {EMULATOR_HOST}")
    for i in range(MAX_RETRIES):
        try:
            req = request.Request(f"{EMULATOR_HOST}/storage/v1/b")
            with request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    print("GCS emulator is ready")
                    return True
        except (URLError, OSError):
            pass
        print(f"Waiting for emulator... ({i + 1}/{MAX_RETRIES})")
        time.sleep(RETRY_DELAY)
    print("Timeout waiting for GCS emulator")
    return False


def create_bucket() -> bool:
    try:
        req = request.Request(f"{EMULATOR_HOST}/storage/v1/b/{BUCKET_NAME}")
        with request.urlopen(req) as response:
            if response.status == 200:
                print(f"Bucket '{BUCKET_NAME}' already exists")
                return True
    except URLError:
        pass

    print(f"Creating bucket '{BUCKET_NAME}'")
    try:
        data = json.dumps({"name": BUCKET_NAME}).encode('utf-8')
        req = request.Request(
            f"{EMULATOR_HOST}/storage/v1/b",
            data=data,
            headers={"Content-Type": "application/json"},
            method='POST'
        )
        with request.urlopen(req) as response:
            if response.status == 200:
                print(f"Bucket '{BUCKET_NAME}' created successfully")
                return True
            if response.status == 409:
                print(f"Bucket '{BUCKET_NAME}' already exists")
                return True
            print(f"Failed to create bucket: {response.status} - {response.read().decode()}")
            return False
    except URLError as e:
        if hasattr(e, 'code') and e.code == 409:
            print(f"Bucket '{BUCKET_NAME}' already exists")
            return True
        print(f"Error creating bucket: {e}")
        return False


def main() -> int:
    if not wait_for_emulator():
        return 1

    if not create_bucket():
        return 1

    print("GCS emulator initialization complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
