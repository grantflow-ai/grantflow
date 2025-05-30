from typing import TYPE_CHECKING, Any, cast
from uuid import UUID

from litestar import websocket
from litestar.exceptions import ValidationException
from litestar.status_codes import WS_1006_ABNORMAL_CLOSURE
from packages.db.src.enums import UserRoleEnum
from packages.db.src.utils import retrieve_application
from packages.shared_utils.src.exceptions import BackendError
from packages.shared_utils.src.logger import get_logger
from services.backend.src.common_types import APIWebsocket
from services.backend.src.dto import WebsocketDataMessage, WebsocketErrorMessage
from sqlalchemy.ext.asyncio import async_sessionmaker

from .constants import EVENT_APPLICATION_CREATED
from .handlers import handle_create_application, handle_user_data_message
from .utils import MessageHandler, prepare_wizard_response

if TYPE_CHECKING:
    from litestar.stores.valkey import ValkeyStore

logger = get_logger(__name__)


@websocket(
    [
        "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}",
        "/workspaces/{workspace_id:uuid}/applications/new",
    ],
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="GrantApplicationWebsocket",
)
async def handle_application_websocket(
    session_maker: async_sessionmaker[Any],
    socket: APIWebsocket,
    workspace_id: UUID,
    application_id: UUID | None = None,
) -> None:
    await socket.accept()
    handler = MessageHandler(socket)

    try:
        store = cast("ValkeyStore", socket.app.stores.get(str(application_id if application_id else "temp")))

        if not application_id:
            application_id = await handle_create_application(
                workspace_id=workspace_id, session_maker=session_maker, store=store
            )
            application = await retrieve_application(application_id=application_id, session_maker=session_maker)

            await handler.send_message(
                WebsocketDataMessage(
                    type="data",
                    event=EVENT_APPLICATION_CREATED,
                    content=prepare_wizard_response(application),  # type: ignore
                    message="Application created successfully",
                ),
            )

            store = cast("ValkeyStore", socket.app.stores.get(str(application_id)))

        while data := await socket.receive_json():
            if data.get("type") == "data":
                message = WebsocketDataMessage(**data)
                await handle_user_data_message(
                    event_type=message.event,
                    data=message.content,
                    handler=handler,
                    application_id=application_id,
                    session_maker=session_maker,
                    store=store,
                )
    except ValidationException as e:
        await socket.close(
            code=WS_1006_ABNORMAL_CLOSURE, reason=f"WebSocket disconnected due to an validation error {e!s}"
        )
    except BackendError as e:
        logger.error("Backend error in grant application websocket", error=e)
        await handler.send_message(
            WebsocketErrorMessage(
                type="error",
                event="pipeline_error",
                content=f"Error in grant application websocket: {e!s}",
                context={"error_type": e.__class__.__name__, **e.context},
            )
        )
