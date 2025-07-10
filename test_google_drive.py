"""
Simple Google Drive Connection Test
Run this to test if your Google Drive setup is working.
"""

import streamlit as st
import json
import os

def test_google_drive():
    st.title("🧪 Google Drive Connection Test")
    
    # Check environment
    st.write(f"**Environment:** {'Streamlit Cloud' if os.getenv('STREAMLIT_CLOUD') else 'Local'}")
    
    # Check if secrets are available
    try:
        if 'GOOGLE_DRIVE' in st.secrets:
            st.success("✅ Google Drive secrets found")
            secrets = st.secrets['GOOGLE_DRIVE']
            st.write(f"Available keys: {list(secrets.keys())}")
            
            # Test credentials
            if 'CREDENTIALS' in secrets:
                st.success("✅ CREDENTIALS found")
                try:
                    creds = secrets['CREDENTIALS']
                    if isinstance(creds, str):
                        creds_dict = json.loads(creds)
                    else:
                        creds_dict = creds
                    
                    st.success("✅ Credentials parsed successfully")
                    st.write(f"Service account: {creds_dict.get('client_email', 'Unknown')}")
                    
                except json.JSONDecodeError as e:
                    st.error(f"❌ Invalid JSON in credentials: {e}")
                    return False
            else:
                st.error("❌ CREDENTIALS not found")
                return False
            
            # Test folder ID
            if 'FOLDER_ID' in secrets:
                st.success("✅ FOLDER_ID found")
                st.write(f"Folder ID: {secrets['FOLDER_ID']}")
            else:
                st.error("❌ FOLDER_ID not found")
                return False
                
        else:
            st.error("❌ Google Drive secrets not found")
            return False
            
    except Exception as e:
        st.error(f"❌ Error checking secrets: {e}")
        return False
    
    # Test Google Drive API
    if st.button("🔍 Test Google Drive API"):
        try:
            from google.oauth2.service_account import Credentials
            from googleapiclient.discovery import build
            
            # Get credentials
            creds_data = st.secrets['GOOGLE_DRIVE']['CREDENTIALS']
            if isinstance(creds_data, str):
                creds_dict = json.loads(creds_data)
            else:
                creds_dict = creds_data
            
            # Create credentials object
            credentials = Credentials.from_service_account_info(creds_dict)
            st.success("✅ Credentials object created")
            
            # Build service
            drive_service = build('drive', 'v3', credentials=credentials)
            st.success("✅ Drive service built")
            
            # Test API call
            about = drive_service.about().get(fields="user").execute()
            user_email = about.get('user', {}).get('emailAddress', 'Unknown')
            st.success(f"✅ API connection successful")
            st.write(f"Connected as: {user_email}")
            
            # Test folder access
            folder_id = st.secrets['GOOGLE_DRIVE']['FOLDER_ID']
            folder = drive_service.files().get(fileId=folder_id, fields="name,permissions").execute()
            st.success(f"✅ Folder access successful: {folder.get('name', 'Unknown')}")
            
            # Check permissions
            permissions = folder.get('permissions', [])
            service_account_email = creds_dict.get('client_email')
            
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
            
            return True
            
        except Exception as e:
            st.error(f"❌ API test failed: {e}")
            st.write(f"Error type: {type(e).__name__}")
            return False
    
    return True

if __name__ == "__main__":
    test_google_drive() 