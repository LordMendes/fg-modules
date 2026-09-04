"""Enrich PH/core skill descriptions from 3.5e SRD skill pages (d20srd-equivalent).

Source mirror: https://www.35srd.com/players/skills/skilldescriptions/
(same Open Game Content as https://www.d20srd.org/indexes/skills.htm)

Updates data/dndtools/skills.json in place for matching slugs.
"""

from __future__ import annotations

import argparse
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parents[1]
SKILLS_JSON = ROOT / "data" / "dndtools" / "skills.json"
CACHE_DIR = ROOT / "data" / "dndtools" / ".cache" / "35srd-skills"

INDEX_URL = "https://www.35srd.com/players/skills/skilldescriptions/"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

# Our slug -> 35srd path segment (when not identical after hyphen strip)
SLUG_ALIASES: dict[str, str] = {
    "decipher-script": "decipherscript",
    "disable-device": "disabledevice",
    "escape-artist": "escapeartist",
    "gather-information": "gatherinformation",
    "handle-animal": "handleanimal",
    "move-silently": "movesilently",
    "open-lock": "openlock",
    "sense-motive": "sensemotive",
    "sleight-of-hand": "sleightofhand",
    "speak-language": "speaklanguage",
    "use-magic-device": "usemagicdevice",
    "use-rope": "userope",
    # 3.0 / renamed PH skills → 3.5 SRD equivalents
    "wilderness-lore": "survival",
    "pick-pocket": "sleightofhand",
    "read-lips": "spot",
}

# Knowledge field pages reuse the core Knowledge SRD write-up
KNOWLEDGE_FAMILY_PREFIX = "knowledge-"

HEADING_MAP = {"h5": "h4", "h6": "h5", "h4": "h3", "h3": "h2"}


def slug_to_path(slug: str) -> str | None:
    if slug in SLUG_ALIASES:
        return SLUG_ALIASES[slug]
    if slug.startswith(KNOWLEDGE_FAMILY_PREFIX):
        return "knowledge"
    # craft / perform / profession variants stay on their own non-SRD pages
    if slug.endswith("-variant") or slug.endswith("-oa-variant") or slug.endswith("-ecs-variant"):
        return None
    if slug.endswith("-tob-variant"):
        return None
    return slug.replace("-", "")


def fetch(url: str, client: httpx.Client, use_cache: bool = True) -> str:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    key = re.sub(r"[^a-z0-9]+", "-", url.lower()).strip("-")
    path = CACHE_DIR / f"{key}.html"
    if use_cache and path.exists():
        return path.read_text(encoding="utf-8")
    response = client.get(url)
    response.raise_for_status()
    path.write_text(response.text, encoding="utf-8")
    time.sleep(0.35)
    return response.text


def discover_skill_urls(client: httpx.Client) -> dict[str, str]:
    """Map path segment -> absolute URL from the skill descriptions index."""
    html = fetch(INDEX_URL, client)
    soup = BeautifulSoup(html, "html.parser")
    out: dict[str, str] = {}
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/skilldescriptions/" not in href:
            continue
        segment = href.rstrip("/").rsplit("/", 1)[-1].lower()
        if segment in {"", "skilldescriptions"}:
            continue
        out[segment] = urljoin(INDEX_URL, href)
    return out


def _clean_element(el: Tag) -> Tag | None:
    """Return a sanitized clone suitable for description_html."""
    name = el.name
    if name is None:
        return None
    if name in {"script", "style", "nav", "aside"}:
        return None

    # Drop empty wrappers that are only whitespace
    if name in HEADING_MAP:
        clone = BeautifulSoup("", "html.parser").new_tag(HEADING_MAP[name])
        clone.string = el.get_text(" ", strip=True)
        return clone if clone.string else None

    if name == "a":
        # Keep link text only (avoid outbound SRD chrome links)
        text = el.get_text(" ", strip=True)
        if not text:
            return None
        span = BeautifulSoup("", "html.parser").new_tag("span")
        span.string = text
        return span

    if name == "table":
        clone = BeautifulSoup(str(el), "html.parser").find("table")
        assert clone is not None
        for a in clone.find_all("a"):
            a.replace_with(a.get_text(" ", strip=True))
        for tag in clone.find_all(True):
            allowed = {"table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "p", "em", "strong", "i", "b", "br"}
            if tag.name not in allowed:
                tag.unwrap()
            else:
                tag.attrs = {}
        return clone

    if name in {"p", "ul", "ol", "li", "em", "strong", "i", "b", "br", "blockquote"}:
        clone = BeautifulSoup(str(el), "html.parser").find(name)
        assert clone is not None
        for a in clone.find_all("a"):
            a.replace_with(a.get_text(" ", strip=True))
        for tag in clone.find_all(True):
            if tag.name == "a":
                continue
            if tag.name not in {"p", "ul", "ol", "li", "em", "strong", "i", "b", "br", "blockquote", "span"}:
                tag.unwrap()
            else:
                # drop class/style noise
                tag.attrs = {k: v for k, v in tag.attrs.items() if k in {"colspan", "rowspan"}}
        return clone

    return None


def parse_skill_page(html: str) -> tuple[str, str, str]:
    """Return (title_line, description_html, description_text)."""
    soup = BeautifulSoup(html, "html.parser")
    article = soup.select_one("article") or soup.select_one("main") or soup.body
    if article is None:
        raise ValueError("No article content found")

    skill_h1: Tag | None = None
    for h1 in article.find_all("h1"):
        if "(" in h1.get_text():
            skill_h1 = h1
            break
    if skill_h1 is None:
        # Speak Language uses "None" ability still with parentheses on some mirrors
        titles = article.find_all("h1")
        skill_h1 = titles[-1] if titles else None
    if skill_h1 is None:
        raise ValueError("No skill title heading found")

    title_line = skill_h1.get_text(" ", strip=True)
    chunks: list[str] = []
    for sibling in skill_h1.next_siblings:
        if not isinstance(sibling, Tag):
            continue
        if sibling.name == "h1":
            break
        cleaned = _clean_element(sibling)
        if cleaned is None:
            continue
        text = cleaned.get_text(" ", strip=True)
        if not text:
            continue
        # Skip leftover TOC-ish numbered outlines if any leak through
        if re.fullmatch(r"[\d.\s]+", text):
            continue
        chunks.append(str(cleaned))

    description_html = "\n".join(chunks).strip()
    # Normalize whitespace a bit
    description_html = re.sub(r"\n{3,}", "\n\n", description_html)
    plain = BeautifulSoup(description_html, "html.parser").get_text("\n", strip=True)
    return title_line, description_html, plain


def enrich_skills(dry_run: bool = False, force: bool = False) -> None:
    records: list[dict[str, Any]] = json.loads(SKILLS_JSON.read_text(encoding="utf-8"))
    by_slug = {r["slug"]: r for r in records}

    with httpx.Client(
        headers={"User-Agent": USER_AGENT, "Accept": "text/html"},
        follow_redirects=True,
        timeout=45.0,
    ) as client:
        url_by_segment = discover_skill_urls(client)
        print(f"Discovered {len(url_by_segment)} SRD skill pages")

        # Cache parsed pages by segment so Knowledge subtypes share one fetch
        parsed_by_segment: dict[str, tuple[str, str, str]] = {}
        updated = 0
        skipped = 0
        missing = 0

        for record in records:
            slug = record["slug"]
            segment = slug_to_path(slug)
            if segment is None:
                skipped += 1
                continue
            url = url_by_segment.get(segment)
            if not url:
                print(f"  no SRD page for {slug} ({segment})")
                missing += 1
                continue

            if segment not in parsed_by_segment:
                html = fetch(url, client)
                parsed_by_segment[segment] = parse_skill_page(html)

            title_line, description_html, description_text = parsed_by_segment[segment]
            old_html = record.get("description_html") or ""
            if not force and len(old_html) > len(description_html) * 0.9 and "Check" in old_html:
                # Already looks complete
                skipped += 1
                continue

            record["description_html"] = description_html
            record["description_text"] = description_text
            record["srd_title_line"] = title_line
            record["srd_source_url"] = url
            record["srd_enriched_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            updated += 1
            print(f"  enriched {slug} ({len(description_html)} html chars) <- {title_line}")

    print(f"Updated {updated}, skipped {skipped}, missing {missing}")
    if dry_run:
        print("Dry run: not writing skills.json")
        return

    SKILLS_JSON.write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {SKILLS_JSON}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true", help="Overwrite even if description looks complete")
    args = parser.parse_args()
    enrich_skills(dry_run=args.dry_run, force=args.force)


if __name__ == "__main__":
    main()
