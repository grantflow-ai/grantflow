from bs4 import BeautifulSoup, Comment, Tag

from packages.shared_utils.src.html import HTML_TAGS_TO_DECOMPOSE, sanitize_html


def test_sanitize_html_removes_tags() -> None:
    html = """
    <html>
        <head>
            <title>Test Page</title>
            <script>alert('test');</script>
            <style>.test{color:red;}</style>
        </head>
        <body>
            <h1>Test Content</h1>
            <p>This is a test paragraph.</p>
            <iframe src="https://example.org"></iframe>
            <noscript>No script support</noscript>
        </body>
    </html>
    """
    soup = BeautifulSoup(html, "html.parser")
    sanitized = sanitize_html(soup)

    for tag_name in HTML_TAGS_TO_DECOMPOSE:
        assert not sanitized.find(tag_name)

    assert sanitized.find("h1")
    assert sanitized.find("p")


def test_sanitize_html_removes_attributes() -> None:
    html = """
    <html>
        <body>
            <h1 class="title" id="main-title" data-test="value">Test Content</h1>
            <p style="color:red;" title="Important paragraph">This is a test paragraph.</p>
            <a href="https://example.org" target="_blank" rel="noopener" onclick="alert('click');">Link</a>
        </body>
    </html>
    """
    soup = BeautifulSoup(html, "html.parser")
    sanitized = sanitize_html(soup)

    h1 = sanitized.find("h1")
    assert h1 is not None
    assert isinstance(h1, Tag)
    assert not h1.has_attr("class")
    assert not h1.has_attr("id")
    assert not h1.has_attr("data-test")

    p = sanitized.find("p")
    assert p is not None
    assert isinstance(p, Tag)
    assert not p.has_attr("style")
    assert p.has_attr("title")
    assert p["title"] == "Important paragraph"

    a = sanitized.find("a")
    assert a is not None
    assert isinstance(a, Tag)
    assert a.has_attr("href")
    assert a["href"] == "https://example.org"
    assert not a.has_attr("target")
    assert not a.has_attr("rel")
    assert not a.has_attr("onclick")


def test_sanitize_html_removes_comments() -> None:
    html = """
    <html>
        <body>
            <!-- This is a comment -->
            <h1>Test Content</h1>
            <!-- Another comment -->
            <p>This is a test paragraph.</p>
        </body>
    </html>
    """
    soup = BeautifulSoup(html, "html.parser")
    sanitized = sanitize_html(soup)

    comments = list(sanitized.find_all(string=lambda text: isinstance(text, Comment)))
    assert not comments
