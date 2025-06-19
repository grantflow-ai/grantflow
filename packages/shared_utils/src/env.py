import os


def get_env(
    key: str, raise_on_missing: bool = True, fallback: str | None = None
) -> str:
    value = os.environ.get(key, fallback or "")
    if not value and raise_on_missing:
        raise ValueError(f"Missing environment variable: {key}")

    return value
