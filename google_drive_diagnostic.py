"""
Google Drive Connection Diagnostic Tool
This script helps identify why Google Drive storage is not connecting properly.
"""

import streamlit as st
import json
import os
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload
import io

def run_diagnostic():
    st.title("🔍 Google Drive Connection Diagnostic")
    st.write("This tool will help identify why Google Drive storage is not connecting.")
    
    # Step 1: Check if required packages are installed
    st.header("Step 1: Package Dependencies")
    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build
        st.success("✅ Google Drive API packages are installed")
    except ImportError as e:
        st.error(f"❌ Missing Google Drive API packages: {e}")
        st.info("Install with: pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client")
        return False
    
    # Step 2: Check Streamlit secrets
    st.header("Step 2: Streamlit Secrets Configuration")
    try:
        if 'GOOGLE_DRIVE' in st.secrets:
            google_drive_secrets = st.secrets['GOOGLE_DRIVE']
            st.success("✅ Google Drive secrets found")
            
            # Check required keys
            required_keys = ['CREDENTIALS', 'FOLDER_ID']
            missing_keys = []
            
            for key in required_keys:
                if key in google_drive_secrets:
                    st.success(f"✅ {key} found")
                else:
                    st.error(f"❌ {key} missing")
                    missing_keys.append(key)
            
            if missing_keys:
                st.error(f"Missing required keys: {missing_keys}")
                return False
                
            # Display available keys
            st.write("Available keys:", list(google_drive_secrets.keys()))
            
        else:
            st.error("❌ Google Drive secrets not found")
            st.info("""
            Please add your Google Drive credentials to Streamlit secrets:
            
            ```toml
            [GOOGLE_DRIVE]
            CREDENTIALS = '''
            {
              "type": "service_account",
              "project_id": "your-project-id",
              "private_key_id": "your-private-key-id",
              "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
              "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
              "client_id": "your-client-id",
              "auth_uri": "https://accounts.google.com/o/oauth2/auth",
              "token_uri": "https://oauth2.googleapis.com/token",
              "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
              "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"
            }
            '''
            
            FOLDER_ID = "your-google-drive-folder-id"
            ```
            """)
            return False
            
    except Exception as e:
        st.error(f"❌ Error checking secrets: {e}")
        return False
    
    # Step 3: Validate credentials format
    st.header("Step 3: Credentials Validation")
    try:
        credentials_data = st.secrets['GOOGLE_DRIVE']['CREDENTIALS']
        
        # Parse credentials
        if isinstance(credentials_data, str):
            credentials_dict = json.loads(credentials_data)
        else:
            credentials_dict = credentials_data
        
        # Check required fields
        required_fields = [
            'type', 'project_id', 'private_key_id', 'private_key',
            'client_email', 'client_id', 'auth_uri', 'token_uri',
            'auth_provider_x509_cert_url', 'client_x509_cert_url'
        ]
        
        missing_fields = []
        for field in required_fields:
            if field in credentials_dict:
                st.success(f"✅ {field} found")
            else:
                st.error(f"❌ {field} missing")
                missing_fields.append(field)
        
        if missing_fields:
            st.error(f"Missing required credential fields: {missing_fields}")
            return False
        
        st.success("✅ Credentials format is valid")
        
    except json.JSONDecodeError as e:
        st.error(f"❌ Invalid JSON in credentials: {e}")
        return False
    except Exception as e:
        st.error(f"❌ Error validating credentials: {e}")
        return False
    
    # Step 4: Test Google Drive API connection
    st.header("Step 4: Google Drive API Connection Test")
    try:
        # Create credentials object
        credentials = Credentials.from_service_account_info(credentials_dict)
        st.success("✅ Credentials object created successfully")
        
        # Build the Drive service
        drive_service = build('drive', 'v3', credentials=credentials)
        st.success("✅ Google Drive service built successfully")
        
        # Test API call
        about = drive_service.about().get(fields="user").execute()
        st.success("✅ Google Drive API connection successful")
        st.write(f"Connected as: {about.get('user', {}).get('emailAddress', 'Unknown')}")
        
    except Exception as e:
        st.error(f"❌ Google Drive API connection failed: {e}")
        st.info("""
        Common issues:
        1. Service account doesn't have proper permissions
        2. Google Drive API not enabled in Google Cloud Console
        3. Invalid credentials
        4. Network connectivity issues
        """)
        return False
    
    # Step 5: Test folder access
    st.header("Step 5: Folder Access Test")
    try:
        folder_id = st.secrets['GOOGLE_DRIVE']['FOLDER_ID']
        
        # Test folder access
        folder = drive_service.files().get(fileId=folder_id, fields="id,name,permissions").execute()
        st.success(f"✅ Folder access successful: {folder.get('name', 'Unknown')}")
        
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
            st.info(f"Service account email: {service_account_email}")
            st.info("Make sure the service account has 'Editor' permission on the folder")
        
    except Exception as e:
        st.error(f"❌ Folder access failed: {e}")
        st.info("""
        Common folder issues:
        1. Folder ID is incorrect
        2. Service account doesn't have access to the folder
        3. Folder doesn't exist
        """)
        return False
    
    # Step 6: Test file operations
    st.header("Step 6: File Operations Test")
    try:
        # Test creating a small test file
        test_file_metadata = {
            'name': 'test_connection.txt',
            'parents': [folder_id]
        }
        
        test_content = "This is a test file to verify Google Drive connection."
        media = MediaIoBaseUpload(
            io.BytesIO(test_content.encode()),
            mimetype='text/plain',
            resumable=True
        )
        
        test_file = drive_service.files().create(
            body=test_file_metadata,
            media_body=media,
            fields='id,name'
        ).execute()
        
        st.success(f"✅ Test file created: {test_file.get('name')}")
        
        # Clean up test file
        drive_service.files().delete(fileId=test_file.get('id')).execute()
        st.success("✅ Test file cleaned up")
        
    except Exception as e:
        st.error(f"❌ File operations failed: {e}")
        return False
    
    # All tests passed
    st.header("🎉 Diagnostic Complete")
    st.success("✅ All Google Drive connection tests passed!")
    st.info("""
    Your Google Drive setup appears to be working correctly.
    If you're still having issues with the database connection,
    the problem might be in the database initialization code.
    """)
    
    return True

if __name__ == "__main__":
    run_diagnostic() 