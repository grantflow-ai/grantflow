from collections.abc import AsyncGenerator
from socket import AF_INET, SOCK_STREAM, socket

import pytest
from anyio import run_process, sleep


@pytest.fixture(scope="session")
async def valkey_connection_string() -> AsyncGenerator[str, None]:
    container_name = "test_valkey_container"

    with socket(AF_INET, SOCK_STREAM) as s:
        s.bind(("", 0))
        local_port = s.getsockname()[1]

    await run_process(["docker", "rm", "-f", container_name], check=False)

    await run_process(
        [
            "docker",
            "run",
            "--name",
            container_name,
            "-p",
            f"{local_port}:6379",
            "-d",
            "valkey/valkey:latest",
        ]
    )

    await sleep(3)

    connection_string = f"redis://0.0.0.0:{local_port}/0"

    test_command = ["docker", "exec", container_name, "redis-cli", "ping"]
    process_result = await run_process(test_command)
    assert process_result.stdout.strip().decode("utf-8") == "PONG", "Valkey container is not responding to PING"

    yield connection_string

    await run_process(["docker", "rm", "-f", container_name], check=False)
