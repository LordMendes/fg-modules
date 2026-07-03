"""HTML cleanup for FG formattedtext fields."""

from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup

BLOCK_TAGS = frozenset(
    {"p", "div", "table", "ul", "ol", "h1", "h2", "h3", "h4", "blockquote", "pre"}
)

# XML 1.0 forbids most C0/C1 control characters.
_INVALID_XML_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]")


def sanitize_xml_text(text: str) -> str:
    """Remove characters that make XML 1.0 invalid."""
    if not text:
        return text
    return _INVALID_XML_RE.sub("", text)


def strip_html_to_text(html: str) -> str:
    if not html or not html.strip():
        return ""
    return sanitize_xml_text(BeautifulSoup(html, "lxml").get_text(" ", strip=True))


def prepare_formatted_html(html: str) -> str:
    """Normalize scraper HTML for FG formattedtext nodes."""
    if not html or not html.strip():
        return "<p />"

    soup = BeautifulSoup(html, "lxml")
    for tag in soup.find_all(["script", "style"]):
        tag.decompose()

    body = soup.body or soup
    inner = "".join(str(c) for c in body.children).strip()
    if not inner:
        return "<p />"

    # Normalize br tags
    inner = re.sub(r"<br\s*/?>", "<br/>", inner, flags=re.I)

    # If only inline content, wrap in paragraph
    if not re.search(r"<(" + "|".join(BLOCK_TAGS) + r")[\s>]", inner, re.I):
        inner = f"<p>{inner}</p>"

    return sanitize_xml_text(inner.strip())


def normalize_class_body_html(html: str) -> str:
    """Ensure block paragraphs for FG formattedtext; convert strong to b."""
    if not html or not html.strip():
        return ""

    soup = BeautifulSoup(html, "lxml")
    for tag in soup.find_all(["script", "style"]):
        tag.decompose()
    for strong in soup.find_all("strong"):
        strong.name = "b"

    body = soup.body or soup
    inner = "".join(str(c) for c in body.children).strip()
    if not inner:
        return ""

    inner = re.sub(r"<br\s*/?>", "<br/>", inner, flags=re.I)

    if not re.search(r"<(" + "|".join(BLOCK_TAGS) + r")[\s>]", inner, re.I):
        parts = re.split(r"(?=<b\b)", inner, flags=re.I)
        parts = [part.strip() for part in parts if part.strip()]
        if len(parts) > 1:
            inner = "".join(f"<p>{part}</p>" for part in parts)
        else:
            inner = f"<p>{inner}</p>"

    return sanitize_xml_text(inner.strip())


def requirements_text_to_html(text: str) -> str:
    """Turn newline-separated requirement lines into FG paragraph blocks."""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return ""
    return sanitize_xml_text("".join(wrap_paragraph(line) for line in lines))


def class_requirements_html(detail: dict[str, Any]) -> str:
    """Build FG requirements formattedtext from scraped class detail."""
    req = detail.get("requirements_structured") or {}
    req_html = req.get("html") or ""
    if not req_html:
        req_text = req.get("text") or detail.get("requirements") or ""
        if req_text:
            req_html = requirements_text_to_html(req_text)
    if not req_html:
        return ""
    return normalize_class_body_html(req_html)


def wrap_paragraph(text: str) -> str:
    if not text or not text.strip():
        return "<p />"
    if text.strip().startswith("<"):
        return prepare_formatted_html(text)
    escaped = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    return sanitize_xml_text(f"<p>{escaped}</p>")


def normalize_fg_table_html(html: str) -> str:
    """FG formattedtext renders <th> as stacked blocks; use <td><b>…</b></td> instead."""
    if not html or "<" not in html:
        return html

    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if not table:
        trs = soup.find_all("tr")
        if not trs:
            return html
        table = soup.new_tag("table")
        for tr in trs:
            table.append(tr.extract())

    for th in table.find_all("th"):
        label = th.get_text(" ", strip=True)
        th.clear()
        th.name = "td"
        bold = soup.new_tag("b")
        bold.string = label
        th.append(bold)

    return str(table)


def strip_loose_table_fragments(html: str) -> str:
    """Remove orphan table rows/cells often left in notes when tables are extracted separately."""
    if not html:
        return html
    html = re.sub(r"<tr\b[^>]*>.*?</tr>", "", html, flags=re.I | re.S)
    html = re.sub(r"</?t(?:able|head|body|foot)[^>]*>", "", html, flags=re.I)
    html = re.sub(r"<th\b[^>]*>.*?</th>", "", html, flags=re.I | re.S)
    return html


def first_sentence(text: str, max_len: int = 120) -> str:
    text = text.strip()
    if not text:
        return ""
    match = re.match(r"^(.{10,}?[.!?])(?:\s|$)", text)
    if match:
        return match.group(1).strip()
    return text[:max_len].strip() + ("..." if len(text) > max_len else "")
