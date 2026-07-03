"""Tests for edition pipeline helpers and build_edition CLI."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from scraper.edition_pipeline import filter_edition_books
from scraper.edition_resolver import EditionBookEntry


def _entry(name: str, folder: str, slug: str) -> EditionBookEntry:
    return EditionBookEntry(
        name=name,
        folder_name=folder,
        slug=slug,
        url=f"https://example.test/{slug}/index.html",
    )


class TestFilterEditionBooks:
    def test_only_matches_folder_slug_or_name(self):
        books = [
            _entry("Complete Divine", "complete-divine", "complete-divine--56"),
            _entry("Complete Arcane", "complete-arcane", "complete-arcane--55"),
        ]
        filtered = filter_edition_books(books, "complete-divine", None)
        assert len(filtered) == 1
        assert filtered[0].name == "Complete Divine"

    def test_limit(self):
        books = [
            _entry("A", "a", "a--1"),
            _entry("B", "b", "b--2"),
            _entry("C", "c", "c--3"),
        ]
        assert len(filter_edition_books(books, None, 2)) == 2


class TestBuildEditionCli:
    def test_list_uses_resolver(self):
        from scraper import build_edition

        books = [
            _entry("Complete Divine", "complete-divine", "complete-divine--56"),
        ]
        with patch.object(
            build_edition.EditionResolver,
            "resolve",
            return_value=books,
        ):
            code = build_edition.main(
                ["https://example.test/rulebooks/supplementals-35--5/index.html", "--list"]
            )
        assert code == 0

    def test_build_only_from_existing_scraped(self, tmp_path):
        from scraper import build_edition

        scraped = tmp_path / "scraped" / "complete-divine"
        scraped.mkdir(parents=True)
        (scraped / "summary.json").write_text('{"book_name":"Complete Divine"}', encoding="utf-8")
        (scraped / "spells.json").write_text("[]", encoding="utf-8")
        (scraped / "feats.json").write_text("[]", encoding="utf-8")
        (scraped / "classes.json").write_text("[]", encoding="utf-8")
        (scraped / "skills.json").write_text("[]", encoding="utf-8")
        (scraped / "items.json").write_text("[]", encoding="utf-8")
        (scraped / "races.json").write_text("[]", encoding="utf-8")

        modules = tmp_path / "modules"
        books = [
            _entry("Complete Divine", "complete-divine", "complete-divine--56"),
        ]

        with patch.object(
            build_edition.EditionResolver,
            "resolve",
            return_value=books,
        ):
            code = build_edition.main(
                [
                    "https://example.test/rulebooks/supplementals-35--5/index.html",
                    "--scraped",
                    str(tmp_path / "scraped"),
                    "--modules",
                    str(modules),
                    "--skip-scrape",
                ]
            )

        assert code == 0
        mod_path = modules / "Complete Divine.mod"
        assert mod_path.exists()
        assert mod_path.stat().st_size > 100

    def test_skip_existing_scrape(self, tmp_path):
        from scraper import build_edition

        scraped = tmp_path / "scraped" / "complete-divine"
        scraped.mkdir(parents=True)
        (scraped / "summary.json").write_text("{}", encoding="utf-8")

        books = [
            _entry("Complete Divine", "complete-divine", "complete-divine--56"),
        ]
        mock_scraper = MagicMock()

        with patch.object(
            build_edition.EditionResolver,
            "resolve",
            return_value=books,
        ), patch.object(build_edition, "BookScraper", return_value=mock_scraper):
            code = build_edition.main(
                [
                    "https://example.test/rulebooks/supplementals-35--5/index.html",
                    "--scraped",
                    str(tmp_path / "scraped"),
                    "--modules",
                    str(tmp_path / "modules"),
                    "--no-zip",
                    "--skip-existing",
                    "--skip-build",
                ]
            )

        assert code == 0
        mock_scraper.scrape.assert_not_called()
