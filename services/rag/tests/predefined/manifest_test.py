from pathlib import Path

from services.rag.src.predefined.manifest import TemplateSpec, filter_specs, load_manifest


def test_load_manifest(tmp_path: Path) -> None:
    manifest = tmp_path / "manifest.yaml"
    manifest.write_text(
        """
templates:
  - key: template_a
    name: Template A
    granting_institution_full_name: Test Org
    granting_institution_abbreviation: TO
    grant_type: RESEARCH
    activity_code: R01
    guideline_source: README.md
    guideline_version: v1
    description: desc
  - key: template_b
    name: Template B
    granting_institution_full_name: Another Org
    granting_institution_abbreviation: AO
    grant_type: TRANSLATIONAL
    guideline_source: README.md
"""
    )

    specs = load_manifest(manifest)
    assert len(specs) == 2
    assert specs[0].key == "template_a"
    assert specs[1].grant_type == "TRANSLATIONAL"


def test_filter_specs() -> None:
    specs = [
        TemplateSpec(
            key="a",
            name="A",
            granting_institution_full_name="Org",
            granting_institution_abbreviation="ORG",
            grant_type="RESEARCH",
            activity_code="R01",
            guideline_source=Path("a.pdf"),
            guideline_version=None,
            description=None,
            overrides={},
        ),
        TemplateSpec(
            key="b",
            name="B",
            granting_institution_full_name="Org",
            granting_institution_abbreviation="ORG",
            grant_type="RESEARCH",
            activity_code=None,
            guideline_source=Path("b.pdf"),
            guideline_version=None,
            description=None,
            overrides={},
        ),
    ]

    filtered = filter_specs(specs, {"b"})
    assert [spec.key for spec in filtered] == ["b"]
