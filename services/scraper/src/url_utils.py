def get_identifier_from_nih_url(url: str) -> str:
    return url.split("/")[-1].replace(".html", "")
