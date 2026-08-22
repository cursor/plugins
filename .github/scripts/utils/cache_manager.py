import os
import json
import hashlib

CACHE_FILE = os.path.join(os.getcwd(), ".cache", "plugin_validation.json")

class ValidationCache:
    def __init__(self):
        self.cache = self._load_cache()

    def _load_cache(self):
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def get_hash(directory_path: str) -> str:
    hasher = hashlib.sha256()
    for root, dirs, files in os.walk(directory_path):
        dirs.sort()
        dirs[:] = [d for d in dirs if d not in {".git", ".cache", "__pycache__"}]
        for file in sorted(files):
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, directory_path)
            hasher.update(rel_path.encode("utf-8"))
            with open(full_path, "rb") as f:
                while chunk := f.read(8192): hasher.update(chunk)
    return hasher.hexdigest()