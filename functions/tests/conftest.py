import os
from unittest.mock import Mock

import pytest


@pytest.fixture(autouse=True)
def functions_env() -> None:
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "grantflow-test")
    os.environ.setdefault("PROJECT_ID", "grantflow-test")


@pytest.fixture
def mock_request() -> Mock:
    request = Mock()
    request.data = {}
    return request
