"""HTTP client with disk cache, retries, and sync/async fetching."""

from __future__ import annotations

import asyncio
import hashlib
import time
from pathlib import Path
from threading import Lock

import httpx

from .config import DEFAULT_DELAY, DEFAULT_TIMEOUT, DEFAULT_WORKERS, MAX_RETRIES, USER_AGENT


class DiskCache:
    def __init__(self, cache_dir: Path | None) -> None:
        self.cache_dir = Path(cache_dir) if cache_dir else None
        self._lock = Lock()
        if self.cache_dir:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _cache_path(self, url: str) -> Path | None:
        if not self.cache_dir:
            return None
        key = hashlib.sha256(url.encode("utf-8")).hexdigest()
        return self.cache_dir / f"{key}.html"

    def read(self, url: str) -> str | None:
        path = self._cache_path(url)
        if path and path.exists():
            return path.read_text(encoding="utf-8", errors="replace")
        return None

    def write(self, url: str, content: str) -> None:
        path = self._cache_path(url)
        if not path:
            return
        with self._lock:
            path.write_text(content, encoding="utf-8")


class HttpClient:
    def __init__(
        self,
        cache_dir: Path | None = None,
        delay: float = DEFAULT_DELAY,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self.cache = DiskCache(cache_dir)
        self.delay = delay
        self.timeout = timeout
        self._last_fetch_at = 0.0

    def _rate_limit(self) -> None:
        if self.delay <= 0:
            return
        elapsed = time.monotonic() - self._last_fetch_at
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

    def fetch(self, url: str) -> str:
        cached = self.cache.read(url)
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
                    self.cache.write(url, text)
                    return text
            except httpx.HTTPStatusError:
                raise
            except (httpx.HTTPError, OSError) as exc:
                last_error = exc
                time.sleep(2**attempt)
        raise RuntimeError(f"Failed to fetch {url}") from last_error


class AsyncHttpClient:
    def __init__(
        self,
        cache_dir: Path | None = None,
        workers: int = DEFAULT_WORKERS,
        delay: float = 0.0,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self.cache = DiskCache(cache_dir)
        self.workers = max(1, workers)
        self.delay = delay
        self.timeout = timeout
        self._semaphore = asyncio.Semaphore(self.workers)
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> AsyncHttpClient:
        self._client = httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
            timeout=self.timeout,
            limits=httpx.Limits(
                max_connections=self.workers * 2,
                max_keepalive_connections=self.workers,
            ),
        )
        return self

    async def __aexit__(self, *args: object) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def fetch(self, url: str) -> str:
        cached = self.cache.read(url)
        if cached is not None:
            return cached

        if self._client is None:
            raise RuntimeError("AsyncHttpClient must be used as an async context manager")

        last_error: Exception | None = None
        for attempt in range(MAX_RETRIES):
            async with self._semaphore:
                if self.delay > 0:
                    await asyncio.sleep(self.delay)
                try:
                    response = await self._client.get(url)
                    if response.status_code == 404:
                        raise httpx.HTTPStatusError(
                            f"404 Not Found: {url}",
                            request=response.request,
                            response=response,
                        )
                    response.raise_for_status()
                    text = response.text
                    self.cache.write(url, text)
                    return text
                except httpx.HTTPStatusError:
                    raise
                except (httpx.HTTPError, OSError) as exc:
                    last_error = exc
            await asyncio.sleep(2**attempt)
        raise RuntimeError(f"Failed to fetch {url}") from last_error
