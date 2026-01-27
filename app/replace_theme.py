import re

def replace_theme_in_file(file_path):
    """
    Replace all instances of THEME with VOICE_THEME in the specified file
    """
    try:
        # Read the file
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Replace THEME with VOICE_THEME
        # Using regex to match THEME as a whole word to avoid partial replacements
        new_content = re.sub(r'\bTHEME\b', 'VOICE_THEME', content)
        
        # Count how many replacements were made
        replacements = len(re.findall(r'\bTHEME\b', content))
        
        # Write the modified content back to the file
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(new_content)
        
        print(f"✅ Successfully replaced {replacements} instances of THEME with VOICE_THEME")
        print(f"📁 File updated: {file_path}")
        
    except FileNotFoundError:
        print(f"❌ Error: File not found at {file_path}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def main():
    # Update this path to your actual voice-call.tsx file location
    file_path = r"C:\Users\USER\Desktop\QuickConnect\mobile-app\app\voice-call.tsx"
    
    print("🚀 Starting THEME to VOICE_THEME replacement...")
    print(f"📂 Target file: {file_path}")
    
    # Confirm with user
    response = input("Continue? (y/n): ").strip().lower()
    if response not in ['y', 'yes']:
        print("❌ Operation cancelled")
        return
    
    replace_theme_in_file(file_path)
    
    print("\n🎉 Replacement complete!")
    print("⚠️  Don't forget to also remove this import line manually:")
    print('   import { THEME } from "../theme";')

if __name__ == "__main__":
    main()