"""
Test Google Drive Connection
Simple script to test if Google Drive integration is working
"""

import streamlit as st
import hashlib
from database_cloud import CloudDatabaseManager

st.set_page_config(
    page_title="Google Drive Test",
    page_icon="🧪",
    layout="wide"
)

st.title("🧪 Google Drive Connection Test")

# Test database initialization
st.header("1. Database Initialization Test")

try:
    db_manager = CloudDatabaseManager(storage_type="google_drive")
    
    if db_manager.conn:
        st.success("✅ Database connection successful!")
        st.info(f"Storage type: {db_manager.storage_type}")
        
        if db_manager.storage_manager:
            st.success("✅ Cloud storage manager initialized!")
            
            if hasattr(db_manager.storage_manager, 'drive_service'):
                st.success("✅ Google Drive service available!")
            else:
                st.warning("⚠️ Google Drive service not available")
        else:
            st.warning("⚠️ No cloud storage manager")
    else:
        st.error("❌ Database connection failed")
        
except Exception as e:
    st.error(f"❌ Database initialization error: {str(e)}")

# Test user creation
st.header("2. User Creation Test")

if 'db_manager' in locals() and db_manager.conn:
    test_username = "test_user_google_drive"
    test_email = "test@google-drive.com"
    test_password = "test123"
    password_hash = hashlib.sha256(test_password.encode()).hexdigest()
    
    if st.button("Create Test User"):
        try:
            success = db_manager.create_user(test_username, test_email, password_hash, "Test User", "12345678")
            if success:
                st.success("✅ Test user created successfully!")
                st.info("Check your Google Drive for the database file")
            else:
                st.error("❌ Failed to create test user")
        except Exception as e:
            st.error(f"❌ Error creating test user: {str(e)}")

# Test user verification
st.header("3. User Verification Test")

if 'db_manager' in locals() and db_manager.conn:
    if st.button("Verify Test User"):
        try:
            test_email = "test@google-drive.com"
            test_password = "test123"
            password_hash = hashlib.sha256(test_password.encode()).hexdigest()
            
            user = db_manager.verify_user(test_email, password_hash)
            if user:
                st.success("✅ User verification successful!")
                st.json(user)
            else:
                st.error("❌ User verification failed")
        except Exception as e:
            st.error(f"❌ Error verifying user: {str(e)}")

# Test cloud sync
st.header("4. Cloud Sync Test")

if 'db_manager' in locals() and db_manager.conn:
    if st.button("Test Cloud Sync"):
        try:
            db_manager.sync_to_cloud()
            st.success("✅ Cloud sync test completed!")
        except Exception as e:
            st.error(f"❌ Cloud sync error: {str(e)}")

# Display debug information
st.header("5. Debug Information")

if 'db_manager' in locals():
    st.subheader("Database Manager Info")
    st.write(f"Storage Type: {db_manager.storage_type}")
    st.write(f"Connection Available: {db_manager.conn is not None}")
    
    if db_manager.storage_manager:
        st.subheader("Storage Manager Info")
        st.write(f"Type: {type(db_manager.storage_manager).__name__}")
        
        if hasattr(db_manager.storage_manager, 'drive_service'):
            st.write(f"Google Drive Service: {db_manager.storage_manager.drive_service is not None}")
        
        if hasattr(db_manager.storage_manager, 'file_id'):
            st.write(f"File ID: {db_manager.storage_manager.file_id}")
        
        if hasattr(db_manager.storage_manager, 'folder_id'):
            st.write(f"Folder ID: {db_manager.storage_manager.folder_id}")

# Check Streamlit secrets
st.header("6. Streamlit Secrets Check")

if 'GOOGLE_DRIVE' in st.secrets:
    st.success("✅ Google Drive secrets found!")
    
    secrets = st.secrets['GOOGLE_DRIVE']
    if 'CREDENTIALS' in secrets:
        st.success("✅ Credentials found!")
        
        # Check if credentials are valid JSON
        try:
            import json
            if isinstance(secrets['CREDENTIALS'], str):
                creds = json.loads(secrets['CREDENTIALS'])
            else:
                creds = secrets['CREDENTIALS']
            
            st.write("Project ID:", creds.get('project_id', 'N/A'))
            st.write("Client Email:", creds.get('client_email', 'N/A'))
            
        except Exception as e:
            st.error(f"❌ Invalid credentials format: {str(e)}")
    else:
        st.error("❌ Credentials not found in secrets")
    
    if 'FOLDER_ID' in secrets:
        st.success(f"✅ Folder ID found: {secrets['FOLDER_ID']}")
    else:
        st.warning("⚠️ Folder ID not found in secrets")
else:
    st.error("❌ Google Drive secrets not found")

# Instructions
st.header("📋 Next Steps")

st.markdown("""
If all tests pass:

1. **Check Google Drive**: Visit your Google Drive and look for the `School Portal Database` folder
2. **Check for database file**: You should see a `school_portal.db` file
3. **Deploy to Streamlit Cloud**: Your app is ready for deployment!

If tests fail:

1. **Check Streamlit Secrets**: Make sure credentials and folder ID are correct
2. **Check Google Drive permissions**: Ensure the service account has access to the folder
3. **Check Google Cloud API**: Make sure Google Drive API is enabled
""")

st.markdown("---")
st.markdown("""
<div style='text-align: center'>
    <p>🧪 Google Drive Connection Test</p>
    <p>Run this to verify your setup before deploying</p>
</div>
""", unsafe_allow_html=True) 