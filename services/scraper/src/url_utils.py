def get_identifier_from_nih_url(url: str) -> str:
    return url.split("/")[-1].replace(".html", "")


def get_identifier_from_filename(filename: str) -> str:
    return filename.split(".")[0].replace("grant_search_result_", "")
