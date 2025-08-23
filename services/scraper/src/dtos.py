from typing import NotRequired, TypedDict


class GrantInfo(TypedDict):
    """A type representing a grant information row in the scrapped excel sheet."""

    title: str
    release_date: str
    expired_date: str
    activity_code: str
    organization: str
    parent_organization: str
    participating_orgs: str
    document_number: str
    document_type: str
    clinical_trials: str
    url: str
    description: NotRequired[str]
    amount: NotRequired[str]
    amount_min: NotRequired[int]
    amount_max: NotRequired[int]
    category: NotRequired[str]
    eligibility: NotRequired[str]
    deadline: NotRequired[str]


def validate_grant_data(grant_data: GrantInfo) -> list[str]:
    """Validate grant data and return list of validation errors.

    Args:
        grant_data: Grant data to validate

    Returns:
        list[str]: List of validation error messages (empty if valid)
    """
    errors: list[str] = []

    required_fields = ["title", "url", "organization"]
    errors.extend([f"Missing required field: {field}" for field in required_fields if not grant_data.get(field)])

    url = grant_data.get("url", "")
    if url and not (url.startswith(("http://", "https://"))):
        errors.append("URL must start with http:// or https://")

    title = grant_data.get("title", "")
    if len(title) > 500:
        errors.append("Title must be 500 characters or less")

    amount_min = grant_data.get("amount_min")
    amount_max = grant_data.get("amount_max")
    if amount_min is not None and amount_min < 0:
        errors.append("amount_min must be non-negative")
    if amount_max is not None and amount_max < 0:
        errors.append("amount_max must be non-negative")
    if amount_min is not None and amount_max is not None and amount_min > amount_max:
        errors.append("amount_min cannot be greater than amount_max")

    return errors
