#!/usr/bin/env python3
"""
Deployment helper script for Streamlit Community Cloud
This script checks if all required files are present and provides deployment instructions.
"""

import os
import json
import sys

def check_required_files():
    """Check if all required files for deployment are present"""
    required_files = [
        'streamlit_app.py',
        'requirements.txt',
        '.streamlit/config.toml'
    ]
    
    optional_files = [
        'backend/scraped_data.json'
    ]
    
    missing_files = []
    present_files = []
    
    print("🔍 Checking required files...")
    
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
            present_files.append(file_path)
        else:
            print(f"❌ {file_path} - MISSING")
            missing_files.append(file_path)
    
    print("\n📁 Checking optional files...")
    
    for file_path in optional_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
            present_files.append(file_path)
        else:
            print(f"⚠️  {file_path} - Not found (optional)")
    
    return missing_files, present_files

def validate_json_data():
    """Validate the JSON data file if it exists"""
    json_file = 'backend/scraped_data.json'
    
    if os.path.exists(json_file):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if isinstance(data, list) and len(data) > 0:
                print(f"✅ JSON data validated: {len(data)} kindergartens found")
                return True
            else:
                print("❌ JSON data is empty or invalid format")
                return False
        except json.JSONDecodeError as e:
            print(f"❌ JSON data is invalid: {e}")
            return False
    else:
        print("⚠️  No JSON data file found - app will use sample data")
        return True

def check_python_dependencies():
    """Check if required Python packages are available"""
    required_packages = [
        'streamlit',
        'pandas',
        'plotly',
        'streamlit_option_menu',
        'streamlit_autorefresh'
    ]
    
    missing_packages = []
    
    print("\n🐍 Checking Python dependencies...")
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - Not installed")
            missing_packages.append(package)
    
    return missing_packages

def generate_deployment_instructions():
    """Generate deployment instructions"""
    print("\n" + "="*60)
    print("🚀 STREAMLIT COMMUNITY CLOUD DEPLOYMENT INSTRUCTIONS")
    print("="*60)
    
    print("""
1. 📁 PREPARE YOUR REPOSITORY
   - Create a GitHub repository (if you don't have one)
   - Upload all the files to your repository
   - Make sure the repository is public (required for free tier)

2. 🌐 DEPLOY TO STREAMLIT CLOUD
   - Go to: https://share.streamlit.io
   - Sign in with your GitHub account
   - Click "New app"
   - Configure your app:
     * Repository: [Your GitHub repository]
     * Branch: main
     * Main file path: streamlit_app.py
     * App URL: [Choose a custom URL]

3. ✅ VERIFY DEPLOYMENT
   - Wait for the build to complete
   - Check the deployment logs for any errors
   - Test all features of your app

4. 🔄 UPDATES
   - Push changes to your GitHub repository
   - Streamlit will automatically rebuild your app
""")

def main():
    """Main function"""
    print("🏫 Hong Kong School Application Portal - Deployment Checker")
    print("="*60)
    
    # Check files
    missing_files, present_files = check_required_files()
    
    # Validate JSON data
    json_valid = validate_json_data()
    
    # Check dependencies
    missing_packages = check_python_dependencies()
    
    # Summary
    print("\n" + "="*60)
    print("📋 DEPLOYMENT SUMMARY")
    print("="*60)
    
    if missing_files:
        print(f"❌ {len(missing_files)} required files missing:")
        for file in missing_files:
            print(f"   - {file}")
        print("\nPlease create the missing files before deploying.")
        return False
    
    if missing_packages:
        print(f"⚠️  {len(missing_packages)} packages not installed:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\nRun: pip install -r requirements.txt")
    
    if json_valid and not missing_files:
        print("✅ All checks passed! Ready for deployment.")
        generate_deployment_instructions()
        return True
    
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 