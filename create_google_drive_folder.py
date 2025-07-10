"""
Google Drive Folder Creation Helper
This script will create a Google Drive folder and get the folder ID for you
"""

import streamlit as st
import json
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io

def create_google_drive_folder():
    st.title("📁 Create Google Drive Folder")
    
    st.write("This script will create a Google Drive folder for your database and get the folder ID.")
    
    # Check if credentials are available
    if 'GOOGLE_DRIVE' not in st.secrets:
        st.error("❌ Google Drive credentials not found in secrets")
        st.info("Please make sure your secrets file is properly configured")
        return
    
    try:
        # Get credentials
        credentials_data = st.secrets['GOOGLE_DRIVE']['CREDENTIALS']
        if isinstance(credentials_data, str):
            credentials_dict = json.loads(credentials_data)
        else:
            credentials_dict = credentials_data
        
        # Create credentials object
        credentials = Credentials.from_service_account_info(credentials_dict)
        st.success("✅ Credentials loaded successfully")
        
        # Build the Drive service
        drive_service = build('drive', 'v3', credentials=credentials)
        st.success("✅ Google Drive service connected")
        
        # Show current user info
        about = drive_service.about().get(fields="user").execute()
        user_email = about.get('user', {}).get('emailAddress', 'Unknown')
        st.write(f"Connected as: {user_email}")
        
        # Create folder
        if st.button("📁 Create School Portal Database Folder"):
            st.write("Creating folder...")
            
            # Create folder metadata
            folder_metadata = {
                'name': 'School Portal Database',
                'mimeType': 'application/vnd.google-apps.folder'
            }
            
            # Create the folder
            folder = drive_service.files().create(
                body=folder_metadata,
                fields='id,name,webViewLink'
            ).execute()
            
            folder_id = folder.get('id')
            folder_name = folder.get('name')
            folder_link = folder.get('webViewLink')
            
            st.success(f"✅ Folder created successfully!")
            st.write(f"**Folder Name:** {folder_name}")
            st.write(f"**Folder ID:** `{folder_id}`")
            st.write(f"**Folder Link:** [Open in Google Drive]({folder_link})")
            
            # Update secrets file with the folder ID
            st.subheader("🔧 Update Your Secrets File")
            st.write("Copy this folder ID and update your `.streamlit/secrets.toml` file:")
            
            st.code(folder_id, language="text")
            
            # Show the complete secrets configuration
            st.subheader("📋 Complete Secrets Configuration")
            complete_config = f"""[GOOGLE_DRIVE]
CREDENTIALS = '''
{json.dumps(credentials_dict, indent=2)}
'''

FOLDER_ID = "{folder_id}"
"""
            
            st.code(complete_config, language="toml")
            
            # Download the complete configuration
            st.download_button(
                label="📥 Download Complete Secrets File",
                data=complete_config,
                file_name="secrets.toml",
                mime="text/plain"
            )
            
            st.success("🎉 Your Google Drive folder is ready!")
            st.info("""
            **Next Steps:**
            1. Copy the folder ID above
            2. Update your `.streamlit/secrets.toml` file
            3. Replace `your-google-drive-folder-id` with the actual folder ID
            4. Test your setup with the diagnostic tool
            """)
        
        # Test existing folder if folder ID is provided
        if 'FOLDER_ID' in st.secrets['GOOGLE_DRIVE']:
            folder_id = st.secrets['GOOGLE_DRIVE']['FOLDER_ID']
            if folder_id != "your-google-drive-folder-id":
                st.subheader("🔍 Test Existing Folder")
                if st.button("Test Folder Access"):
                    try:
                        folder = drive_service.files().get(
                            fileId=folder_id, 
                            fields="id,name,webViewLink,permissions"
                        ).execute()
                        
                        st.success(f"✅ Folder access successful!")
                        st.write(f"**Folder Name:** {folder.get('name')}")
                        st.write(f"**Folder ID:** {folder.get('id')}")
                        st.write(f"**Folder Link:** [Open in Google Drive]({folder.get('webViewLink')})")
                        
                        # Check permissions
                        permissions = folder.get('permissions', [])
                        service_account_email = credentials_dict.get('client_email')
                        
                        has_permission = False
                        for permission in permissions:
                            if permission.get('emailAddress') == service_account_email:
                                role = permission.get('role', '')
                                st.success(f"✅ Service account has {role} permission")
                                has_permission = True
                                break
                        
                        if not has_permission:
                            st.warning("⚠️ Service account may not have proper folder permissions")
                            st.write(f"Service account email: {service_account_email}")
                            st.info("Make sure to share the folder with the service account email")
                        
                    except Exception as e:
                        st.error(f"❌ Folder access failed: {e}")
        
    except Exception as e:
        st.error(f"❌ Error: {e}")
        st.write(f"Error type: {type(e).__name__}")

if __name__ == "__main__":
    create_google_drive_folder() 