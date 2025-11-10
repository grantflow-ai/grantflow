import asyncio
import json
from pathlib import Path

from dotenv import load_dotenv
from packages.db.src.connection import get_session_maker
from packages.db.src.tables import GrantingInstitution, PredefinedGrantTemplate
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select

logger = get_logger(__name__)


async def export() -> None:
    load_dotenv()
    session_maker = get_session_maker()

    async with session_maker() as session:
        result = await session.execute(
            select(
                PredefinedGrantTemplate.id,
                PredefinedGrantTemplate.name,
                PredefinedGrantTemplate.description,
                PredefinedGrantTemplate.activity_code,
                PredefinedGrantTemplate.grant_type,
                PredefinedGrantTemplate.grant_sections,
                PredefinedGrantTemplate.guideline_source,
                PredefinedGrantTemplate.guideline_version,
                PredefinedGrantTemplate.guideline_hash,
                GrantingInstitution.full_name.label("granting_institution_full_name"),
            ).join(GrantingInstitution, PredefinedGrantTemplate.granting_institution_id == GrantingInstitution.id)
        )

        templates = [
            {
                "id": str(row.id),
                "name": row.name,
                "description": row.description,
                "activity_code": row.activity_code,
                "grant_type": row.grant_type.value if hasattr(row.grant_type, "value") else row.grant_type,
                "grant_sections": row.grant_sections,
                "guideline_source": row.guideline_source,
                "guideline_version": row.guideline_version,
                "guideline_hash": row.guideline_hash,
                "granting_institution_full_name": row.granting_institution_full_name,
            }
            for row in result
        ]

    output_dir = Path(__file__).with_name("predefined_grant_templates")
    output_dir.mkdir(exist_ok=True, parents=True)
    for existing in output_dir.glob("*.json"):
        existing.unlink()

    for template in templates:
        slug = (template["activity_code"] or "template").lower()
        file_name = f"{slug}_{template['id']}.json"
        (output_dir / file_name).write_text(json_dumps(template))

    logger.info("Exported predefined templates", total=len(templates), path=str(output_dir))


def json_dumps(data: object) -> str:
    return json.dumps(data, indent=4, ensure_ascii=False, sort_keys=True)


if __name__ == "__main__":
    asyncio.run(export())
