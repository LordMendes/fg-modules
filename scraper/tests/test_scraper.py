"""Unit tests for scraper components."""

from __future__ import annotations

from pathlib import Path

import pytest

from scraper.edition_resolver import (
    EditionResolver,
    parse_edition_index,
    parse_edition_url,
    slugify_rulebook_name,
)
from scraper.pagination import expected_page_count, page_url
from scraper.parsers.base import make_soup, parse_pagination_total
from scraper.parsers.classes import parse_class_detail, parse_classes_index
from scraper.parsers.feats import parse_feats_index, parse_feat_detail
from scraper.parsers.spells import parse_spells_index, parse_spell_detail
from scraper.resolver import build_category_urls, parse_rulebook_url

FIXTURES = Path(__file__).parent / "fixtures"


def load_fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


class TestRulebookUrl:
    def test_parse_complete_divine(self):
        url = (
            "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/"
            "complete-divine--56/index.html"
        )
        edition, slug = parse_rulebook_url(url)
        assert edition == "supplementals-35--5"
        assert slug == "complete-divine--56"

    def test_build_category_urls(self):
        urls = build_category_urls("complete-divine--56")
        assert "spells" in urls
        assert urls["spells"].endswith("/spells/complete-divine--56/index.html")
        assert "/classes/rulebook/complete-divine--56/" in urls["classes"]
        assert "/skills/rulebook/complete-divine--56/" in urls["skills"]


class TestEditionUrl:
    def test_parse_supplementals(self):
        url = "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/index.html"
        assert parse_edition_url(url) == "supplementals-35--5"

    def test_rejects_book_url(self):
        url = (
            "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/"
            "complete-divine--56/index.html"
        )
        with pytest.raises(ValueError):
            parse_edition_url(url)


class TestSlugifyRulebookName:
    def test_complete_divine(self):
        assert slugify_rulebook_name("Complete Divine") == "complete-divine"

    def test_cityscape(self):
        assert slugify_rulebook_name("CityScape") == "cityscape"

    def test_colon_in_name(self):
        name = "Fiendish Codex I: Hordes of the Abyss"
        assert slugify_rulebook_name(name) == "fiendish-codex-i-hordes-of-the-abyss"


class TestEditionIndexParser:
    def test_supplementals_page1(self):
        soup = make_soup(load_fixture("supplementals_index_page1.html"))
        base = "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/index.html"
        entries = parse_edition_index(soup, base)
        assert len(entries) == 20
        assert entries[0].name == "Book of Exalted Deeds"
        assert entries[0].folder_name == "book-of-exalted-deeds"
        assert entries[0].slug == "book-of-exalted-deeds--52"
        assert entries[0].url.endswith("/book-of-exalted-deeds--52/index.html")
        assert entries[5].name == "Complete Divine"
        assert entries[5].folder_name == "complete-divine"

    def test_pagination_total_supplementals(self):
        soup = make_soup(load_fixture("supplementals_index_page1.html"))
        assert parse_pagination_total(soup) == 49


@pytest.mark.slow
class TestEditionResolverIntegration:
    def test_resolve_all_supplementals_books(self, tmp_path):
        from scraper.http_client import HttpClient

        cache = tmp_path / "cache"
        client = HttpClient(cache_dir=cache, delay=0.1)
        resolver = EditionResolver(client.fetch)
        url = "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/index.html"
        books = resolver.resolve(url)
        assert len(books) == 49
        names = {b.name for b in books}
        assert "Complete Divine" in names
        assert "Spell Compendium" in names
        folders = {b.folder_name for b in books}
        assert len(folders) == 49


class TestPagination:
    def test_page_url_first(self):
        base = "https://dnd.arkalseif.info/spells/complete-divine--56/index.html"
        assert page_url(base, 1) == base

    def test_page_url_second(self):
        base = "https://dnd.arkalseif.info/spells/complete-divine--56/index.html"
        assert page_url(base, 2).endswith("index.html_page=2")

    def test_expected_page_count(self):
        assert expected_page_count(128) == 7
        assert expected_page_count(56) == 3
        assert expected_page_count(0) == 1

    def test_pagination_total_spells(self):
        soup = make_soup(load_fixture("spells_index_page1.html"))
        assert parse_pagination_total(soup) == 128


class TestIndexParsers:
    def test_spells_index(self):
        soup = make_soup(load_fixture("spells_index_page1.html"))
        base = "https://dnd.arkalseif.info/spells/complete-divine--56/index.html"
        rows = parse_spells_index(soup, base)
        assert len(rows) == 20
        assert rows[0]["name"] == "Anger of the Noonday Sun"
        assert rows[0]["global_id"] == "690"
        assert rows[0]["school"] == "Evocation"
        assert rows[0]["components"]["V"] is True

    def test_feats_index(self):
        soup = make_soup(load_fixture("feats_index_page1.html"))
        base = "https://dnd.arkalseif.info/feats/complete-divine--56/index.html"
        rows = parse_feats_index(soup, base)
        assert len(rows) == 20
        assert rows[0]["name"] == "Arcane Disciple"
        assert "deity" in rows[0]["summary"].lower()

    def test_classes_index(self):
        soup = make_soup(load_fixture("classes_index.html"))
        base = "https://dnd.arkalseif.info/classes/rulebook/complete-divine--56/index.html"
        rows = parse_classes_index(soup, base)
        assert len(rows) == 31
        assert rows[0]["name"] == "Black Flame Zealot"
        assert rows[0]["is_prestige"] is True
        favored = next(r for r in rows if r["name"] == "Favored Soul")
        assert favored["is_prestige"] is False


class TestDetailParsers:
    def test_spell_detail(self):
        html = load_fixture("spell_detail.html")
        detail = parse_spell_detail(html, "http://example.com")
        assert detail["title"] == "Anger of the Noonday Sun"
        assert detail["school"] == "Evocation"
        assert "Druid 6" in detail["level"]
        assert detail["casting_time"] == "1 standard action"
        assert "blinding flash" in detail["description_text"].lower()
        assert len(detail["also_appears_in"]) >= 1

    def test_feat_detail(self):
        html = load_fixture("feat_detail.html")
        detail = parse_feat_detail(html, "http://example.com")
        assert detail["title"] == "Arcane Disciple"
        assert detail["type"] == "General"
        assert "Knowledge (religion)" in detail["prerequisites"]
        assert "domain" in detail["benefit"].lower()

    def test_class_evangelist_detail(self):
        html = load_fixture("class_evangelist.html")
        detail = parse_class_detail(html, "http://example.com/classes/evangelist/index.html")
        assert detail["title"] == "Evangelist"
        assert detail["class_type"] == "prestige"
        assert detail["hit_die"] == "d6"
        assert detail["skill_points"] == "6 + Int"
        assert detail["skill_ranks"] == 6
        assert "Skill Points:" in detail["description_html"]
        assert "6 + Int" in detail["description_html"]
        assert detail.get("advancement_html")
        assert detail["bab"] == "Medium"
        assert detail["fort"] == "Bad"
        assert detail["ref"] == "Bad"
        assert detail["will"] == "Good"
        assert "Bluff (Cha)" in detail["class_skills"]
        assert len(detail["class_skills_list"]) >= 5
        assert len(detail["class_features"]) >= 5
        assert len(detail["advancement"]) == 5
        names = {f["name"] for f in detail["class_features"]}
        assert "Weapon and Armor Proficiency" in names
        assert any("Fast Talk" in n for n in names)
        assert detail["requirements_structured"]["alignment"]

    def test_class_favored_soul_detail(self):
        html = load_fixture("class_favored-soul.html")
        detail = parse_class_detail(html, "http://example.com")
        assert detail["title"] == "Favored Soul"
        assert detail["class_type"] == "base"
        assert detail["hit_die"] == "d8"
        assert "Skill Points:" in detail["description_html"]
        assert "Spells" in {f["name"] for f in detail["class_features"]}
        assert len(detail["spell_progression"]) >= 1


@pytest.mark.slow
class TestIntegrationCompleteDivine:
    EXPECTED = {
        "spells": 128,
        "feats": 56,
        "classes": 31,
        "items": 1,
        "skills": 0,
        "races": 0,
    }

    def test_full_scrape_counts(self, tmp_path):
        from scraper.engine import BookScraper
        from scraper.http_client import HttpClient

        cache = tmp_path / "cache"
        out = tmp_path / "output"
        client = HttpClient(cache_dir=cache, delay=0.1)
        scraper = BookScraper(client=client, output_dir=out)
        url = (
            "https://dnd.arkalseif.info/rulebooks/supplementals-35--5/"
            "complete-divine--56/index.html"
        )
        result = scraper.scrape(url, list(self.EXPECTED.keys()))
        for cat, expected in self.EXPECTED.items():
            assert result.stats[cat].index_count == expected, cat
            assert len(result.categories[cat]) == expected, cat
