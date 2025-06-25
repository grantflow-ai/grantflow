#!/usr/bin/env python3  ~keep
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
    for _i in range(MAX_RETRIES):
        try:
            req = request.Request(f"{EMULATOR_HOST}/storage/v1/b")
            with request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    return True
        except (URLError, OSError):
            pass
        time.sleep(RETRY_DELAY)
    return False


def create_bucket() -> bool:
    try:
        req = request.Request(f"{EMULATOR_HOST}/storage/v1/b/{BUCKET_NAME}")
        with request.urlopen(req) as response:
            if response.status == 200:
                return True
    except URLError:
        pass

    try:
        data = json.dumps({"name": BUCKET_NAME}).encode("utf-8")
        req = request.Request(
            f"{EMULATOR_HOST}/storage/v1/b", data=data, headers={"Content-Type": "application/json"}, method="POST"
        )
        with request.urlopen(req) as response:
            if response.status == 200:
                return True
            return bool(response.status == 409)
    except URLError as e:
        return bool(hasattr(e, "code") and e.code == 409)


def main() -> int:
    if not wait_for_emulator():
        return 1

    if not create_bucket():
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
