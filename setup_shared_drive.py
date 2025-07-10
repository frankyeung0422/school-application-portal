#!/usr/bin/env python3
"""
Setup Google Shared Drive for Database Storage
This script helps you create a Shared Drive and configure it for database storage.
"""

import streamlit as st
import json
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

def setup_shared_drive():
    """Setup Shared Drive for database storage"""
    st.title("🔧 Google Shared Drive Setup")
    st.markdown("""
    ## Why Shared Drives?
    
    Service Accounts don't have storage quota in regular Google Drive. 
    We need to use **Shared Drives** (formerly Team Drives) for storage.
    
    ### Steps:
    1. Create a Shared Drive
    2. Add your service account as a member
    3. Update your Streamlit secrets with the Shared Drive ID
    """)
    
    # Check if credentials are available
    if 'GOOGLE_DRIVE' not in st.secrets:
        st.error("❌ Google Drive credentials not found in Streamlit secrets!")
        st.info("Please add your Google Drive credentials to `.streamlit/secrets.toml` first.")
        return
    
    try:
        # Get credentials
        credentials_data = st.secrets['GOOGLE_DRIVE']['CREDENTIALS']
        
        # Parse credentials
        if isinstance(credentials_data, str):
            credentials_dict = json.loads(credentials_data)
        else:
            credentials_dict = credentials_data
        
        # Fix private key formatting
        if 'private_key' in credentials_dict:
            credentials_dict['private_key'] = credentials_dict['private_key'].replace('\\n', '\n')
        
        # Create credentials object
        credentials = Credentials.from_service_account_info(credentials_dict)
        
        # Build the Drive service
        drive_service = build('drive', 'v3', credentials=credentials)
        
        st.success("✅ Google Drive API connected successfully!")
        
        # Get service account email
        service_account_email = credentials_dict.get('client_email', 'Unknown')
        st.info(f"Service Account: {service_account_email}")
        
        # Step 1: Create Shared Drive
        st.header("Step 1: Create Shared Drive")
        
        shared_drive_name = st.text_input(
            "Shared Drive Name",
            value="School Portal Database",
            help="Name for your Shared Drive"
        )
        
        if st.button("🚀 Create Shared Drive"):
            if shared_drive_name:
                try:
                    # Create Shared Drive
                    shared_drive_metadata = {
                        'name': shared_drive_name,
                        'restrictions': {
                            'adminManagedRestrictions': True
                        }
                    }
                    
                    shared_drive = drive_service.drives().create(
                        body=shared_drive_metadata,
                        requestId='school-portal-db-' + str(hash(shared_drive_name))
                    ).execute()
                    
                    shared_drive_id = shared_drive['id']
                    
                    st.success(f"✅ Shared Drive created successfully!")
                    st.info(f"**Shared Drive ID:** `{shared_drive_id}`")
                    st.info(f"**Name:** {shared_drive['name']}")
                    
                    # Store in session state
                    st.session_state.shared_drive_id = shared_drive_id
                    st.session_state.shared_drive_name = shared_drive['name']
                    
                except HttpError as e:
                    if e.resp.status == 409:
                        st.error("❌ Shared Drive with this name already exists or request ID conflict.")
                        st.info("Try a different name or wait a few minutes.")
                    else:
                        st.error(f"❌ Error creating Shared Drive: {e}")
                except Exception as e:
                    st.error(f"❌ Unexpected error: {e}")
            else:
                st.warning("Please enter a Shared Drive name.")
        
        # Step 2: Add Service Account as Member
        if 'shared_drive_id' in st.session_state:
            st.header("Step 2: Add Service Account as Member")
            
            st.info(f"Adding service account to Shared Drive: {st.session_state.shared_drive_name}")
            
            if st.button("👤 Add Service Account as Member"):
                try:
                    # Add service account as member
                    member_metadata = {
                        'role': 'writer',
                        'type': 'user',
                        'emailAddress': service_account_email
                    }
                    
                    drive_service.permissions().create(
                        fileId=st.session_state.shared_drive_id,
                        body=member_metadata,
                        supportsAllDrives=True,
                        fields='id'
                    ).execute()
                    
                    st.success("✅ Service account added as member successfully!")
                    st.session_state.member_added = True
                    
                except HttpError as e:
                    if e.resp.status == 409:
                        st.warning("⚠️ Service account is already a member of this Shared Drive.")
                        st.session_state.member_added = True
                    else:
                        st.error(f"❌ Error adding service account: {e}")
                except Exception as e:
                    st.error(f"❌ Unexpected error: {e}")
        
        # Step 3: Update Streamlit Secrets
        if 'shared_drive_id' in st.session_state and st.session_state.get('member_added', False):
            st.header("Step 3: Update Streamlit Secrets")
            
            st.info("""
            Now you need to update your `.streamlit/secrets.toml` file with the Shared Drive ID.
            
            Replace the `FOLDER_ID` with the Shared Drive ID below:
            """)
            
            st.code(f"""
[GOOGLE_DRIVE]
CREDENTIALS = '''
{json.dumps(credentials_dict, indent=2)}
'''

# REPLACE WITH YOUR SHARED DRIVE ID
FOLDER_ID = "{st.session_state.shared_drive_id}"
""", language="toml")
            
            st.success("""
            ✅ Setup Complete!
            
            **Next Steps:**
            1. Copy the code above
            2. Replace your `.streamlit/secrets.toml` file content
            3. Restart your Streamlit app
            4. The database will now be stored in the Shared Drive!
            """)
        
        # Show existing Shared Drives
        st.header("📁 Your Existing Shared Drives")
        
        try:
            drives = drive_service.drives().list().execute()
            
            if drives.get('drives'):
                for drive in drives['drives']:
                    with st.expander(f"📁 {drive['name']} (ID: {drive['id']})"):
                        st.write(f"**ID:** `{drive['id']}`")
                        st.write(f"**Name:** {drive['name']}")
                        st.write(f"**Created:** {drive.get('createdTime', 'Unknown')}")
                        
                        if st.button(f"Use {drive['name']}", key=f"use_{drive['id']}"):
                            st.session_state.shared_drive_id = drive['id']
                            st.session_state.shared_drive_name = drive['name']
                            st.success(f"✅ Selected Shared Drive: {drive['name']}")
                            st.rerun()
            else:
                st.info("No Shared Drives found. Create one above.")
                
        except Exception as e:
            st.error(f"Error listing Shared Drives: {e}")
    
    except Exception as e:
        st.error(f"❌ Error connecting to Google Drive: {e}")
        st.info("Please check your credentials in Streamlit secrets.")

if __name__ == "__main__":
    setup_shared_drive() 