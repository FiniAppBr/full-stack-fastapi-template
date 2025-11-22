"""
Simple caching utilities.
"""
import hashlib
from functools import lru_cache
from typing import Optional, Tuple, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field


@dataclass
class CacheEntry:
    """Cache entry with TTL."""
    value: any
    expires_at: datetime


class TTLCache:
    """Simple TTL cache for embeddings."""

    def __init__(self, ttl_seconds: int = 3600, max_size: int = 1000):
        self.ttl_seconds = ttl_seconds
        self.max_size = max_size
        self._cache: dict[str, CacheEntry] = {}

    def _hash_key(self, text: str, model: str) -> str:
        """Create a hash key from text and model."""
        content = f"{model}:{text}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def get(self, text: str, model: str) -> Optional[List[float]]:
        """Get embedding from cache if exists and not expired."""
        key = self._hash_key(text, model)
        entry = self._cache.get(key)

        if entry is None:
            return None

        if datetime.now() > entry.expires_at:
            del self._cache[key]
            return None

        return entry.value

    def set(self, text: str, model: str, embedding: List[float]) -> None:
        """Store embedding in cache."""
        # Evict oldest entries if cache is full
        if len(self._cache) >= self.max_size:
            oldest_key = min(self._cache, key=lambda k: self._cache[k].expires_at)
            del self._cache[oldest_key]

        key = self._hash_key(text, model)
        self._cache[key] = CacheEntry(
            value=embedding,
            expires_at=datetime.now() + timedelta(seconds=self.ttl_seconds)
        )

    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()

    @property
    def size(self) -> int:
        """Current cache size."""
        return len(self._cache)


# Global embedding cache instance (1 hour TTL, max 1000 entries)
embedding_cache = TTLCache(ttl_seconds=3600, max_size=1000)
