# transcript_cache.py
from threading import Lock
from typing import Dict

__all__ = ["put", "get", "clear"]

_cache: Dict[str, str] = {}
_lock = Lock()

def put(video_path: str, text: str) -> None:
    with _lock:
        _cache[video_path] = text or ""

def get(video_path: str) -> str:
    with _lock:
        return _cache.get(video_path, "")

def clear(video_path: str) -> None:
    with _lock:
        _cache.pop(video_path, None)
