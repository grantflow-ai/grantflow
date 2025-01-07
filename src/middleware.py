from sanic import Request, Unauthorized

from src.db.connection import get_session_maker
from src.utils.jwt import verify_jwt_token
from src.utils.logging import get_logger

logger = get_logger(__name__)

PUBLIC_PATHS = {"login", "health", "grant-templates"}


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
    if request.method == "OPTIONS" or any(request.path == f"/{path}" for path in PUBLIC_PATHS):
        return

    jwt_token = request.headers.get("Authorization", "").removeprefix("Bearer ") or request.args.get("otp")
    if not jwt_token:
        raise Unauthorized

    request.ctx.firebase_uid = verify_jwt_token(jwt_token)
