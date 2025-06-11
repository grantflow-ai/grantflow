from packages.shared_utils.src.logger import configured_ref, get_logger


async def test_get_logger_returns_logger() -> None:
    # Reset state
    configured_ref.value = None

    logger = get_logger("test_module")

    # Basic checks - logger should exist and have basic logging methods
    assert logger is not None
    assert hasattr(logger, "info")
    assert hasattr(logger, "error")
    assert hasattr(logger, "warning")
    assert hasattr(logger, "debug")

    # Should be configured after first call
    assert configured_ref.value is True


async def test_get_logger_subsequent_calls() -> None:
    # Ensure it's configured
    configured_ref.value = True

    logger1 = get_logger("test_module1")
    logger2 = get_logger("test_module2")

    # Both should return valid loggers
    assert logger1 is not None
    assert logger2 is not None

    # Should remain configured
    assert configured_ref.value is True
