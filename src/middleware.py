from sanic import Request, Unauthorized

from src.db.connection import get_session_maker
from src.utils.env import get_env
from src.utils.jwt import verify_jwt_token
from src.utils.logger import get_logger

logger = get_logger(__name__)

PUBLIC_PATHS = {"login", "health"}
ADMIN_PATHS = {"organizations"}


def set_session_maker(request: Request) -> None:
    """Middleware to create a session maker for each request.

    Args:
        request: The request object.
    """
    request.ctx.session_maker = get_session_maker()


async def authenticate_request(request: Request) -> None:
    """Middleware to authenticate the user using firebase admin.

    Raises:
        Unauthorized: If the user is not authenticated.

    Args:
        request: The request object.
    """
    if request.method == "OPTIONS" or any(request.path == f"/{path}" for path in PUBLIC_PATHS):
        return

    auth_header = request.headers.get("Authorization", "").strip()

    if any(request.path.startswith(f"/{path}") for path in ADMIN_PATHS):
        access_code = get_env("ADMIN_ACCESS_CODE")
        if auth_header and auth_header == access_code:
            return
        raise Unauthorized

    bearer_token = auth_header.removeprefix("Bearer").strip() if auth_header.startswith("Bearer") else None
    if bearer_token:
        request.ctx.firebase_uid = verify_jwt_token(bearer_token)
        return

    if otp := request.args.get("otp"):
        request.ctx.firebase_uid = verify_jwt_token(otp)
        return

    raise Unauthorized
