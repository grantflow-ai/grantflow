from http import HTTPStatus

from pytest_mock import MockerFixture
from services.backend.src.api.http.auth import LoginRequestBody

from tests.conftest import TestingClientType


async def test_login_success(test_client: TestingClientType, mocker: MockerFixture) -> None:
    mocker.patch("jwt.encode", return_value="jwt_token")

    response = await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))
    assert response.status_code == HTTPStatus.CREATED
    response_body = response.json()
    assert response_body["jwt_token"] == "jwt_token"
