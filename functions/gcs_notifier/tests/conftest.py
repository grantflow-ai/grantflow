import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture(autouse=True)
def mock_packages():
    with patch("packages.shared_utils.src.env.get_env", return_value="http://test-indexer-url"):
        with patch("packages.shared_utils.src.logger.get_logger") as mock_logger:
            mock_logger_instance = MagicMock()
            # Create info method that accepts any kwargs
            mock_logger_instance.info = MagicMock()
            mock_logger_instance.error = MagicMock()
            mock_logger.return_value = mock_logger_instance
            yield
