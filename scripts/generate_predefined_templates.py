"""Bulk-generate predefined grant templates from institutional guidelines."""

from __future__ import annotations

import argparse
import asyncio
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any

import yaml

if TYPE_CHECKING:
    from collections.abc import Iterable

logger = logging.getLogger(__name__)


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

    data = yaml.safe_load(path.read_text()) or {}
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
        for entry in data.get("templates", [])
    ]


def filter_specs(specs: Iterable[TemplateSpec], activity_codes: set[str] | None) -> list[TemplateSpec]:
    if not activity_codes:
        return list(specs)

    normalized = {code.upper() for code in activity_codes}
    return [spec for spec in specs if spec.activity_code and spec.activity_code.upper() in normalized]


async def generate_from_spec(spec: TemplateSpec, dry_run: bool) -> None:
    """Placeholder for future pipeline wiring.

    For now we simply validate inputs and log the intended action so that
    the script can be integrated with CI and future automation incrementally.
    """

    if not spec.guideline_source.exists():
        raise FileNotFoundError(f"Guideline source missing: {spec.guideline_source}")

    if dry_run:
        logger.info("[dry-run] Would generate template", extra={"template_key": spec.key})
        return

    # TODO: Wire into the RAG template pipeline and persistence layer.
    logger.info(
        "Queued predefined template generation",
        extra={
            "template_key": spec.key,
            "institution": spec.granting_institution_abbreviation,
            "activity_code": spec.activity_code,
            "guideline": str(spec.guideline_source),
        },
    )


async def run(args: argparse.Namespace) -> None:
    manifest_path = Path(args.config).resolve()
    specs = load_manifest(manifest_path)
    filtered = filter_specs(specs, set(args.activity_codes) if args.activity_codes else None)

    if not filtered:
        logger.warning("No matching template specs found", extra={"activity_codes": args.activity_codes})
        return

    logger.info(
        "Starting predefined template generation",
        extra={
            "count": len(filtered),
            "dry_run": args.dry_run,
            "manifest": str(manifest_path),
        },
    )

    for spec in filtered:
        await generate_from_spec(spec, args.dry_run)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--config",
        default="scripts/config/predefined_templates.yaml",
        help="Path to the predefined template manifest (YAML)",
    )
    parser.add_argument(
        "--activity-codes",
        nargs="*",
        help="Optional list of activity codes to filter (e.g., R01 R21)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate inputs without invoking the RAG pipeline",
    )
    return parser


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = build_parser()
    args = parser.parse_args()
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
