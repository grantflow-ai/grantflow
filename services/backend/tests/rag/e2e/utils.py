from shared_utils.src.serialization import deserialize, serialize

from src.rag.grant_template.extract_cfp_data import ExtractedCFPData, handle_extract_cfp_data
from tests.test_utils import FIXTURES_FOLDER


async def get_extracted_section_data(
    source_file_name: str,
    organization_mapping: dict[str, dict[str, str]],
) -> ExtractedCFPData:
    folder = FIXTURES_FOLDER / "cfps" / "extracted_data"
    if not folder.exists():
        folder.mkdir(parents=True, exist_ok=True)

    extracted_fixture_json_file = folder / f"{source_file_name.removesuffix('.md')}.json"
    if not extracted_fixture_json_file.exists():
        extracted_fixture_json_file.write_bytes(
            serialize(
                await handle_extract_cfp_data(
                    cfp_content=(FIXTURES_FOLDER / "cfps" / source_file_name).read_text(),
                    organization_mapping=organization_mapping,
                )
            )
        )

    return deserialize(extracted_fixture_json_file.read_bytes(), ExtractedCFPData)
