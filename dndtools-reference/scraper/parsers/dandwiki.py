"""Parse flaw listings and detail pages from dandwiki.com."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin, unquote

from bs4 import Tag

from ..flaw_utils import DANDWIKI_BASE, DANDWIKI_SOURCE, build_flaw_record, paragraph_html
from .base import html_inner, make_soup

SECTION_PREFIXES = (
    "Prerequisite:",
    "Effect:",
    "Special:",
    "Roleplaying Ideas:",
)


def _is_main_flaw_table(table: Tag) -> bool:
    caption = table.select_one("caption")
    if caption is None:
        return False
    text = caption.get_text(" ", strip=True).lower()
    return "flaws without any" in text


def parse_flaw_index(html: str) -> list[dict[str, Any]]:
    soup = make_soup(html)
    rows: list[dict[str, Any]] = []

    for table in soup.select("table.d20"):
        if not _is_main_flaw_table(table):
            continue
        for tr in table.select("tr"):
            link = tr.select_one("td a[href]")
            if link is None:
                continue
            href = link.get("href", "").strip()
            name = link.get_text(" ", strip=True)
            if not href or not name or "3.5e_flaw" not in href.lower():
                continue
            cells = tr.select("td")
            prerequisite = cells[1].get_text(" ", strip=True) if len(cells) > 1 else ""
            summary = cells[2].get_text(" ", strip=True) if len(cells) > 2 else ""
            url = urljoin(f"{DANDWIKI_BASE}/", href)
            rows.append(
                {
                    "name": name,
                    "url": url,
                    "prerequisite_snippet": prerequisite,
                    "description_snippet": summary,
                }
            )
        break

    return rows


def _extract_detail_name(soup) -> str:
    headline = soup.select_one("#mw-content-text .mw-headline")
    if headline is not None:
        return headline.get_text(" ", strip=True)
    title = soup.select_one("h1 .mw-page-title-main")
    if title is not None:
        text = title.get_text(" ", strip=True)
        return re.sub(r"\s*\(3\.5e Flaw\)\s*$", "", text, flags=re.I).strip()
    return ""


def _parse_labeled_divs(content_root: Tag) -> tuple[str | None, dict[str, str]]:
    description: str | None = None
    sections: dict[str, str] = {}

    for element in content_root.children:
        if not isinstance(element, Tag):
            continue
        if element.name == "hr":
            break
        if element.name not in {"div", "p"}:
            continue

        html = html_inner(element).strip()
        if not html:
            continue

        matched = False
        for prefix in SECTION_PREFIXES:
            if html.startswith(f"<b>{prefix}</b>") or html.startswith(f"<strong>{prefix}</strong>"):
                label = prefix.rstrip(":").lower()
                body = re.sub(r"^<(?:b|strong)>[^<]+</(?:b|strong)>\s*", "", html, flags=re.I).strip()
                sections[label] = body
                matched = True
                break
            plain = element.get_text(" ", strip=True)
            if plain.lower().startswith(prefix.lower()):
                label = prefix.rstrip(":").lower()
                body = plain[len(prefix) :].strip()
                sections[label] = body
                matched = True
                break

        if not matched and description is None and element.name == "div":
            text = element.get_text(" ", strip=True)
            if text and not text.lower().startswith("back to main page"):
                description = text

    return description, sections


def parse_flaw_detail(html: str, source_url: str) -> dict[str, Any]:
    soup = make_soup(html)
    content = soup.select_one("#mw-content-text .mw-parser-output")
    if content is None:
        raise ValueError(f"Missing mw-parser-output in {source_url}")

    name = _extract_detail_name(soup)
    if not name:
        raise ValueError(f"Missing flaw name in {source_url}")

    description, sections = _parse_labeled_divs(content)

    special_parts: list[str] = []
    if sections.get("special"):
        special_parts.append(sections["special"])
    if sections.get("roleplaying ideas"):
        special_parts.append(f"<p><strong>Roleplaying Ideas:</strong> {sections['roleplaying ideas']}</p>")

    special_html = None
    if special_parts:
        special_html = "".join(
            part if part.startswith("<") else paragraph_html(part) or ""
            for part in special_parts
        )

    benefit_body = sections.get("effect")
    prereq_body = sections.get("prerequisite")

    return build_flaw_record(
        name=name,
        slug_suffix="dww",
        source_url=source_url,
        source=dict(DANDWIKI_SOURCE),
        description=description,
        prerequisite_html=paragraph_html(prereq_body) if prereq_body else None,
        benefit_html=paragraph_html(benefit_body) if benefit_body else None,
        special_html=special_html,
    )


def flaw_page_title_from_url(url: str) -> str:
    path = url.rsplit("/", 1)[-1]
    return unquote(path)
