from cloud_functions.src.auth_blocking.main import is_grantflow_email


def test_is_grantflow_email_valid() -> None:
    assert is_grantflow_email("user@grantflow.ai") is True
    assert is_grantflow_email("team.member@grantflow.ai") is True
    assert is_grantflow_email("test+tag@grantflow.ai") is True


def test_is_grantflow_email_invalid() -> None:
    assert is_grantflow_email("user@gmail.com") is False
    assert is_grantflow_email("user@company.com") is False
    assert is_grantflow_email("user@grantflow.com") is False
    assert is_grantflow_email("user@subdomain.grantflow.ai") is False
    assert is_grantflow_email("") is False
    assert is_grantflow_email("invalid-email") is False
