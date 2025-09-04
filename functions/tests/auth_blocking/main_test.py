from functions.src.auth_blocking.main import is_authorized_email


def test_is_authorized_email_grantflow_domain() -> None:
    assert is_authorized_email("user@grantflow.ai") is True
    assert is_authorized_email("team.member@grantflow.ai") is True
    assert is_authorized_email("test+tag@grantflow.ai") is True
    assert is_authorized_email("USER@GRANTFLOW.AI") is True


def test_is_authorized_email_whitelisted() -> None:
    assert is_authorized_email("jacob.hanna@weizmann.ac.il") is True
    assert is_authorized_email("koren_7@icloud.com") is True
    assert is_authorized_email("masha.niv@mail.huji.ac.il") is True
    assert is_authorized_email("mor.grinstein@gmail.com") is True
    assert is_authorized_email("odedrechavi@gmail.com") is True
    assert is_authorized_email("ronelasaf@gmail.com") is True
    assert is_authorized_email("rotem1shalita@gmail.com") is True
    assert is_authorized_email("rotblat@bgu.ac.il") is True
    assert is_authorized_email("weilmiguel@gmail.com") is True
    assert is_authorized_email("yaelcoh@tlvmc.gov.il") is True


def test_is_authorized_email_case_insensitive_whitelist() -> None:
    assert is_authorized_email("JACOB.HANNA@WEIZMANN.AC.IL") is True
    assert is_authorized_email("Yaelcoh@tlvmc.gov.il") is True
    assert is_authorized_email("RONELASAF@GMAIL.COM") is True


def test_is_authorized_email_invalid() -> None:
    assert is_authorized_email("user@gmail.com") is False
    assert is_authorized_email("user@company.com") is False
    assert is_authorized_email("user@grantflow.com") is False
    assert is_authorized_email("user@subdomain.grantflow.ai") is False
    assert is_authorized_email("notwhitelisted@gmail.com") is False
    assert is_authorized_email("") is False
    assert is_authorized_email("invalid-email") is False
