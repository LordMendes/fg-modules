"""Category parsers — thin wrappers over shared base logic."""

from .base import parse_detail_page, parse_index_page

CATEGORY = "monsters"


def parse_index(soup, page_url: str):
    return parse_index_page(soup, CATEGORY, page_url)


def parse_detail(html: str, source_url: str):
    return parse_detail_page(html, source_url, CATEGORY)
