from typing import TYPE_CHECKING, cast
from unittest.mock import AsyncMock, patch

if TYPE_CHECKING:
    from services.scraper.src.dtos import GrantInfo
from services.scraper.src.grant_pages import (
    download_and_save_pages,
    download_grant_pages,
    save_markdown_page,
)


async def test_save_markdown_page() -> None:
    html = "<h1>Test Grant</h1><p>Grant description</p>"
    url = "https://grants.gov/search-results-detail/123456"
    document_number = "PA-24-123"

    with (
        patch(
            "services.scraper.src.grant_pages.convert", return_value="# Test Grant\n\nGrant description"
        ) as mock_convert,
        patch("services.scraper.src.grant_pages.text", return_value="# Test Grant\n\nGrant description") as mock_format,
        patch("services.scraper.src.grant_pages.save_grant_page_content", new_callable=AsyncMock) as mock_save,
    ):
        await save_markdown_page(html=html, url=url, document_number=document_number)

        assert mock_convert.call_count == 1
        call_args = mock_convert.call_args
        assert call_args[0][0] == html
        assert "preprocessing" in call_args[1]

        mock_format.assert_called_once_with("# Test Grant\n\nGrant description")
        mock_save.assert_called_once_with(
            url=url, document_number=document_number, content="# Test Grant\n\nGrant description"
        )


async def test_download_and_save_pages() -> None:
    grants_info = [
        ("https://grants.gov/search-results-detail/123456", "PA-24-123"),
        ("https://grants.gov/search-results-detail/123457", "PA-24-124"),
    ]

    html_content = "<h1>Test Grant</h1><p>Grant description</p>"

    with (
        patch("services.scraper.src.grant_pages.download_page_html", new_callable=AsyncMock) as mock_download,
        patch("services.scraper.src.grant_pages.save_markdown_page", new_callable=AsyncMock) as mock_save,
    ):
        mock_download.return_value = html_content

        await download_and_save_pages(grants_info=grants_info)

        assert mock_download.call_count == 2
        assert mock_save.call_count == 2

        calls = mock_save.call_args_list
        assert calls[0][1]["url"] == "https://grants.gov/search-results-detail/123456"
        assert calls[0][1]["document_number"] == "PA-24-123"
        assert calls[1][1]["url"] == "https://grants.gov/search-results-detail/123457"
        assert calls[1][1]["document_number"] == "PA-24-124"


async def test_download_grant_pages_with_existing_files() -> None:
    search_results = cast(
        "list[GrantInfo]",
        [
            {"url": "https://grants.gov/search-results-detail/123", "document_number": "PA-24-123", "title": "Grant 1"},
            {"url": "https://grants.gov/search-results-detail/124", "document_number": "PA-24-124", "title": "Grant 2"},
            {"url": "https://grants.gov/search-results-detail/125", "document_number": "PA-24-125", "title": "Grant 3"},
        ],
    )
    existing_file_identifiers = {"PA-24-124"}

    with patch(
        "services.scraper.src.grant_pages.download_and_save_pages", new_callable=AsyncMock
    ) as mock_download_save:
        result = await download_grant_pages(
            search_results=search_results, existing_file_identifiers=existing_file_identifiers
        )

        assert result == 2

        expected_grants = [
            ("https://grants.gov/search-results-detail/123", "PA-24-123"),
            ("https://grants.gov/search-results-detail/125", "PA-24-125"),
        ]
        mock_download_save.assert_called_once_with(grants_info=expected_grants)


async def test_download_grant_pages_no_new_files() -> None:
    search_results = cast(
        "list[GrantInfo]",
        [
            {"url": "https://grants.gov/search-results-detail/123", "document_number": "PA-24-123", "title": "Grant 1"},
            {"url": "https://grants.gov/search-results-detail/124", "document_number": "PA-24-124", "title": "Grant 2"},
        ],
    )
    existing_file_identifiers = {"PA-24-123", "PA-24-124"}

    with patch(
        "services.scraper.src.grant_pages.download_and_save_pages", new_callable=AsyncMock
    ) as mock_download_save:
        result = await download_grant_pages(
            search_results=search_results, existing_file_identifiers=existing_file_identifiers
        )

        assert result == 0

        mock_download_save.assert_not_called()


async def test_download_grant_pages_chunking() -> None:
    search_results = cast(
        "list[GrantInfo]",
        [
            {
                "url": f"https://grants.gov/search-results-detail/{i}",
                "document_number": f"PA-24-{i:03d}",
                "title": f"Grant {i}",
            }
            for i in range(250)
        ],
    )
    existing_file_identifiers: set[str] = set()

    with patch(
        "services.scraper.src.grant_pages.download_and_save_pages", new_callable=AsyncMock
    ) as mock_download_save:
        result = await download_grant_pages(
            search_results=search_results, existing_file_identifiers=existing_file_identifiers
        )

        assert result == 250
        assert mock_download_save.call_count == 3

        call_args = [call[1]["grants_info"] for call in mock_download_save.call_args_list]
        assert len(call_args[0]) == 100
        assert len(call_args[1]) == 100
        assert len(call_args[2]) == 50


async def test_download_grant_pages_empty_search_results() -> None:
    search_results: list[GrantInfo] = []
    existing_file_identifiers: set[str] = set()

    with patch(
        "services.scraper.src.grant_pages.download_and_save_pages", new_callable=AsyncMock
    ) as mock_download_save:
        result = await download_grant_pages(
            search_results=search_results, existing_file_identifiers=existing_file_identifiers
        )

        assert result == 0
        mock_download_save.assert_not_called()
