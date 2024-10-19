"""E2E related utilities."""

import logging
import os
from json import loads
from pathlib import Path
from typing import cast

logger = logging.getLogger(__name__)


def load_settings_and_set_env() -> None:
    """Load the local.settings.json file from the root folder and set it in ENV."""
    root_folder = Path(__file__).parent.parent.parent
    settings_file = root_folder / "local.settings.json"
    settings_dict = cast(dict[str, dict[str, str]], loads(settings_file.read_text()))

    for key, value in settings_dict["Values"].items():
        logger.info("setting ENV value for key: %s from value loaded from local.settings.json", key)
        os.environ.setdefault(key, value)
