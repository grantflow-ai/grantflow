from http import HTTPStatus
from unittest.mock import AsyncMock, Mock, patch

from litestar import Litestar
from litestar.connection.request import Request
from sqlalchemy.exc import SQLAlchemyError

from packages.shared_utils.src.exceptions import BackendError, DeserializationError
from packages.shared_utils.src.server import (
    create_exception_handler,
    create_litestar_app,
    create_session_maker_server_startup,
    exception_serializer_processor,
)


async def test_exception_serializer_processor_with_tuple() -> None:
    error = BackendError("Test error")
    event_dict = {"exc_info": (BackendError, error, None)}

    result = exception_serializer_processor(None, "", event_dict)

    assert "exc_info" in result
    assert isinstance(result["exc_info"], dict)
    assert result["exc_info"]["type"] == "BackendError"
    assert result["exc_info"]["message"] == "BackendError: Test error"


async def test_exception_serializer_processor_with_exception() -> None:
    error = SQLAlchemyError("SQL error")
    event_dict = {"exc_info": error, "other_error": BackendError("Other error")}

    result = exception_serializer_processor(None, "", event_dict)

    assert "exc_info" in result
    assert isinstance(result["exc_info"], dict)
    assert result["exc_info"]["type"] == "SQLAlchemyError"
    assert result["exc_info"]["message"] == "SQL error"

    assert "other_error" in result
    assert isinstance(result["other_error"], dict)
    assert result["other_error"]["type"] == "BackendError"
    assert result["other_error"]["message"] == "BackendError: Other error"


async def test_create_exception_handler_sqlalchemy_error() -> None:
    logger = Mock()
    handler = create_exception_handler(logger)
    exception = SQLAlchemyError("Database error")
    request = Mock(spec=Request)

    response = handler(request, exception)

    logger.error.assert_called_once()
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert isinstance(response.content, dict)
    assert response.content["message"] == "An unexpected database error occurred"
    assert response.content["detail"] == "Database error"


async def test_create_exception_handler_deserialization_error() -> None:
    logger = Mock()
    handler = create_exception_handler(logger)
    exception = DeserializationError("Failed to parse JSON")
    request = Mock(spec=Request)

    response = handler(request, exception)

    logger.error.assert_called_once()
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert isinstance(response.content, dict)
    assert response.content["message"] == "Failed to deserialize the request body"
    assert response.content["detail"] == "DeserializationError: Failed to parse JSON"


async def test_create_exception_handler_generic_error() -> None:
    logger = Mock()
    handler = create_exception_handler(logger)
    exception = ValueError("Generic error")
    request = Mock(spec=Request)

    response = handler(request, exception)

    logger.error.assert_called_once()
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert isinstance(response.content, dict)
    assert response.content["message"] == "An unexpected backend error occurred"
    assert response.content["detail"] == "Generic error"


async def test_create_session_maker_server_startup_success() -> None:
    logger = Mock()
    startup_hook = create_session_maker_server_startup(logger)
    app_instance = Mock(spec=Litestar)

    # Create a proper async context manager
    session = AsyncMock()
    async_cm = AsyncMock()
    async_cm.__aenter__.return_value = session

    session_maker = Mock()
    session_maker.return_value = async_cm

    with patch("packages.shared_utils.src.server.get_session_maker", return_value=session_maker):
        await startup_hook(app_instance)  # type: ignore[call-arg]

    logger.info.assert_called_once_with("DB connection established.")
    assert app_instance.state.session_maker == session_maker
    session.execute.assert_called_once()


async def test_create_session_maker_server_startup_failure() -> None:
    logger = Mock()
    startup_hook = create_session_maker_server_startup(logger)
    app_instance = Mock(spec=Litestar)

    # Create a proper async context manager
    session = AsyncMock()
    session.execute.side_effect = SQLAlchemyError("Connection failed")
    async_cm = AsyncMock()
    async_cm.__aenter__.return_value = session

    session_maker = Mock()
    session_maker.return_value = async_cm

    with (
        patch("packages.shared_utils.src.server.get_session_maker", return_value=session_maker),
        patch("packages.shared_utils.src.server.sys.exit") as mock_exit,
    ):
        await startup_hook(app_instance)  # type: ignore[call-arg]

    logger.error.assert_called_once()
    mock_exit.assert_called_once_with(1)


async def test_create_litestar_app_basic() -> None:
    logger = Mock()

    with patch("packages.shared_utils.src.server.get_env", return_value=""):
        app = create_litestar_app(logger)

    assert isinstance(app, Litestar)

    # Check that health check endpoint was added
    routes = {route.path for route in app.routes}
    assert "/health" in routes

    # Check that session_maker was added
    assert "session_maker" in app.dependencies
    assert app.on_startup


async def test_create_litestar_app_with_custom_routes() -> None:
    from litestar import get

    logger = Mock()

    @get("/custom")
    async def custom_route() -> str:
        return "custom"

    with patch("packages.shared_utils.src.server.get_env", return_value=""):
        app = create_litestar_app(logger, route_handlers=[custom_route])

    # Check that routes were added
    routes = {route.path for route in app.routes}
    assert "/custom" in routes
    assert "/health" in routes


async def test_create_litestar_app_without_session_maker() -> None:
    logger = Mock()

    with patch("packages.shared_utils.src.server.get_env", return_value=""):
        app = create_litestar_app(logger, add_session_maker=False)

    # Check that session_maker was not added
    assert not hasattr(app.dependencies, "session_maker") or app.dependencies["session_maker"] is None
    assert not app.on_startup or not len(app.on_startup)
