"""HTTP client with disk cache, retries, and rate limiting."""

from __future__ import annotations

import hashlib
import time
from pathlib import Path

import httpx

from .config import DEFAULT_DELAY, DEFAULT_TIMEOUT, MAX_RETRIES, USER_AGENT


class HttpClient:
    def __init__(
        self,
        cache_dir: Path | None = None,
        delay: float = DEFAULT_DELAY,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self.cache_dir = Path(cache_dir) if cache_dir else None
        self.delay = delay
        self.timeout = timeout
        self._last_fetch_at = 0.0
        if self.cache_dir:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _cache_path(self, url: str) -> Path | None:
        if not self.cache_dir:
            return None
        key = hashlib.sha256(url.encode("utf-8")).hexdigest()
        return self.cache_dir / f"{key}.html"

    def _read_cache(self, url: str) -> str | None:
        path = self._cache_path(url)
        if path and path.exists():
            return path.read_text(encoding="utf-8", errors="replace")
        return None

    def _write_cache(self, url: str, content: str) -> None:
        path = self._cache_path(url)
        if path:
            path.write_text(content, encoding="utf-8")

    def _rate_limit(self) -> None:
        if self.delay <= 0:
            return
        elapsed = time.monotonic() - self._last_fetch_at
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

    def fetch(self, url: str) -> str:
        cached = self._read_cache(url)
        if cached is not None:
            return cached

        last_error: Exception | None = None
        for attempt in range(MAX_RETRIES):
            self._rate_limit()
            try:
                with httpx.Client(
                    headers={"User-Agent": USER_AGENT},
                    follow_redirects=True,
                    timeout=self.timeout,
                ) as client:
                    response = client.get(url)
                    self._last_fetch_at = time.monotonic()
                    if response.status_code == 404:
                        raise httpx.HTTPStatusError(
                            f"404 Not Found: {url}",
                            request=response.request,
                            response=response,
                        )
                    response.raise_for_status()
                    text = response.text
                    self._write_cache(url, text)
                    return text
            except httpx.HTTPStatusError:
                raise
            except (httpx.HTTPError, OSError) as exc:
                last_error = exc
                time.sleep(2**attempt)
        raise RuntimeError(f"Failed to fetch {url}") from last_error
