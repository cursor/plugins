import json
import hashlib
import os

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
                while chunk := f.read(8192):
                    hasher.update(chunk)
    return hasher.hexdigest()

class ValidationCache:
    def __init__(self, cache_file: str = ".cache/plugin_validation.json"):
        self.cache_file = cache_file
        self.cache = self._load_cache()

    def _load_cache(self) -> dict:
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, "r") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def is_cached(self, plugin_name: str, current_hash: str) -> bool:
        return self.cache.get(plugin_name) == current_hash

    def update(self, plugin_name: str, current_hash: str) -> None:
        self.cache[plugin_name] = current_hash

    def save(self) -> None:
        os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
        with open(self.cache_file, "w") as f:
            json.dump(self.cache, f, indent=2)
