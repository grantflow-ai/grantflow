from datetime import date

from services.scraper.src.search_data import create_query_string


def test_create_query_string() -> None:
    from_date = date(2020, 1, 1)
    to_date = date(2020, 12, 31)

    query_string = create_query_string(from_date, to_date)

    expected_query = (
        "query=empty&type=all&foa=all&parent_orgs=all&orgs=all&ac=all&ct=all&pfoa=all"
        "&date=01012020-12312020&fields=all&spons=true"
    )

    assert query_string == expected_query
