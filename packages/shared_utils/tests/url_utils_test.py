"""Tests for URL normalization utilities."""

from unittest.mock import patch

import pytest

from packages.shared_utils.src.url_utils import normalize_url


async def test_normalize_url_basic() -> None:
    """Test basic URL normalization."""
    url = "https://example.com/path"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_uppercase_scheme() -> None:
    """Test that scheme is converted to lowercase."""
    url = "HTTPS://example.com/path"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_uppercase_domain() -> None:
    """Test that domain is converted to lowercase."""
    url = "https://EXAMPLE.COM/path"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_mixed_case() -> None:
    """Test normalization with mixed case scheme and domain."""
    url = "HTTPS://Example.COM/Path"
    result = normalize_url(url)
    assert result == "https://example.com/Path"


async def test_normalize_url_trailing_slash_removal() -> None:
    """Test that trailing slashes are removed from paths."""
    url = "https://example.com/path/"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_multiple_trailing_slashes() -> None:
    """Test that multiple trailing slashes are removed."""
    url = "https://example.com/path///"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_root_path_preserved() -> None:
    """Test that root path slash is preserved."""
    url = "https://example.com/"
    result = normalize_url(url)
    assert result == "https://example.com/"


async def test_normalize_url_no_path_adds_slash() -> None:
    """Test that missing path gets normalized to root slash."""
    url = "https://example.com"
    result = normalize_url(url)
    assert result == "https://example.com/"


async def test_normalize_url_query_parameters_removed() -> None:
    """Test that query parameters are removed."""
    url = "https://example.com/path?param1=value1&param2=value2"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_fragments_removed() -> None:
    """Test that URL fragments are removed."""
    url = "https://example.com/path#section"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_query_and_fragment_removed() -> None:
    """Test that both query parameters and fragments are removed."""
    url = "https://example.com/path?param=value#section"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_default_http_port_removed() -> None:
    """Test that default HTTP port 80 is removed."""
    url = "http://example.com:80/path"
    result = normalize_url(url)
    assert result == "http://example.com/path"


async def test_normalize_url_default_https_port_removed() -> None:
    """Test that default HTTPS port 443 is removed."""
    url = "https://example.com:443/path"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_non_default_port_preserved() -> None:
    """Test that non-default ports are preserved."""
    url = "https://example.com:8080/path"
    result = normalize_url(url)
    assert result == "https://example.com:8080/path"


async def test_normalize_url_http_non_default_port_preserved() -> None:
    """Test that non-default HTTP ports are preserved."""
    url = "http://example.com:8080/path"
    result = normalize_url(url)
    assert result == "http://example.com:8080/path"


async def test_normalize_url_https_80_preserved() -> None:
    """Test that port 80 is preserved for HTTPS (not default)."""
    url = "https://example.com:80/path"
    result = normalize_url(url)
    assert result == "https://example.com:80/path"


async def test_normalize_url_http_443_preserved() -> None:
    """Test that port 443 is preserved for HTTP (not default)."""
    url = "http://example.com:443/path"
    result = normalize_url(url)
    assert result == "http://example.com:443/path"


async def test_normalize_url_comprehensive_example() -> None:
    """Test comprehensive example from docstring."""
    url = "HTTPS://Example.COM/path/?param=1#section"
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_default_port_example() -> None:
    """Test default port example from docstring."""
    url = "http://example.com:80/"
    result = normalize_url(url)
    assert result == "http://example.com/"


async def test_normalize_url_whitespace_trimmed() -> None:
    """Test that leading/trailing whitespace is trimmed."""
    url = "  https://example.com/path  "
    result = normalize_url(url)
    assert result == "https://example.com/path"


async def test_normalize_url_empty_string() -> None:
    """Test that empty string is returned as-is."""
    url = ""
    result = normalize_url(url)
    assert result == ""


async def test_normalize_url_none_input() -> None:
    """Test that None input is returned as-is."""
    url = None
    result = normalize_url(url)  # type: ignore
    assert result is None


async def test_normalize_url_non_string_input() -> None:
    """Test that non-string input is returned as-is."""
    url = 123
    result = normalize_url(url)  # type: ignore
    # Compare string representations to avoid type comparison issues
    assert str(result) == str(url)


async def test_normalize_url_malformed_url() -> None:
    """Test that malformed URLs are returned as-is."""
    url = "not-a-valid-url"
    result = normalize_url(url)
    assert result == "not-a-valid-url"


async def test_normalize_url_relative_url() -> None:
    """Test that relative URLs are handled gracefully."""
    url = "/path/to/resource"
    result = normalize_url(url)
    assert result == "/path/to/resource"


async def test_normalize_url_protocol_relative() -> None:
    """Test protocol-relative URLs."""
    url = "//example.com/path"
    result = normalize_url(url)
    assert result == "//example.com/path"


async def test_normalize_url_complex_path() -> None:
    """Test URLs with complex paths."""
    url = "https://example.com/api/v1/users/123/posts"
    result = normalize_url(url)
    assert result == "https://example.com/api/v1/users/123/posts"


async def test_normalize_url_subdomain() -> None:
    """Test URLs with subdomains."""
    url = "https://api.example.com/path"
    result = normalize_url(url)
    assert result == "https://api.example.com/path"


async def test_normalize_url_international_domain() -> None:
    """Test URLs with international characters."""
    url = "https://münchen.de/path"
    result = normalize_url(url)
    assert result == "https://münchen.de/path"


async def test_normalize_url_deduplication_scenario() -> None:
    """Test realistic deduplication scenario with tracking parameters."""
    url1 = "https://example.com/article?utm_source=twitter&utm_campaign=spring"
    url2 = "https://EXAMPLE.COM/article/?utm_source=facebook"
    url3 = "https://example.com/article#comments"

    result1 = normalize_url(url1)
    result2 = normalize_url(url2)
    result3 = normalize_url(url3)

    # All should normalize to the same URL for deduplication
    expected = "https://example.com/article"
    assert result1 == expected
    assert result2 == expected
    assert result3 == expected


async def test_normalize_url_github_example() -> None:
    """Test with GitHub-style URLs that might have various formats."""
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
    """Test that path case is preserved (important for case-sensitive servers)."""
    url = "https://example.com/API/V1/Users"
    result = normalize_url(url)
    assert result == "https://example.com/API/V1/Users"


async def test_normalize_url_ip_address() -> None:
    """Test with IP addresses."""
    url = "http://192.168.1.1:8080/path"
    result = normalize_url(url)
    assert result == "http://192.168.1.1:8080/path"


async def test_normalize_url_localhost() -> None:
    """Test with localhost URLs."""
    url = "http://localhost:3000/app"
    result = normalize_url(url)
    assert result == "http://localhost:3000/app"


@pytest.mark.parametrize(
    "url,expected",
    [
        ("://invalid", "://invalid"),  # Invalid scheme
        ("http://", "http:///"),  # Empty netloc gets normalized with root path
        ("https://", "https:///"),  # Empty netloc gets normalized with root path
        (
            "ftp://example.com",
            "ftp://example.com/",
        ),  # Non-HTTP scheme gets root path added
        (
            "mailto:user@example.com",
            "mailto:user@example.com",
        ),  # Non-HTTP scheme preserved
    ],
)
async def test_normalize_url_edge_cases(url: str, expected: str) -> None:
    """Test various edge cases and their expected behavior."""
    result = normalize_url(url)
    assert result == expected


async def test_normalize_url_real_world_examples() -> None:
    """Test with real-world URL examples."""
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
    """Test that exceptions during URL parsing are handled gracefully."""
    with patch("packages.shared_utils.src.url_utils.urlparse") as mock_urlparse:
        mock_urlparse.side_effect = Exception("Parsing error")

        url = "https://example.com/path"
        result = normalize_url(url)

        # Should return original URL when parsing fails
        assert result == url
