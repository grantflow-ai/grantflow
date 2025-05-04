import os
from logging import Logger, getLogger

import pytest
from dotenv import load_dotenv
from faker import Faker
from structlog import configure
from structlog.testing import LogCapture


@pytest.fixture(autouse=True)
def stub_env() -> None:
    load_dotenv()  # we use a real env file for E2E tests, but it's not always present ~keep
    os.environ["TOKENIZERS_PARALLELISM"] = (
        "false"  # we don't want to run tokenizers in parallel due to pytest limitations ~keep
    )

    mock_creds = '{"type":"service_account","project_id":"grantflow","private_key_id":"abc","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+0J+xaF97Kqhq\\naahY04lj7dO+xyZHMKt3NXy0FSvpNUscx9UB8UVh9D/QvJ0zgfRo9G0kfEpmKE86\\nRFd9tCW2ytnMbdi7XRF9eSVJXjpGh/5pXvhakb/6+BHJoFriYeYU/QHWesIDr0An\\nDG5H9pLGXBzGJ34rGfPmVseh3xKdnZzcPvdjNj6OMbNpwxkwFJupRB9I3pvYIjQw\\nEH1ca5JYrAYwm6jspO6liZKVQCuqTvkWQZdG8SEHtoaIXJyDgvT20vTmlV5Ktzxt\\n9F3MHDncqNFTmAIQvOe+Lq14gWkEznBhZ8y/tgmVEC//RZyHySI3GPSQZg8nQwKZ\\nlAq7p4UDAgMBAAECggEABxHVZS1iddLSV6PT1VMvXpROZRtBxzZ1atE4FiGVQbQm\\nKbh+hDh1TOvQjPiMX7E12KXsJeaJ5JFvqaHH+ZOsmyvrAp0kV1NfqMPiMULrpIKZ\\nzx0qvIBDOCh5kFWXwgxnFzgG0JkVXq2a6lG9FVGSZbKVLmDXFPCKpQgohL2A71Xl\\n25AfWXSYXX5WH3cE/UCtxwtBpVoYOopPgwJh1wN9TUKuOqzP6/3+SgQMBExNIT2s\\nDPzqJ49bjPpQiPBOZOxJWIYYTdUi/YpQVTZ3vGytpUAKgcKS0SMqEVCRWqMzOxqH\\no27pUcvCWUvB99v77HsJQUwWCrOSsKK5L7vDG/1aOQKBgQDu8RH6QMi9BnNYCc4E\\nRTbBQeNNZkRpD4h43PynIJM0YhBXULD+LE4h/27nAEOu+5iFW/LkwxoMcf30UhXN\\n3OjtjfMzR7FcLuTQQzGbIa0xEbvk0VE0JPu8/lZnzVeuehvC6mKqIQtv4jDGrpVU\\nkJB8axrLQTUMnbKTHdz+/UhxCQKBgQDMO5EMCUY9LMzTD1R+BK4r3qrFqKJGp1wd\\nLVcUvLZv5A3mzFKrHyeATw6NCMp4iSDcNCwQCuFUjYYYmmc68AE0GkU5JOSi3Xw9\\noOtRQKHpFN1p01FpuZ/h99qrnCLjQkF4ooJOa2ixrBGWfxCLSNAFrRJEYpSsKS+U\\nWKHRMWRiuwKBgDdfn0PChFhzQZjTVJPRwj+vc7jJcpnm2eSH4qb5KD3OB3/JTLZ6\\nxJ6w7mIPSADZGO4IX12O+FdEQeakiWKsR9VBBdRwQDnVEYqrcGqddIv27RTrBV3I\\nXJOSKyVQwGEVRITFbZXVwVDj2fIVndfng+RFBiQ+5pZ7KR0A9D+A1RhpAoGBAMSm\\nUjrDnaz6RiaRguBpWqS9QzJmFbhxcl7hRa7lrqWzBhHjvBwE9OkTqMJ7TYBw6bMc\\nxO3lXDxIhTqNw0Y7MsZZdO96NvuB3Z2FHH7Vw/CcPA0jzUgqqwJcyBZIkl8nx0HN\\nZ/qQ5jLIiCzI+ixoZsZJYpxkxZgcDTjGK7n45D/bAoGAB1ALGisNkA8OR35oMedk\\n9NwsnksdOz0DHcuHE7APDiCNkGVp2x0ZrGRBV6x+qy6hgYFLNB+kDxNtWvyDkiLO\\nDC5XUA4mPF4btHgvVG3/5NpVJZGU2r9M07zHYyCdFCBFX93+EKMNYFLtC75Cj3A+\\nrQVqm5nZC/+90P2uFCFnO5c=\\n-----END PRIVATE KEY-----\\n","client_email":"x@grantflow.iam.gserviceaccount.com","client_id":"1000000000","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"","universe_domain":"googleapis.com"}'
    os.environ.setdefault("FIREBASE_SERVICE_ACCOUNT_CREDENTIALS", mock_creds)
    os.environ.setdefault("LLM_SERVICE_ACCOUNT_CREDENTIALS", mock_creds)
    os.environ.setdefault("JWT_SECRET", "abc123")
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "grantflow")
    os.environ.setdefault("GOOGLE_CLOUD_REGION", "us-central1")
    os.environ.setdefault("ADMIN_ACCESS_CODE", "123456")
    os.environ.setdefault("ANTHROPIC_API_KEY", "sd-ant-api03-ABC123")
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "grantflow")
    os.environ.setdefault("GOOGLE_CLOUD_REGION", "us-central1")


@pytest.fixture(scope="session")
def faker() -> Faker:
    return Faker()


@pytest.fixture
def log_output() -> LogCapture:
    return LogCapture()


@pytest.fixture(autouse=True)
def configure_structlog(log_output: LogCapture) -> None:
    configure(processors=[log_output])


@pytest.fixture(scope="session")
def logger() -> Logger:
    return getLogger("e2e")
