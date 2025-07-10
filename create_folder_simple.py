"""
Simple Google Drive Folder Creation
This script creates a Google Drive folder and returns the folder ID
"""

import json
import os
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

def create_folder():
    print("🔧 Creating Google Drive folder...")
    
    try:
        # Load secrets from file
        import streamlit as st
        
        if 'GOOGLE_DRIVE' not in st.secrets:
            print("❌ Google Drive secrets not found")
            return None
        
        # Get credentials
        credentials_data = st.secrets['GOOGLE_DRIVE']['CREDENTIALS']
        if isinstance(credentials_data, str):
            credentials_dict = json.loads(credentials_data)
        else:
            credentials_dict = credentials_data
        
        # Create credentials object
        credentials = Credentials.from_service_account_info(credentials_dict)
        print("✅ Credentials loaded successfully")
        
        # Build the Drive service
        drive_service = build('drive', 'v3', credentials=credentials)
        print("✅ Google Drive service connected")
        
        # Show current user info
        about = drive_service.about().get(fields="user").execute()
        user_email = about.get('user', {}).get('emailAddress', 'Unknown')
        print(f"Connected as: {user_email}")
        
        # Create folder metadata
        folder_metadata = {
            'name': 'School Portal Database',
            'mimeType': 'application/vnd.google-apps.folder'
        }
        
        print("📁 Creating folder...")
        
        # Create the folder
        folder = drive_service.files().create(
            body=folder_metadata,
            fields='id,name,webViewLink'
        ).execute()
        
        folder_id = folder.get('id')
        folder_name = folder.get('name')
        folder_link = folder.get('webViewLink')
        
        print(f"✅ Folder created successfully!")
        print(f"Folder Name: {folder_name}")
        print(f"Folder ID: {folder_id}")
        print(f"Folder Link: {folder_link}")
        
        # Update the secrets file
        update_secrets_file(folder_id)
        
        return folder_id
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print(f"Error type: {type(e).__name__}")
        return None

def update_secrets_file(folder_id):
    """Update the secrets file with the real folder ID"""
    try:
        secrets_path = ".streamlit/secrets.toml"
        
        # Read current secrets
        with open(secrets_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace the placeholder folder ID
        updated_content = content.replace(
            'FOLDER_ID = "your-google-drive-folder-id"',
            f'FOLDER_ID = "{folder_id}"'
        )
        
        # Write back to file
        with open(secrets_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        
        print(f"✅ Updated secrets file with folder ID: {folder_id}")
        
    except Exception as e:
        print(f"❌ Error updating secrets file: {e}")

if __name__ == "__main__":
    folder_id = create_folder()
    if folder_id:
        print(f"\n🎉 Success! Your Google Drive folder is ready.")
        print(f"Folder ID: {folder_id}")
        print("\nYou can now test your setup with:")
        print("python quick_diagnostic.py")
    else:
        print("\n❌ Failed to create folder. Please check the error above.") 