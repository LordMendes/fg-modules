"""Temporary probe script for new.dndtools.org HTML structure."""

import re
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

BASE = "https://new.dndtools.org"
OUT = Path(__file__).parent / "scraper" / "tests" / "fixtures"


def probe_index(category: str) -> None:
    url = f"{BASE}/{category}?page=1"
    r = httpx.get(url, timeout=30)
    soup = BeautifulSoup(r.text, "lxml")
    body = soup.get_text(" ", strip=True)
    print(f"\n=== {category} index ===")
    for pat in [
        r"(\d+)\s*[-–]\s*(\d+)\s+of\s+(\d+)",
        r"Page\s+(\d+)\s*/\s*(\d+)",
        r"of\s+(\d+)\s+results",
    ]:
        m = re.search(pat, body, re.I)
        if m:
            print(f"  pag: {pat} -> {m.groups()}")
    for a in soup.select('a[href*="page="]')[:8]:
        print(f"  page link: {a.get_text(strip=True)!r} -> {a['href']}")
    ths = [th.get_text(strip=True) for th in soup.select("table thead th")]
    print(f"  headers: {ths}")
    rows = soup.select("table tbody tr")
    print(f"  rows: {len(rows)}")
    if rows:
        link = rows[0].select_one("a")
        if link:
            print(f"  first link: {link['href']}")


def probe_detail(path: str) -> None:
    url = f"{BASE}{path}"
    r = httpx.get(url, timeout=30)
    soup = BeautifulSoup(r.text, "lxml")
    print(f"\n=== detail {path} ===")
    h1 = soup.find("h1")
    print(f"  h1: {h1.get_text(strip=True) if h1 else None}")
    for p in soup.select("h1 + p, h1 ~ p.text-muted-foreground, p.text-muted-foreground")[:3]:
        print(f"  muted p: {p.get('class')} -> {p.get_text(strip=True)!r}")
    for div in soup.select("dl > div")[:12]:
        dt = div.find("dt")
        dd = div.find("dd")
        if dt and dd:
            print(f"  dl: {dt.get_text(strip=True)} => {dd.get_text(strip=True)[:80]}")
    for p in soup.select("p.font-semibold")[:6]:
        print(f"  section: {p.get_text(strip=True)}")
    prose = soup.select_one(".prose")
    if prose:
        print(f"  prose: {prose.get_text(strip=True)[:100]}...")


def save_fixtures() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    samples = {
        "spells_index.html": "/spells?page=1",
        "spells_detail.html": "/spells/acid-breath-3801",
        "feats_index.html": "/feats?page=1",
        "feats_detail.html": "/feats/aberrant-dragonmark-2",
        "monsters_index.html": "/monsters?page=1",
        "monsters_detail.html": None,
        "classes_index.html": "/classes?page=1",
        "classes_detail.html": None,
    }
    for name, path in samples.items():
        if path is None:
            continue
        r = httpx.get(f"{BASE}{path}", timeout=30)
        (OUT / name).write_text(r.text, encoding="utf-8")
        print(f"saved {name} ({len(r.text)} bytes)")


if __name__ == "__main__":
    for cat in ["spells", "feats", "monsters", "classes", "skills", "items"]:
        probe_index(cat)
    probe_detail("/spells/acid-breath-3801")
    probe_detail("/feats/aberrant-dragonmark-2")
    # get first monster/class detail links
    for cat in ["monsters", "classes"]:
        r = httpx.get(f"{BASE}/{cat}?page=1", timeout=30)
        soup = BeautifulSoup(r.text, "lxml")
        link = soup.select_one("table tbody tr a")
        if link:
            probe_detail(link["href"])
    save_fixtures()
