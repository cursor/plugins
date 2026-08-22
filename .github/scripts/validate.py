import os
import sys
import json
import glob
from concurrent.futures import ThreadPoolExecutor
from utils.cache_manager import ValidationCache

cache = ValidationCache()

IGNORE_PATHS = {".git", ".github", ".cache", "node_modules", "scripts", "package-lock.json", "package.json"}

def validate_plugin(plugin_path):
    base_name = os.path.basename(plugin_path)
    if base_name in IGNORE_PATHS or not os.path.exists(plugin_path):
        return True, f"Skipped (system path): {base_name}"

    if cache.is_cached(plugin_path):
        return True, f"Skipped (cached): {base_name}"

    errors = []
    if os.path.isdir(plugin_path):
        json_files = glob.glob(os.path.join(plugin_path, "**/*.json"), recursive=True)
        for jf in json_files:
            try:
                with open(jf, "r", encoding="utf-8") as f:
                    json.load(f)
            except Exception as e:
                errors.append(f"Invalid JSON format in {jf}: {str(e)}")

    if errors:
        return False, "\n".join(errors)

    cache.update(plugin_path)
    return True, f"Validated: {base_name}"

def main():
    target_dir = os.getcwd()
    entries = [os.path.join(target_dir, d) for d in os.listdir(target_dir) if d not in IGNORE_PATHS]
    
    print(f"🔍 Validating plugins across {len(entries)} target paths using parallel workers...")
    
    failed = False
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = executor.map(validate_plugin, entries)
        for success, msg in results:
            print(f" -> {msg}")
            if not success:
                failed = True

    cache.save()
    if failed:
        print("❌ Plugin validation failed!")
        sys.exit(1)
    else:
        print("✅ All plugin configurations validated successfully.")

if __name__ == "__main__":
    main()
