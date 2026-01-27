import os
import re

# The text to search for
SEARCH_TEXT = r"192\.168\.100\.38"

# File types to scan
FILE_EXTENSIONS = (".js", ".ts", ".tsx", ".py", ".json", ".html")

def search_in_file(file_path):
    """Check if the file contains the search text."""
    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()

    matches = re.findall(SEARCH_TEXT, content)
    if matches:
        print(f"❌ Found {len(matches)} occurrence(s) in: {file_path}")
        return True
    return False

def search_all_files(root_folder="."):
    """Walk through all folders and search for the text in files."""
    total_files_with_matches = 0

    for root, _, files in os.walk(root_folder):
        for filename in files:
            if filename.lower().endswith(FILE_EXTENSIONS):
                full_path = os.path.join(root, filename)
                if search_in_file(full_path):
                    total_files_with_matches += 1

    if total_files_with_matches == 0:
        print("\n✅ No remaining occurrences found.")
    else:
        print(f"\n⚠ Total files with occurrences: {total_files_with_matches}")

if __name__ == "__main__":
    print("Scanning for remaining '192.168.100.38' occurrences...\n")
    search_all_files(".")
