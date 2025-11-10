from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass(slots=True)
class TemplateSpec:
    key: str
    name: str
    granting_institution_full_name: str
    granting_institution_abbreviation: str
    grant_type: str
    activity_code: str | None
    guideline_source: Path
    guideline_version: str | None
    description: str | None
    overrides: dict[str, Any]


def load_manifest(path: Path) -> list[TemplateSpec]:
    if not path.exists():
        raise FileNotFoundError(f"Manifest not found: {path}")

    raw = yaml.safe_load(path.read_text()) or {}
    templates = raw.get("templates", [])

    return [
        TemplateSpec(
            key=entry["key"],
            name=entry["name"],
            granting_institution_full_name=entry["granting_institution_full_name"],
            granting_institution_abbreviation=entry["granting_institution_abbreviation"],
            grant_type=entry.get("grant_type", "RESEARCH"),
            activity_code=entry.get("activity_code"),
            guideline_source=Path(entry["guideline_source"]).resolve(),
            guideline_version=entry.get("guideline_version"),
            description=entry.get("description"),
            overrides=entry.get("overrides", {}),
        )
        for entry in templates
    ]


def filter_specs(specs: list[TemplateSpec], allowed_keys: set[str] | None) -> list[TemplateSpec]:
    if not allowed_keys:
        return specs
    normalized = {key.strip() for key in allowed_keys}
    return [spec for spec in specs if spec.key in normalized]
