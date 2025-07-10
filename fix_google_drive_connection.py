"""
Google Drive Connection Fix Tool
This script provides step-by-step guidance to fix Google Drive connection issues.
"""

import streamlit as st
import json
import os

def show_setup_guide():
    st.title("🔧 Google Drive Connection Fix Guide")
    st.write("Follow these steps to fix your Google Drive connection issue.")
    
    # Step 1: Check current status
    st.header("Step 1: Current Status Check")
    
    # Check if we're on Streamlit Cloud
    is_streamlit_cloud = os.getenv('STREAMLIT_CLOUD', False)
    if is_streamlit_cloud:
        st.success("✅ Running on Streamlit Cloud")
    else:
        st.warning("⚠️ Not running on Streamlit Cloud - Google Drive is only needed for cloud deployment")
    
    # Check secrets
    try:
        if 'GOOGLE_DRIVE' in st.secrets:
            st.success("✅ Google Drive secrets found")
            secrets = st.secrets['GOOGLE_DRIVE']
            st.write("Available keys:", list(secrets.keys()))
        else:
            st.error("❌ Google Drive secrets not found")
    except Exception as e:
        st.error(f"❌ Error checking secrets: {e}")
    
    # Step 2: Setup Instructions
    st.header("Step 2: Google Drive Setup Instructions")
    
    with st.expander("📋 Complete Setup Guide", expanded=True):
        st.markdown("""
        ### 1. Create Google Cloud Project
        
        1. Go to [Google Cloud Console](https://console.cloud.google.com/)
        2. Create a new project or select existing one
        3. Enable Google Drive API:
           - Go to "APIs & Services" > "Library"
           - Search for "Google Drive API"
           - Click "Enable"
        
        ### 2. Create Service Account
        
        1. Go to "APIs & Services" > "Credentials"
        2. Click "Create Credentials" > "Service Account"
        3. Name: `streamlit-cloud-db`
        4. Role: "Editor"
        5. Create and download JSON key file
        
        ### 3. Setup Google Drive Folder
        
        1. Go to [Google Drive](https://drive.google.com)
        2. Create folder: `School Portal Database`
        3. Right-click folder > "Share"
        4. Add service account email (from JSON file)
        5. Set permission to "Editor"
        6. Copy folder ID from URL
        
        ### 4. Configure Streamlit Secrets
        
        In your Streamlit Cloud app settings:
        1. Go to your app > Settings > Secrets
        2. Add this configuration:
        """)
        
        st.code("""
[GOOGLE_DRIVE]
CREDENTIALS = '''
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"
}
'''

FOLDER_ID = "your-google-drive-folder-id"
""", language="toml")
    
    # Step 3: Quick Test
    st.header("Step 3: Quick Connection Test")
    
    if st.button("🔍 Run Connection Test"):
        try:
            # Import and test Google Drive connection
            from google.oauth2.service_account import Credentials
            from googleapiclient.discovery import build
            
            if 'GOOGLE_DRIVE' in st.secrets:
                credentials_data = st.secrets['GOOGLE_DRIVE']['CREDENTIALS']
                
                # Parse credentials
                if isinstance(credentials_data, str):
                    credentials_dict = json.loads(credentials_data)
                else:
                    credentials_dict = credentials_data
                
                # Test connection
                credentials = Credentials.from_service_account_info(credentials_dict)
                drive_service = build('drive', 'v3', credentials=credentials)
                
                # Test API call
                about = drive_service.about().get(fields="user").execute()
                st.success("✅ Google Drive connection successful!")
                st.write(f"Connected as: {about.get('user', {}).get('emailAddress', 'Unknown')}")
                
                # Test folder access
                folder_id = st.secrets['GOOGLE_DRIVE'].get('FOLDER_ID')
                if folder_id:
                    folder = drive_service.files().get(fileId=folder_id, fields="name").execute()
                    st.success(f"✅ Folder access successful: {folder.get('name', 'Unknown')}")
                else:
                    st.warning("⚠️ FOLDER_ID not found in secrets")
                    
            else:
                st.error("❌ Google Drive secrets not found")
                
        except Exception as e:
            st.error(f"❌ Connection test failed: {e}")
            st.info("Please check your setup and try again.")
    
    # Step 4: Common Issues
    st.header("Step 4: Common Issues & Solutions")
    
    with st.expander("🚨 Troubleshooting Guide"):
        st.markdown("""
        ### Common Error Messages and Solutions
        
        **1. "Service account not found"**
        - Solution: Check that the service account email in your JSON file matches the one you shared the folder with
        
        **2. "Permission denied"**
        - Solution: Make sure the service account has "Editor" permission on the Google Drive folder
        
        **3. "API not enabled"**
        - Solution: Enable Google Drive API in your Google Cloud Console
        
        **4. "Invalid credentials"**
        - Solution: Check that your JSON credentials file is properly formatted and copied to Streamlit secrets
        
        **5. "Folder not found"**
        - Solution: Verify the folder ID is correct (get it from the folder URL in Google Drive)
        
        **6. "Network connectivity issues"**
        - Solution: This is rare on Streamlit Cloud, but check if your app can access external APIs
        """)
    
    # Step 5: Alternative Solutions
    st.header("Step 5: Alternative Solutions")
    
    st.info("""
    If Google Drive continues to have issues, you can:
    
    1. **Use Simple Cloud Storage** (current fallback)
       - This uses Streamlit's file upload feature
       - Less reliable but easier to set up
    
    2. **Use Local Storage**
       - For development and testing
       - Data won't persist between deployments
    
    3. **Use Other Cloud Storage**
       - AWS S3, Azure Blob Storage, etc.
       - Requires additional setup
    """)
    
    # Step 6: Manual Override
    st.header("Step 6: Manual Storage Override")
    
    storage_choice = st.selectbox(
        "Force storage type (for testing):",
        ["auto", "google_drive", "simple_cloud", "local"],
        help="Override the automatic storage selection"
    )
    
    if st.button("Apply Storage Override"):
        st.session_state['force_storage_type'] = storage_choice
        st.success(f"Storage type set to: {storage_choice}")
        st.info("Restart your app to apply the change")

def main():
    show_setup_guide()
    
    # Add a link to run the diagnostic
    st.header("🔍 Run Full Diagnostic")
    st.write("For a comprehensive analysis of your Google Drive setup, run the diagnostic tool:")
    
    if st.button("Run Google Drive Diagnostic"):
        # Import and run the diagnostic
        try:
            from google_drive_diagnostic import run_diagnostic
            run_diagnostic()
        except ImportError:
            st.error("Diagnostic tool not found. Make sure google_drive_diagnostic.py is in your project.")

if __name__ == "__main__":
    main() 