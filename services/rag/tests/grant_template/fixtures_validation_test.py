
from pathlib import Path

from packages.db.src.json_objects import CFPAnalysis
from packages.shared_utils.src.serialization import deserialize

FIXTURES_DIR = Path(__file__).parent.parent.parent.parent.parent / "testing/test_data/fixtures/cfp_analysis"

VALID_CONSTRAINT_TYPES = {"word_limit", "page_limit", "char_limit", "format"}


def test_mra_cfp_analysis_fixture_structure() -> None:
    fixture_file = FIXTURES_DIR / "mra_2023_2024_cfp_analysis.json"
    assert fixture_file.exists(), f"Fixture not found: {fixture_file}"

    fixture: CFPAnalysis = deserialize(fixture_file.read_bytes(), CFPAnalysis)

    assert fixture["subject"], "subject field is required"
    assert fixture["org_id"], "org_id field is required"
    assert fixture["organization"], "organization field is required"
    assert len(fixture["content"]) > 0, "content must have at least one section"
    assert fixture["analysis_metadata"], "analysis_metadata field is required"

    org = fixture["organization"]
    assert org["id"] == fixture["org_id"], "organization.id must match org_id"
    assert org["full_name"], "organization.full_name is required"
    assert org["abbreviation"], "organization.abbreviation is required"

    for section in fixture["content"]:
        assert section["title"], f"Section missing title: {section}"
        assert isinstance(section["subtitles"], list), f"Section subtitles must be list: {section['title']}"

    constraints = fixture["analysis_metadata"]["constraints"]
    for constraint in constraints:
        assert constraint["type"] in VALID_CONSTRAINT_TYPES, (
            f"Invalid constraint type '{constraint['type']}' in section '{constraint['section']}'. "
            f"Valid types: {VALID_CONSTRAINT_TYPES}"
        )

        if constraint["type"] in {"word_limit", "page_limit", "char_limit"}:
            value = constraint["value"]
            assert any(char.isdigit() for char in value), (
                f"Length constraint must contain number: '{value}' in section '{constraint['section']}'"
            )
            assert "$" not in value, (
                f"Budget constraints should use type='format', not '{constraint['type']}': "
                f"'{value}' in section '{constraint['section']}'"
            )

    categories = fixture["analysis_metadata"]["categories"]
    assert len(categories) > 0, "Must have at least one category"
    for category in categories:
        assert category["name"], "Category must have name"
        assert category["count"] > 0, f"Category {category['name']} must have count > 0"
        assert len(category["examples"]) > 0, f"Category {category['name']} must have examples"


def test_nih_par_25_450_cfp_analysis_fixture_structure() -> None:
    fixture_file = FIXTURES_DIR / "nih_par_25_450_cfp_analysis.json"
    assert fixture_file.exists(), f"Fixture not found: {fixture_file}"

    fixture: CFPAnalysis = deserialize(fixture_file.read_bytes(), CFPAnalysis)

    assert fixture["subject"], "subject field is required"
    assert fixture["org_id"], "org_id field is required"
    assert fixture["organization"], "organization field is required"
    assert len(fixture["content"]) > 0, "content must have at least one section"
    assert fixture["analysis_metadata"], "analysis_metadata field is required"

    org = fixture["organization"]
    assert org["id"] == fixture["org_id"], "organization.id must match org_id"
    assert org["full_name"], "organization.full_name is required"
    assert org["abbreviation"], "organization.abbreviation is required"

    for section in fixture["content"]:
        assert section["title"], f"Section missing title: {section}"
        assert isinstance(section["subtitles"], list), f"Section subtitles must be list: {section['title']}"

    constraints = fixture["analysis_metadata"]["constraints"]
    for constraint in constraints:
        assert constraint["type"] in VALID_CONSTRAINT_TYPES, (
            f"Invalid constraint type '{constraint['type']}' in section '{constraint['section']}'. "
            f"Valid types: {VALID_CONSTRAINT_TYPES}"
        )

        if constraint["type"] in {"word_limit", "page_limit", "char_limit"}:
            value = constraint["value"]
            assert any(char.isdigit() for char in value), (
                f"Length constraint must contain number: '{value}' in section '{constraint['section']}'"
            )
            assert "$" not in value, (
                f"Budget constraints should use type='format', not '{constraint['type']}': "
                f"'{value}' in section '{constraint['section']}'"
            )

    categories = fixture["analysis_metadata"]["categories"]
    assert len(categories) > 0, "Must have at least one category"
    for category in categories:
        assert category["name"], "Category must have name"
        assert category["count"] > 0, f"Category {category['name']} must have count > 0"
        assert len(category["examples"]) > 0, f"Category {category['name']} must have examples"


def test_all_fixtures_have_unique_section_titles() -> None:
    fixtures = [
        FIXTURES_DIR / "mra_2023_2024_cfp_analysis.json",
        FIXTURES_DIR / "nih_par_25_450_cfp_analysis.json",
    ]

    for fixture_file in fixtures:
        if not fixture_file.exists():
            continue

        fixture: CFPAnalysis = deserialize(fixture_file.read_bytes(), CFPAnalysis)
        section_titles = [section["title"] for section in fixture["content"]]

        duplicates = [title for title in section_titles if section_titles.count(title) > 1]
        assert not duplicates, (
            f"Fixture {fixture_file.name} has duplicate section titles: {set(duplicates)}"
        )
