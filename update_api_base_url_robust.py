import os
import re

API_FILE_PATH = "./config/api.ts"
NEW_URL = "https://teleconnect-krga.onrender.com/api"

def update_base_url(file_path):
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return

    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()

    # Match URLs that contain 'localhost' or '192.168.100.38'
    url_pattern = r"(BASE_URL\s*:\s*.*?)(['\"])(.*?)(['\"])"
    
    def replacer(match):
        old_line = match.group(0)
        # Replace only if old URL contains localhost or 192.168.100.38
        if "localhost" in match.group(3) or "192.168.100.38" in match.group(3):
            return f"{match.group(1)}'{NEW_URL}'"
        return old_line

    new_content, count = re.subn(url_pattern, replacer, content, flags=re.MULTILINE)

    if count > 0:
        with open(file_path, "w", encoding="utf-8") as file:
            file.write(new_content)
        print(f"✔ BASE_URL updated in {file_path}")
    else:
        print(f"⚠ No BASE_URL to update or already correct in {file_path}")

if __name__ == "__main__":
    update_base_url(API_FILE_PATH)
