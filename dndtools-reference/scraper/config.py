"""Scraper configuration."""

from __future__ import annotations

BASE_URL = "https://new.dndtools.org"
CLASSIC_BASE_URL = "https://dndtools.org"

USER_AGENT = (
    "fg-modules-scraper/2.0 (+https://github.com/local/fg_modules; personal use)"
)

DEFAULT_DELAY = 0.5
DEFAULT_WORKERS = 8
DEFAULT_TIMEOUT = 30.0
MAX_RETRIES = 3
DEFAULT_PAGE_SIZE = 50
CLASSIC_PAGE_SIZE = 1000
FLUSH_EVERY = 100

SPELL_COMPONENT_KEYS = ("V", "S", "M", "F", "DF", "XP")

# Categories that overlay prerequisite/requirements from classic dndtools.org.
PREREQUISITE_OVERLAY_CATEGORIES = frozenset({"feats", "classes"})

CATEGORY_CONFIG: dict[str, dict[str, object]] = {
    "spells": {"path": "spells", "output": "spells.json", "expected": 5035},
    "feats": {"path": "feats", "output": "feats.json", "expected": 3665},
    "monsters": {"path": "monsters", "output": "monsters.json", "expected": 807},
    "templates": {"path": "templates", "output": "templates.json", "expected": 155},
    "classes": {"path": "classes", "output": "classes.json", "expected": 1054},
    "skills": {"path": "skills", "output": "skills.json", "expected": 80},
    "equipment": {"path": "equipment", "output": "equipment.json", "expected": 65},
    "items": {"path": "items", "output": "items.json", "expected": 816},
    "races": {"path": "races", "output": "races.json", "expected": 150},
    "deities": {"path": "deities", "output": "deities.json", "expected": 670},
    "domains": {"path": "domains", "output": "domains.json", "expected": 368},
    "psionics": {"path": "psionics", "output": "psionics.json", "expected": 703},
    "rules": {"path": "rules", "output": "rules.json", "expected": 273},
}

ALL_CATEGORIES = tuple(CATEGORY_CONFIG.keys())

DEFAULT_OUTPUT_DIR = "data/dndtools"
DEFAULT_CACHE_DIR = "data/dndtools/.cache"
