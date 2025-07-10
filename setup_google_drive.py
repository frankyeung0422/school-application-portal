"""
Google Drive Setup Helper
This script guides you through setting up Google Drive for your application
"""

import streamlit as st
import json
import os

def setup_guide():
    st.title("🔧 Google Drive Setup Guide")

st.markdown("""
    ## 📋 Complete Setup Instructions
    
    Follow these steps to set up Google Drive storage for your application.
    """)
    
    # Step 1: Google Cloud Project
    with st.expander("Step 1: Create Google Cloud Project", expanded=True):
        st.markdown("""
        ### 1.1 Go to Google Cloud Console
        - Visit: https://console.cloud.google.com/
        - Sign in with your Google account
        
        ### 1.2 Create New Project
        - Click the project dropdown at the top
        - Click "New Project"
        - Name: `school-portal-cloud`
        - Click "Create"
        """)
        
        project_created = st.checkbox("✅ I have created a Google Cloud project")
    
    # Step 2: Enable API
    with st.expander("Step 2: Enable Google Drive API", expanded=True):
        st.markdown("""
        ### 2.1 Go to API Library
        - In the left menu, click "APIs & Services" → "Library"
        
        ### 2.2 Enable Drive API
        - Search for "Google Drive API"
        - Click on "Google Drive API"
        - Click "Enable"
        """)
        
        api_enabled = st.checkbox("✅ I have enabled Google Drive API")
    
    # Step 3: Create Service Account
    with st.expander("Step 3: Create Service Account", expanded=True):
        st.markdown("""
        ### 3.1 Go to Credentials
        - In the left menu, click "APIs & Services" → "Credentials"
        
        ### 3.2 Create Service Account
        - Click "Create Credentials" → "Service Account"
        - Name: `streamlit-cloud-db`
        - Description: `Service account for Streamlit Cloud database`
        - Click "Create and Continue"
        
        ### 3.3 Set Permissions
        - Role: "Editor"
        - Click "Continue"
        - Click "Done"
        
        ### 3.4 Create and Download Key
        - Click on your new service account
        - Go to "Keys" tab
        - Click "Add Key" → "Create new key"
        - Choose "JSON"
        - Click "Create"
        - **Download the JSON file** (this is your credentials file)
        """)
        
        service_account_created = st.checkbox("✅ I have created a service account and downloaded the JSON key")
    
    # Step 4: Setup Google Drive
    with st.expander("Step 4: Setup Google Drive Folder", expanded=True):
        st.markdown("""
        ### 4.1 Go to Google Drive
        - Visit: https://drive.google.com
        
        ### 4.2 Create Folder
        - Click "New" → "Folder"
        - Name: `School Portal Database`
        - Click "Create"
        
        ### 4.3 Share Folder
        - Right-click the folder → "Share"
        - Add the service account email (from your JSON file)
        - Set permission to "Editor"
        - Click "Share"
        
        ### 4.4 Get Folder ID
        - Open the folder
        - Copy the folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
        - The folder ID is the long string after `/folders/`
        """)
        
        folder_created = st.checkbox("✅ I have created the folder and got the folder ID")
    
    # Step 5: Update Secrets
    with st.expander("Step 5: Update Secrets File", expanded=True):
        st.markdown("""
        ### 5.1 Open your JSON key file
        - Open the downloaded JSON file in a text editor
        
        ### 5.2 Copy the credentials
        - Select all content (Ctrl+A)
        - Copy (Ctrl+C)
        
        ### 5.3 Update secrets.toml
        - Open `.streamlit/secrets.toml`
        - Replace the placeholder JSON with your actual JSON
        - Replace `your-google-drive-folder-id` with your actual folder ID
        - Save the file
        """)
        
        secrets_updated = st.checkbox("✅ I have updated the secrets file")
    
    # Test the setup
    if st.button("🧪 Test Google Drive Setup"):
        if not all([project_created, api_enabled, service_account_created, folder_created, secrets_updated]):
            st.error("Please complete all setup steps first!")
            return
        
        try:
            # Test the setup
            from google.oauth2.service_account import Credentials
            from googleapiclient.discovery import build
            
            if 'GOOGLE_DRIVE' not in st.secrets:
                st.error("❌ Google Drive secrets not found. Please update your secrets file.")
                return
            
            # Get credentials
            credentials_data = st.secrets['GOOGLE_DRIVE']['CREDENTIALS']
            if isinstance(credentials_data, str):
                credentials_dict = json.loads(credentials_data)
            else:
                credentials_dict = credentials_data
            
            # Test credentials
            credentials = Credentials.from_service_account_info(credentials_dict)
            st.success("✅ Credentials valid!")
            
            # Test API
            drive_service = build('drive', 'v3', credentials=credentials)
            about = drive_service.about().get(fields="user").execute()
            st.success(f"✅ API connection successful! Connected as: {about.get('user', {}).get('emailAddress')}")
            
            # Test folder
            folder_id = st.secrets['GOOGLE_DRIVE']['FOLDER_ID']
            folder = drive_service.files().get(fileId=folder_id, fields="name").execute()
            st.success(f"✅ Folder access successful! Folder: {folder.get('name')}")
            
            st.success("🎉 Google Drive setup is working correctly!")
            
        except Exception as e:
            st.error(f"❌ Setup test failed: {e}")
            st.write(f"Error type: {type(e).__name__}")
    
    # Show current status
    st.markdown("---")
    st.subheader("📊 Current Setup Status")
    
    status_items = [
        ("Google Cloud Project", project_created),
        ("Google Drive API Enabled", api_enabled),
        ("Service Account Created", service_account_created),
        ("Google Drive Folder Setup", folder_created),
        ("Secrets File Updated", secrets_updated)
    ]
    
    for item, status in status_items:
        if status:
            st.success(f"✅ {item}")
        else:
            st.error(f"❌ {item}")

if __name__ == "__main__":
    setup_guide() 