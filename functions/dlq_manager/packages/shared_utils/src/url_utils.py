from urllib.parse import urlparse, urlunparse


def normalize_url(url: str) -> str:
    if not url or not isinstance(url, str):
        return url

    try:
        parsed = urlparse(url.strip())

        scheme = parsed.scheme.lower() if parsed.scheme else ""

        netloc = parsed.netloc.lower() if parsed.netloc else ""

        if netloc:
            if netloc.endswith(":80") and scheme == "http":
                netloc = netloc[:-3]
            elif netloc.endswith(":443") and scheme == "https":
                netloc = netloc[:-4]

        path = parsed.path
        if path and path != "/" and path.endswith("/"):
            path = path.rstrip("/")
        elif not path:
            path = "/"

        return urlunparse((scheme, netloc, path, "", "", ""))

    except Exception:
        return url
