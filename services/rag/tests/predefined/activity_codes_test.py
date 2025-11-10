from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

from services.rag.src.predefined.activity_codes import load_activity_code_specs

if TYPE_CHECKING:
    from pathlib import Path


@pytest.fixture
def guidelines_dir(tmp_path: Path) -> Path:
    files = [
        "NIH- Instructions for Research (R).pdf",
        "NIH- Instructions for Training (T) Grants.pdf",
        "NIH- Comprehensive General (G) Instructions.pdf",
    ]
    for name in files:
        (tmp_path / name).write_text("placeholder")
    return tmp_path


def test_load_activity_code_specs_builds_template_specs(tmp_path: Path, guidelines_dir: Path) -> None:
    csv_path = tmp_path / "activity_codes.csv"
    csv_path.write_text(
        '"Activity Code","Funding Category",Title,Description\nR01,"Research and Development","NIH Research Project Grant","Classic NIH award."\nT32,"Research Training and Career Development","Training Grant","Supports institutional training."\nX99,"Other Transactions","Experimental Award","Uses default guidelines."'
    )

    specs = load_activity_code_specs(csv_path, guidelines_root=guidelines_dir)

    assert [spec.activity_code for spec in specs] == ["R01", "T32", "X99"]
    r01 = specs[0]
    assert r01.key == "nih_r01"
    assert r01.guideline_source.name == "NIH- Instructions for Research (R).pdf"
    assert r01.overrides["include_specific_aims"] is True

    t32 = specs[1]
    assert t32.guideline_source.name == "NIH- Instructions for Training (T) Grants.pdf"
    assert "include_specific_aims" not in t32.overrides

    x99 = specs[2]
    assert x99.guideline_source.name == "NIH- Comprehensive General (G) Instructions.pdf"
