from __future__ import annotations

import hashlib
from pathlib import Path
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from packages.db.src.tables import GrantingInstitution, PredefinedGrantTemplate
from sqlalchemy import select

from services.rag.src.predefined.manifest import TemplateSpec
from services.rag.src.predefined.pipeline import (
    GuidelineData,
    clone_predefined_template_if_possible,
    generate_predefined_template,
    persist_predefined_template,
)

if TYPE_CHECKING:
    from packages.db.src.json_objects import GrantElement


async def test_generate_predefined_template_flow(
    mocker: Any,
    async_session_maker: Any,
    tmp_path: Path,
) -> None:
    spec = TemplateSpec(
        key="test_spec",
        name="Test Spec",
        granting_institution_full_name="Test Org",
        granting_institution_abbreviation="TO",
        grant_type="RESEARCH",
        activity_code="R01",
        guideline_source=tmp_path / "guideline.pdf",
        guideline_version="v1",
        description=None,
        overrides={"enforce_length_constraints": True},
    )
    spec.guideline_source.write_text("dummy")

    ensure_mock = mocker.AsyncMock(return_value=mocker.Mock(id=uuid4(), full_name="Test Org", abbreviation="TO"))
    mocker.patch(
        "services.rag.src.predefined.pipeline.ensure_granting_institution",
        new=ensure_mock,
    )
    mocker.patch(
        "services.rag.src.predefined.pipeline.load_guideline_data",
        autospec=True,
        return_value=GuidelineData(rag_sources=[], full_text="text", organization_guidelines="guidelines"),
    )
    mocker.patch(
        "services.rag.src.predefined.pipeline.analyze_guideline",
        autospec=True,
        return_value=(
            {
                "sections": [],
                "organization": {"guidelines": ""},
                "subject": "",
                "deadlines": [],
                "global_constraints": [],
            },
            [],
        ),
    )
    mocker.patch(
        "services.rag.src.predefined.pipeline.generate_grant_sections",
        autospec=True,
        return_value=[],
    )
    persist_mock = mocker.patch(
        "services.rag.src.predefined.pipeline.persist_predefined_template",
        autospec=True,
    )

    await generate_predefined_template(spec, session_maker=async_session_maker, dry_run=True)

    assert persist_mock.await_count == 1


async def test_persist_predefined_template_upserts(async_session_maker: Any, tmp_path: Path) -> None:
    guideline_file = Path(tmp_path) / "guideline.pdf"
    guideline_file.write_text("guideline text")

    async with async_session_maker() as session, session.begin():
        institution = GrantingInstitution(full_name="Persist Org", abbreviation="PO")
        session.add(institution)
        await session.flush()
        await session.refresh(institution)
        inst_id = institution.id

    grant_sections: list[GrantElement] = [
        {
            "id": "section-1",
            "order": 1,
            "title": "Section 1",
            "evidence": "",
            "parent_id": None,
            "needs_applicant_writing": False,
        }
    ]

    await persist_predefined_template(
        session_maker=async_session_maker,
        spec=TemplateSpec(
            key="persist_key",
            name="Persist Template",
            granting_institution_full_name="Persist Org",
            granting_institution_abbreviation="PO",
            grant_type="RESEARCH",
            activity_code="R99",
            guideline_source=guideline_file,
            guideline_version="v0",
            description=None,
            overrides={},
        ),
        institution=institution,
        guideline_path=guideline_file,
        grant_sections=grant_sections,
        dry_run=False,
        force=True,
    )

    async with async_session_maker() as session:
        result = await session.scalar(
            select(PredefinedGrantTemplate).where(
                PredefinedGrantTemplate.activity_code == "R99",
                PredefinedGrantTemplate.granting_institution_id == inst_id,
            )
        )

    assert result is not None
    assert result.grant_sections[0]["title"] == "Section 1"


async def test_clone_predefined_template_if_possible(async_session_maker: Any, tmp_path: Path) -> None:
    guideline_file = Path(tmp_path) / "guideline.pdf"
    guideline_file.write_text("guideline text")

    async with async_session_maker() as session, session.begin():
        institution = GrantingInstitution(full_name="Clone Org", abbreviation="CO")
        session.add(institution)
        await session.flush()
        await session.refresh(institution)

    grant_sections: list[GrantElement] = [
        {
            "id": "section-1",
            "order": 1,
            "title": "Section 1",
            "evidence": "",
            "parent_id": None,
            "needs_applicant_writing": False,
        }
    ]

    base_spec = TemplateSpec(
        key="clone_base",
        name="Clone Base",
        granting_institution_full_name="Clone Org",
        granting_institution_abbreviation="CO",
        grant_type="RESEARCH",
        activity_code="R10",
        guideline_source=guideline_file,
        guideline_version="v0",
        description=None,
        overrides={},
    )

    await persist_predefined_template(
        session_maker=async_session_maker,
        spec=base_spec,
        institution=institution,
        guideline_path=guideline_file,
        grant_sections=grant_sections,
        dry_run=False,
        force=True,
    )

    clone_spec = TemplateSpec(
        key="clone_target",
        name="Clone Target",
        granting_institution_full_name="Clone Org",
        granting_institution_abbreviation="CO",
        grant_type="RESEARCH",
        activity_code="R11",
        guideline_source=guideline_file,
        guideline_version="v0",
        description=None,
        overrides={},
    )

    cloned = await clone_predefined_template_if_possible(
        spec=clone_spec,
        session_maker=async_session_maker,
        guideline_hash=hashlib.sha256(guideline_file.read_bytes()).hexdigest(),
        dry_run=False,
        force=True,
    )
    assert cloned is True

    async with async_session_maker() as session:
        new_template = await session.scalar(
            select(PredefinedGrantTemplate).where(PredefinedGrantTemplate.activity_code == "R11")
        )

    assert new_template is not None
    assert new_template.grant_sections[0]["title"] == "Section 1"
