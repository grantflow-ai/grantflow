from typing import cast

import pytest
from packages.db.src.json_objects import CFPSection, GrantLongFormSection
from packages.shared_utils.src.exceptions import ValidationError

from services.rag.src.grant_template.template_generation.content_metadata import ContentMetadata
from services.rag.src.grant_template.template_generation.dependencies import SectionDependency
from services.rag.src.grant_template.template_generation.handler import merge_and_transform
from services.rag.src.grant_template.template_generation.section_classification import SectionClassification


def _cfp_section(section_id: str, title: str) -> CFPSection:
    return CFPSection(id=section_id, title=title)


def _classification(
    *,
    section_id: str,
    is_plan: bool,
    long_form: bool,
    needs_writing: bool = True,
    title_only: bool = False,
) -> SectionClassification:
    return SectionClassification(
        id=section_id,
        long_form=long_form,
        is_plan=is_plan,
        clinical=False,
        title_only=title_only,
        needs_writing=needs_writing,
        guidelines=[],
        definition=None,
    )


def _metadata(section_id: str) -> ContentMetadata:
    return ContentMetadata(
        id=section_id,
        keywords=["alpha", "beta", "gamma"],
        topics=["topic-1", "topic-2"],
        generation_instructions="Provide detailed content for testing purposes.",
        search_queries=["query 1", "query 2", "query 3"],
    )


def _dependency(section_id: str, depends_on: list[str] | None = None) -> SectionDependency:
    return SectionDependency(id=section_id, depends_on=depends_on or [])


def test_merge_promotes_research_plan_to_long_form() -> None:
    grant_sections = merge_and_transform(
        cfp_sections=[_cfp_section("PLAN", "Research Plan"), _cfp_section("OTHER", "Other Section")],
        classifications=[
            _classification(section_id="PLAN", is_plan=True, long_form=False, needs_writing=False),
            _classification(section_id="OTHER", is_plan=False, long_form=False),
        ],
        content_metadata=[_metadata("PLAN"), _metadata("OTHER")],
        dependencies=[_dependency("PLAN"), _dependency("OTHER", ["PLAN"])],
    )

    plan_section_dict = next(section for section in grant_sections if section["id"] == "PLAN")
    assert "depends_on" in plan_section_dict  # ensure it is long-form before casting
    plan_section = cast("GrantLongFormSection", plan_section_dict)

    assert plan_section["is_detailed_research_plan"] is True
    assert plan_section["needs_applicant_writing"] is True
    assert plan_section["depends_on"] == []


def test_merge_raises_when_no_long_form_plan_section() -> None:
    with pytest.raises(ValidationError, match="long-form research plan"):
        merge_and_transform(
            cfp_sections=[_cfp_section("PLAN", "Research Plan"), _cfp_section("OTHER", "Other Section")],
            classifications=[
                _classification(section_id="PLAN", is_plan=True, long_form=True),
                _classification(section_id="OTHER", is_plan=False, long_form=True),
            ],
            content_metadata=[_metadata("OTHER")],
            dependencies=[_dependency("OTHER")],
        )
