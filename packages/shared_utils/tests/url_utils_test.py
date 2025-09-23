from unittest.mock import patch

import pytest

from packages.shared_utils.src.url_utils import normalize_url


async def test_normalize_url_basic() -> None:
    url = "https://example.com/path"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_uppercase_scheme() -> None:
    url = "HTTPS://example.com/path"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_uppercase_domain() -> None:
    url = "https://EXAMPLE.COM/path"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_mixed_case() -> None:
    url = "HTTPS://Example.COM/Path"
    result = normalize_url(url)
    assert result == "https://example.com/Path"


async def test_normalize_url_trailing_slash_removal() -> None:
    url = "https://example.com/path/"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_multiple_trailing_slashes() -> None:
    url = "https://example.com/path///"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_root_path_preserved() -> None:
    url = "https://example.com/"
    result = normalize_url(url)
    assert result == "https://example.com/"


async def test_normalize_url_no_path_adds_slash() -> None:
    url = "https://example.com"
    result = normalize_url(url)
    assert result == "https://example.com/"


async def test_normalize_url_query_parameters_removed() -> None:
    url = "https://example.com/path?param1=value1&param2=value2"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_fragments_removed() -> None:
    url = "https://example.com/path#section"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_query_and_fragment_removed() -> None:
    url = "https://example.com/path?param=value#section"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_default_http_port_removed() -> None:
    url = "http://example.com:80/path"
    result = normalize_url(url)
    assert result == "http://example.com/path"


async def test_normalize_url_default_https_port_removed() -> None:
    url = "https://example.com:443/path"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_non_default_port_preserved() -> None:
    url = "https://example.com:8080/path"
    result = normalize_url(url)
    assert result == "https://example.com:8080/path"


async def test_normalize_url_http_non_default_port_preserved() -> None:
    url = "http://example.com:8080/path"
    result = normalize_url(url)
    assert result == "http://example.com:8080/path"


async def test_normalize_url_https_80_preserved() -> None:
    url = "https://example.com:80/path"
    result = normalize_url(url)
    assert result == "https://example.com:80/path"


async def test_normalize_url_http_443_preserved() -> None:
    url = "http://example.com:443/path"
    result = normalize_url(url)
    assert result == "http://example.com:443/path"


async def test_normalize_url_comprehensive_example() -> None:
    url = "HTTPS://Example.COM/path/?param=1#section"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_default_port_example() -> None:
    url = "http://example.com:80/"
    result = normalize_url(url)
    assert result == "http://example.com/"


async def test_normalize_url_whitespace_trimmed() -> None:
    url = "  https://example.com/path  "
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_empty_string() -> None:
    url = ""
    result = normalize_url(url)
    assert result == ""


async def test_normalize_url_none_input() -> None:
    url = None
    result = normalize_url(url)  # type: ignore
    assert result is None


async def test_normalize_url_non_string_input() -> None:
    url = 123
    result = normalize_url(url)  # type: ignore
    assert str(result) == str(url)


async def test_normalize_url_malformed_url() -> None:
    url = "not-a-valid-url"
    result = normalize_url(url)
    assert result == "not-a-valid-url"


async def test_normalize_url_relative_url() -> None:
    url = "/path/to/resource"
    result = normalize_url(url)
    assert result == "/path/to/resource"


async def test_normalize_url_protocol_relative() -> None:
    url = "//example.com/path"
    result = normalize_url(url)
    assert result == "//example.com/path"


async def test_normalize_url_complex_path() -> None:
    url = "https://example.com/api/v1/users/123/posts"
    result = normalize_url(url)
    assert result == "https://example.com/api/v1/users/123/posts"


async def test_normalize_url_subdomain() -> None:
    url = "https://api.example.com/path"
    result = normalize_url(url)
    assert result == "https://api.example.com/path"


async def test_normalize_url_international_domain() -> None:
    url = "https://münchen.de/path"
    result = normalize_url(url)
    assert result == "https://münchen.de/path"


async def test_normalize_url_deduplication_scenario() -> None:
    url1 = "https://example.com/article?utm_source=twitter&utm_campaign=spring"
    url2 = "https://EXAMPLE.COM/article/?utm_source=facebook"
    url3 = "https://example.com/article#comments"

    result1 = normalize_url(url1)
    result2 = normalize_url(url2)
    result3 = normalize_url(url3)

    expected = "https://example.com/article"
    assert result1 == expected
    assert result2 == expected
    assert result3 == expected


async def test_normalize_url_github_example() -> None:
    url1 = "https://github.com/owner/repo"
    url2 = "https://GITHUB.COM/owner/repo/"
    url3 = "https://github.com/owner/repo?tab=readme"

    result1 = normalize_url(url1)
    result2 = normalize_url(url2)
    result3 = normalize_url(url3)

    expected = "https://github.com/owner/repo"
    assert result1 == expected
    assert result2 == expected
    assert result3 == expected


async def test_normalize_url_preserves_path_case() -> None:
    url = "https://example.com/API/V1/Users"
    result = normalize_url(url)
    assert result == "https://example.com/API/V1/Users"


async def test_normalize_url_ip_address() -> None:
    url = "http://192.168.1.1:8080/path"
    result = normalize_url(url)
    assert result == "http://192.168.1.1:8080/path"


async def test_normalize_url_localhost() -> None:
    url = "http://localhost:3000/app"
    result = normalize_url(url)
    assert result == "http://localhost:3000/app"


@pytest.mark.parametrize(
    "url,expected",
    [
        ("://invalid", "://invalid"),
        ("http://", "http:///"),
        ("https://", "https:///"),
        (
            "ftp://example.com",
            "ftp://example.com/",
        ),
        (
            "mailto:user@example.com",
            "mailto:user@example.com",
        ),
    ],
)
async def test_normalize_url_edge_cases(url: str, expected: str) -> None:
    result = normalize_url(url)
    assert result == expected


async def test_normalize_url_real_world_examples() -> None:
    test_cases = [
        (
            "https://docs.python.org/3/library/urllib.parse.html#urllib.parse.urlparse",
            "https://docs.python.org/3/library/urllib.parse.html",
        ),
        (
            "https://www.google.com/search?q=python+urllib&oq=python+urllib",
            "https://www.google.com/search",
        ),
        (
            "https://stackoverflow.com/questions/1234567/how-to-parse-url?tab=votes#tab-top",
            "https://stackoverflow.com/questions/1234567/how-to-parse-url",
        ),
        (
            "https://api.github.com/repos/owner/repo/issues/123",
            "https://api.github.com/repos/owner/repo/issues/123",
        ),
    ]

    for input_url, expected in test_cases:
        result = normalize_url(input_url)
        assert result == expected, f"Failed for {input_url}"


async def test_normalize_url_exception_handling() -> None:
    with patch("packages.shared_utils.src.url_utils.urlparse") as mock_urlparse:
        mock_urlparse.side_effect = Exception("Parsing error")

        url = "https://example.com/path"
        result = normalize_url(url)

        assert result == url
