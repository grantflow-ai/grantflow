import asyncio
from os import environ
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from packages.db.src.connection import get_session_maker
from packages.db.src.tables import BackofficeAdmin, GrantingInstitution, PredefinedGrantTemplate
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import deserialize
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

logger = get_logger(__name__)


async def seed_db() -> None:
    load_dotenv()

    if "DATABASE_CONNECTION_STRING" not in environ:
        environ["DATABASE_CONNECTION_STRING"] = "postgresql+asyncpg://local:local@db:5432/local"
        logger.info("Using local database connection")
    else:
        logger.info("Using configured database connection")

    session_maker = get_session_maker()

    script_dir = Path(__file__).parent
    granting_institutions_json = script_dir / "granting_institutions.json"
    predefined_templates_dir = script_dir / "predefined_grant_templates"

    async with session_maker() as session, session.begin():
        try:
            granting_institutions = deserialize(granting_institutions_json.read_bytes(), list[dict[str, Any]])

            stmt = insert(GrantingInstitution).values(granting_institutions)
            stmt = stmt.on_conflict_do_nothing(index_elements=["full_name"])

            result = await session.execute(stmt)
            logger.info(f"Granting institutions seeded: {result.rowcount} new entries")

            backoffice_admins_data = [
                {"email": "asaf@grantflow.ai"},
                {"email": "naaman@grantflow.ai"},
                {"email": "tirza@grantflow.ai"},
                {"email": "tsveta@grantflow.ai"},
                {"email": "varun@grantflow.ai"},
                {"email": "luca@grantflow.ai"},
                {"email": "danielle@grantflow.ai"},
                {"email": "yiftach@grantflow.ai"},
            ]

            stmt = insert(BackofficeAdmin).values(backoffice_admins_data)
            stmt = stmt.on_conflict_do_nothing(index_elements=["email"])

            result = await session.execute(stmt)
            logger.info(f"Backoffice admins seeded: {result.rowcount} new entries")

            logger.info("Granting institutions seed completed")

        except SQLAlchemyError as e:
            logger.error(f"Error seeding database: {e}")
            raise e

    if predefined_templates_dir.exists():
        async with session_maker() as session, session.begin():
            try:
                template_files = sorted(predefined_templates_dir.glob("*.json"))
                templates: list[dict[str, Any]] = [
                    deserialize(template_file.read_bytes(), dict[str, Any]) for template_file in template_files
                ]

                result = await session.execute(select(GrantingInstitution.id, GrantingInstitution.full_name))
                institution_by_name = {row.full_name: row.id for row in result}

                missing_institutions: set[str] = set()
                values: list[dict[str, Any]] = []

                for template in templates:
                    institution_name = template.pop("granting_institution_full_name", None)
                    if not institution_name or institution_name not in institution_by_name:
                        missing_institutions.add(institution_name or "UNKNOWN")
                        continue
                    values.append(
                        {
                            **template,
                            "granting_institution_id": institution_by_name[institution_name],
                        }
                    )

                if missing_institutions:
                    logger.warning(
                        "Skipped predefined templates due to missing institutions",
                        institutions=sorted(missing_institutions),
                        skipped=len(missing_institutions),
                    )

                if values:
                    stmt = insert(PredefinedGrantTemplate).values(values)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=["id"],
                        set_={
                            "name": stmt.excluded.name,
                            "description": stmt.excluded.description,
                            "activity_code": stmt.excluded.activity_code,
                            "grant_type": stmt.excluded.grant_type,
                            "grant_sections": stmt.excluded.grant_sections,
                            "guideline_source": stmt.excluded.guideline_source,
                            "guideline_version": stmt.excluded.guideline_version,
                            "guideline_hash": stmt.excluded.guideline_hash,
                            "granting_institution_id": stmt.excluded.granting_institution_id,
                            "deleted_at": stmt.excluded.deleted_at,
                        },
                    )
                    result = await session.execute(stmt)
                    logger.info(f"Predefined grant templates upserted: {result.rowcount}")
                else:
                    logger.info("No predefined templates to seed")

            except SQLAlchemyError as e:
                logger.error(f"Error seeding predefined templates: {e}")
                raise e

    logger.info("Seeding complete")


if __name__ == "__main__":
    asyncio.run(seed_db())
