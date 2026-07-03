"""Scraper configuration."""

from __future__ import annotations

BASE_URL = "https://dnd.arkalseif.info"
DEFAULT_BASE_URL = BASE_URL

USER_AGENT = (
    "fg-modules-scraper/1.0 (+https://github.com/local/fg_modules; personal use)"
)

DEFAULT_DELAY = 0.5
DEFAULT_TIMEOUT = 30.0
MAX_RETRIES = 3

ALL_CATEGORIES = ("spells", "feats", "classes", "skills", "items", "races")

# Categories that use /rulebook/ infix in index URL
RULEBOOK_INFIX_CATEGORIES = frozenset({"classes", "skills"})

# Categories with paginated index pages
PAGINATED_CATEGORIES = frozenset({"spells", "feats", "items", "races"})

SPELL_COMPONENT_KEYS = ("V", "S", "M", "AF", "DF", "XP")

CATEGORY_INDEX_PATHS: dict[str, str] = {
    "spells": "/spells/{book_slug}/index.html",
    "feats": "/feats/{book_slug}/index.html",
    "classes": "/classes/rulebook/{book_slug}/index.html",
    "skills": "/skills/rulebook/{book_slug}/index.html",
    "items": "/items/{book_slug}/index.html",
    "races": "/races/{book_slug}/index.html",
}
