from __future__ import annotations

import csv
from pathlib import Path
from typing import Final

from packages.db.src.enums import GrantType
from packages.shared_utils.src.logger import get_logger

from services.rag.src.predefined.manifest import TemplateSpec

logger = get_logger(__name__)

DEFAULT_GUIDELINE_VERSION: Final[str] = "Forms-H"
DEFAULT_GRANTING_INSTITUTION = {
    "name": "National Institutes of Health",
    "abbreviation": "NIH",
}

GUIDELINE_FILENAME_BY_PREFIX: Final[dict[str, str]] = {
    "R": "NIH- Instructions for Research (R).pdf",
    "U": "NIH- Instructions for Research (R).pdf",
    "S": "NIH- Instructions for SBIR_STTR Grants.pdf",
    "H": "NIH- Instructions for SBIR_STTR Grants.pdf",
    "K": "NIH- Instructions for Career Development (K) Grants.pdf",
    "F": "NIH- Instructions for Fellowship (F) Grants.pdf",
    "T": "NIH- Instructions for Training (T) Grants.pdf",
    "D": "NIH- Instructions for Training (T) Grants.pdf",
    "P": "NIH- Instructions for Multi-Project (M) Grants.pdf",
    "M": "NIH- Instructions for Multi-Project (M) Grants.pdf",
}
DEFAULT_GUIDELINE_FILENAME: Final[str] = "NIH- Comprehensive General (G) Instructions.pdf"


def _resolve_guideline_path(activity_code: str, *, guidelines_root: Path) -> Path | None:
    prefix = activity_code[0].upper()
    filename = GUIDELINE_FILENAME_BY_PREFIX.get(prefix, DEFAULT_GUIDELINE_FILENAME)
    guideline_path = Path(guidelines_root / filename).resolve()
    if not guideline_path.exists():
        logger.warning(
            "Guideline file missing for activity code; skipping",
            activity_code=activity_code,
            path=str(guideline_path),
        )
        return None
    return guideline_path


def _build_overrides(activity_code: str) -> dict[str, bool]:
    prefix = activity_code[0].upper()
    overrides: dict[str, bool] = {"enforce_length_constraints": True}
    if prefix in {"R", "U", "P", "S"}:
        overrides["include_specific_aims"] = True
    return overrides


def load_activity_code_specs(
    csv_path: Path,
    *,
    guidelines_root: Path,
) -> list[TemplateSpec]:
    csv_path = Path(csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"Activity codes CSV not found: {csv_path}")

    specs: list[TemplateSpec] = []
    with csv_path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            code = (row.get("Activity Code") or "").strip()
            if not code:
                continue

            guideline_path = _resolve_guideline_path(code, guidelines_root=guidelines_root)
            if guideline_path is None:
                continue

            name = (row.get("Title") or code).strip()
            description = (row.get("Description") or "").strip() or None
            spec = TemplateSpec(
                key=f"nih_{code.lower()}",
                name=name,
                granting_institution_full_name=DEFAULT_GRANTING_INSTITUTION["name"],
                granting_institution_abbreviation=DEFAULT_GRANTING_INSTITUTION["abbreviation"],
                grant_type=GrantType.RESEARCH.value,
                activity_code=code,
                guideline_source=guideline_path,
                guideline_version=DEFAULT_GUIDELINE_VERSION,
                description=description,
                overrides=_build_overrides(code),
            )
            specs.append(spec)

    logger.info("Loaded activity code specs", total=len(specs), source=str(csv_path))
    return specs
