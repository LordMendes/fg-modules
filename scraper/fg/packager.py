"""Zip unpacked module folder to .mod archive."""

from __future__ import annotations

import tempfile
import zipfile
from pathlib import Path

from .loader import BuildReport


def package_module(folder: Path, out_path: Path) -> Path | None:
    """Zip folder contents to .mod (definition.xml at archive root)."""
    folder = Path(folder)
    def_xml = folder / "definition.xml"
    if not def_xml.exists():
        return None

    db = folder / "db.xml"
    if not db.exists():
        return None

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in folder.rglob("*"):
            if file_path.is_file() and file_path.name != out_path.name:
                arcname = file_path.relative_to(folder).as_posix()
                zf.write(file_path, arcname)

    return out_path


def build_and_package_module(
    scraped_dir: Path,
    mod_path: Path,
    categories: list[str],
    author: str,
    skip_no_detail: bool = True,
) -> BuildReport:
    """Build to a temp folder, zip contents, and write a .mod file."""
    from .builder import build_module

    mod_path = Path(mod_path)
    mod_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="fg-build-") as tmp:
        staging = Path(tmp)
        report = build_module(
            scraped_dir, staging, categories, author, skip_no_detail
        )
        if not package_module(staging, mod_path):
            raise RuntimeError(f"failed to package {mod_path}")

    return report
