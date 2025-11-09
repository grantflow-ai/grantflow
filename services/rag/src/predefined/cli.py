from __future__ import annotations

import argparse
import asyncio
import hashlib
from pathlib import Path

from dotenv import load_dotenv
from packages.db.src.connection import get_session_maker
from packages.shared_utils.src.logger import get_logger

from services.rag.src.predefined.activity_codes import load_activity_code_specs
from services.rag.src.predefined.manifest import TemplateSpec, filter_specs, load_manifest
from services.rag.src.predefined.pipeline import (
    clone_predefined_template_if_possible,
    generate_predefined_template,
)

logger = get_logger(__name__)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate predefined grant templates from institutional guidelines.")
    parser.add_argument(
        "--config",
        type=Path,
        help="Optional path to a predefined template manifest (YAML).",
    )
    parser.add_argument(
        "--keys",
        nargs="*",
        help="Optional list of manifest keys to process (e.g., nih_r01_standard nih_r21_exploratory).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run the pipeline without persisting any templates.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing predefined templates for the same institution/activity code.",
    )
    parser.add_argument(
        "--activity-codes-csv",
        type=Path,
        default=Path("testing/test_data/sources/guidelines/nih/nih_activity_codes.csv"),
        help="Path to an NIH activity codes CSV for bulk generation.",
    )
    parser.add_argument(
        "--guidelines-root",
        type=Path,
        default=Path("testing/test_data/sources/guidelines/nih"),
        help="Directory containing NIH guideline PDFs referenced by the CSV loader.",
    )
    return parser


async def run_cli(specs: list[TemplateSpec], *, dry_run: bool, force: bool) -> None:
    if not specs:
        logger.warning("No matching template specs found; nothing to do.")
        return

    session_maker = get_session_maker()

    logger.info(
        "Starting predefined template generation",
        total=len(specs),
        dry_run=dry_run,
        force=force,
    )

    for spec in specs:
        logger.info("Processing template", manifest_key=spec.key)
        guideline_hash = hashlib.sha256(Path(spec.guideline_source).read_bytes()).hexdigest()

        cloned = await clone_predefined_template_if_possible(
            spec=spec,
            session_maker=session_maker,
            guideline_hash=guideline_hash,
            dry_run=dry_run,
            force=force,
        )
        if cloned:
            continue

        await generate_predefined_template(
            spec,
            session_maker=session_maker,
            dry_run=dry_run,
            force=force,
            guideline_hash=guideline_hash,
        )


def main() -> None:
    load_dotenv()
    parser = build_parser()
    args = parser.parse_args()

    spec_map: dict[str, TemplateSpec] = {}

    if args.config:
        manifest_path = Path(args.config).resolve()
        spec_map.update({spec.key: spec for spec in load_manifest(manifest_path)})

    if args.activity_codes_csv:
        csv_specs = load_activity_code_specs(
            Path(args.activity_codes_csv).resolve(),
            guidelines_root=Path(args.guidelines_root).resolve(),
        )
        for spec in csv_specs:
            if spec.key in spec_map:
                logger.info("Skipping CSV activity code; manifest entry already defined", key=spec.key)
                continue
            spec_map[spec.key] = spec

    filtered = filter_specs(list(spec_map.values()), set(args.keys) if args.keys else None)

    asyncio.run(run_cli(filtered, dry_run=args.dry_run, force=args.force))


if __name__ == "__main__":
    main()
