"""Parser registry for all categories."""

from __future__ import annotations

from typing import Any, Callable

from bs4 import BeautifulSoup

from .base import parse_detail_page, parse_index_page
from . import classes as classes_parser

IndexParser = Callable[[BeautifulSoup, str], list[dict[str, Any]]]
DetailParser = Callable[[str, str], dict[str, Any]]


def _make_index_parser(category: str) -> IndexParser:
    def parser(soup: BeautifulSoup, page_url: str) -> list[dict[str, Any]]:
        return parse_index_page(soup, category, page_url)

    return parser


def _make_detail_parser(category: str) -> DetailParser:
    def parser(html: str, source_url: str) -> dict[str, Any]:
        return parse_detail_page(html, source_url, category)

    return parser


CATEGORIES = (
    "spells",
    "feats",
    "monsters",
    "templates",
    "classes",
    "skills",
    "equipment",
    "items",
    "races",
    "deities",
    "domains",
    "psionics",
    "rules",
)

INDEX_PARSERS = {category: _make_index_parser(category) for category in CATEGORIES}
DETAIL_PARSERS = {category: _make_detail_parser(category) for category in CATEGORIES}
DETAIL_PARSERS["classes"] = classes_parser.parse_detail
