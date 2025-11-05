import pytest
from packages.db.src.tables import GrantingInstitution, RagSource

from services.rag.src.utils.retrieval import retrieve_documents

GUIDELINE_SAMPLE_SIZE = 5


@pytest.mark.e2e
@pytest.mark.parametrize(
    "institution_fixture,search_queries,expected_keywords",
    [
        (
            "nih_granting_institution",
            ["research plan guidelines", "budget requirements", "formatting instructions"],
            ["NIH", "research", "application"],
        ),
        (
            "erc_granting_institution",
            ["proof of concept application", "eligibility criteria"],
            ["ERC", "proof", "concept", "eligibility"],
        ),
    ],
)
async def test_retrieve_institution_guidelines(
    institution_fixture: str,
    search_queries: list[str],
    expected_keywords: list[str],
    request: pytest.FixtureRequest,
    nih_indexed_guideline: RagSource,
    erc_indexed_guideline: RagSource,
) -> None:
    institution: GrantingInstitution = request.getfixturevalue(institution_fixture)

    results = await retrieve_documents(
        granting_institution_id=str(institution.id),
        search_queries=search_queries,
        task_description=f"Retrieve {institution.full_name} grant application guidelines",
        max_results=GUIDELINE_SAMPLE_SIZE,
        trace_id=f"test-{institution.full_name.lower().replace(' ', '-')}-guidelines",
    )

    assert len(results) > 0, f"Should retrieve at least one guideline document for {institution.full_name}"

    combined_results = " ".join(results).lower()
    matched_keywords = [keyword for keyword in expected_keywords if keyword.lower() in combined_results]

    assert len(matched_keywords) >= 2, (
        f"Expected at least 2 of {expected_keywords} in results for {institution.full_name}, "
        f"but only found {matched_keywords}"
    )
