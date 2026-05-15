from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from threading import Lock
from time import time


@dataclass
class Bucket:
    timestamps: deque[float]

# 60 requests per minute = 1 request per second on average
class InMemoryRateLimiter:
    def __init__(self, limit_per_minute: int) -> None:
        self.limit_per_minute = max(1, limit_per_minute)
        self.window_seconds = 60.0
        self._buckets: dict[str, Bucket] = {}
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = time()
        threshold = now - self.window_seconds
        with self._lock:
            bucket = self._buckets.get(key)
            if bucket is None:
                bucket = Bucket(timestamps=deque())
                self._buckets[key] = bucket

            while bucket.timestamps and bucket.timestamps[0] < threshold:
                bucket.timestamps.popleft()

            if len(bucket.timestamps) >= self.limit_per_minute:
                return False

            bucket.timestamps.append(now)
            return True
