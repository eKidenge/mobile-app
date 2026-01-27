import os
import re

# Path to your api.ts file
API_FILE_PATH = "./config/api.ts"

# Old and new base URLs
OLD_URL_PATTERN = r"(BASE_URL:\s*)(['\"])(.*?)(['\"])"
NEW_URL = "https://teleconnect-krga.onrender.com/api"

def update_base_url(file_path):
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return

    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()

    # Replace the old BASE_URL value with the new one
    new_content, count = re.subn(OLD_URL_PATTERN, rf"\1\2{NEW_URL}\4", content)

    if count > 0:
        with open(file_path, "w", encoding="utf-8") as file:
            file.write(new_content)
        print(f"✔ Updated BASE_URL in {file_path}")
    else:
        print(f"⚠ No BASE_URL found or already up-to-date in {file_path}")

if __name__ == "__main__":
    update_base_url(API_FILE_PATH)
