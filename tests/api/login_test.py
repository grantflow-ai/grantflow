from http import HTTPStatus

from pytest_mock import MockerFixture
from sanic_testing.testing import SanicASGITestClient

from src.api.api_types import LoginRequestBody, LoginResponse
from src.utils.serialization import deserialize


async def test_login_success(asgi_client: SanicASGITestClient, mocker: MockerFixture) -> None:
    with mocker.patch("jwt.encode", return_value="jwt_token"):
        _, response = await asgi_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))
        assert response.status_code == HTTPStatus.OK
        response_body = deserialize(response.body, LoginResponse)
        assert response_body["jwt_token"] == "jwt_token"
