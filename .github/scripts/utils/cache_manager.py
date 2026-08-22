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

    def get_hash(self, target_path):
        hasher = hashlib.sha256()
        
        if os.path.isfile(target_path):
            with open(target_path, "rb") as f:
                while chunk := f.read(8192):
                    hasher.update(chunk)
        elif os.path.isdir(target_path):
            for root, dirs, files in os.walk(target_path):
                # Ignore .git and .cache folders
                dirs[:] = [d for d in dirs if not d.startswith(".")]
                for file in sorted(files):
                    file_path = os.path.join(root, file)
                    hasher.update(file.encode("utf-8"))
                    try:
                        with open(file_path, "rb") as f:
                            while chunk := f.read(8192):
                                hasher.update(chunk)
                    except Exception:
                        pass
                        
        return hasher.hexdigest()

    def is_cached(self, path):
        if not os.path.exists(path):
            return False
        return self.cache.get(path) == self.get_hash(path)

    def update(self, path):
        if os.path.exists(path):
            self.cache[path] = self.get_hash(path)

    def save(self):
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(self.cache, f, indent=2)
