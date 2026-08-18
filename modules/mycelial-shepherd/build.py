#!/usr/bin/env python3
"""Build Mycelial Shepherd Fantasy Grounds module."""

from __future__ import annotations

import sys
from pathlib import Path

MODULE_DIR = Path(__file__).resolve().parent
ROOT = MODULE_DIR.parent.parent
FG_BUILDER = ROOT / "fg-builder"
sys.path.insert(0, str(FG_BUILDER))

from scraper.fg.builder import build_module  # noqa: E402
from scraper.fg.packager import package_module  # noqa: E402

MOD_NAME = "Lordcaca homebrew.mod"
FG_MODULES = Path.home() / "AppData/Roaming/SmiteWorks/Fantasy Grounds/modules"


def main() -> None:
    report = build_module(
        MODULE_DIR,
        MODULE_DIR,
        categories=["classes"],
        author="LordCaca",
    )
    out = package_module(MODULE_DIR, FG_MODULES / MOD_NAME)
    if out is None:
        raise SystemExit("Failed to package module")
    print(f"Built {out}")
    print(f"Written: {report.written}")
    for warning in report.warnings:
        print(f"  warning: {warning}")


if __name__ == "__main__":
    main()
