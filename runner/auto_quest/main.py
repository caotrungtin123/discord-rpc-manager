"""Binix Auto Quest runner entry point.

This file is intentionally a starter shell. Implement only flows that comply
with Discord's terms and keep credentials outside source control.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

CONFIG_PATH = Path(__file__).with_name("config.example.json")


def load_config(path: Path = CONFIG_PATH) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


async def run_auto_quest(config: dict[str, Any]) -> None:
    """Connect your own permitted quest workflow here."""
    raise NotImplementedError("Add your Auto Quest implementation here.")


if __name__ == "__main__":
    print("Auto Quest starter is ready. See runner/auto_quest/README.md before coding.")
