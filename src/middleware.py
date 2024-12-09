import logging

from sanic import Request, Unauthorized

from src.db.connection import get_session_maker
from src.utils.firebase import verify_jwt_token

logger = logging.getLogger(__name__)


def set_session_maker(request: Request) -> None:
    """Middleware to create a session maker for each request.

    Args:
        request: The request object.
    """
    request.ctx.session_maker = get_session_maker()


async def authenticate_user(request: Request) -> None:
    """Middleware to authenticate the user using firebase admin.

    Raises:
        Unauthorized: If the user is not authenticated.

    Args:
        request: The request object.
    """
    if request.method == "OPTIONS" or request.path == "/login":
        return

    authorization_header = request.headers.get("Authorization", "")
    if not authorization_header:
        raise Unauthorized

    request.ctx.firebase_uid = verify_jwt_token(authorization_header.removeprefix("Bearer "))
