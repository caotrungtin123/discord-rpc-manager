"""Binix Voice runner entry point.

This file is intentionally a starter shell. Add your Discord voice client
implementation inside `run_voice` and keep secrets outside source control.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

CONFIG_PATH = Path(__file__).with_name("config.example.json")


def load_config(path: Path = CONFIG_PATH) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


async def run_voice(config: dict[str, Any]) -> None:
    """Connect your own Discord voice implementation here."""
    raise NotImplementedError("Add your Voice implementation in run_voice().")


if __name__ == "__main__":
    print("Voice starter is ready. See runner/voice/README.md before coding.")
