import os

# Root directory of your project
PROJECT_ROOT = os.path.abspath(".")

# Strings to search for
search_terms = ["localhost", "127.0.0.1"]

# File extensions to check (add more if needed)
file_extensions = [".ts", ".tsx", ".js", ".py", ".env", ".json"]

# Store results
matches = []

for root, dirs, files in os.walk(PROJECT_ROOT):
    for file in files:
        if any(file.endswith(ext) for ext in file_extensions):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    for line_num, line in enumerate(f, start=1):
                        for term in search_terms:
                            if term in line:
                                matches.append(f"{file_path}:{line_num} -> {line.strip()}")
            except Exception as e:
                print(f"Could not read file {file_path}: {e}")

if matches:
    print("❌ Found references to localhost/127.0.0.1:")
    for match in matches:
        print(match)
else:
    print("✅ No references to localhost or 127.0.0.1 found.")
