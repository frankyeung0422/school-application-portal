"""
Test Script to Force Google Drive Storage
This will show exactly what happens when trying to use Google Drive
"""

import streamlit as st
import os
from database_cloud import CloudDatabaseManager

def test_google_drive_force():
    st.title("🧪 Force Google Drive Storage Test")
    
    st.write("This test will attempt to force Google Drive storage and show detailed error messages.")
    
    # Check environment
    st.write(f"**Environment:** {'Streamlit Cloud' if os.getenv('STREAMLIT_CLOUD') else 'Local'}")
    
    # Check secrets
    try:
        if 'GOOGLE_DRIVE' in st.secrets:
            st.success("✅ Google Drive secrets found")
            secrets = st.secrets['GOOGLE_DRIVE']
            st.write(f"Available keys: {list(secrets.keys())}")
        else:
            st.error("❌ Google Drive secrets not found")
            st.info("Please add Google Drive credentials to your secrets file")
            return
    except Exception as e:
        st.error(f"❌ Error checking secrets: {e}")
        return
    
    # Force Google Drive storage
    if st.button("🔧 Force Google Drive Storage"):
        st.write("Attempting to initialize Google Drive storage...")
        
        try:
            # Force Google Drive storage type
            db_manager = CloudDatabaseManager(storage_type="google_drive")
            
            if db_manager.conn:
                st.success("✅ Google Drive database connection successful!")
                st.write(f"Storage type: {db_manager.storage_type}")
                
                if db_manager.storage_manager:
                    st.success("✅ Cloud storage manager initialized!")
                    st.write(f"Storage manager type: {type(db_manager.storage_manager).__name__}")
                    
                    if hasattr(db_manager.storage_manager, 'drive_service'):
                        st.success("✅ Google Drive service available!")
                    else:
                        st.warning("⚠️ Google Drive service not available")
                else:
                    st.warning("⚠️ No cloud storage manager")
            else:
                st.error("❌ Database connection failed")
                
        except Exception as e:
            st.error(f"❌ Google Drive initialization failed: {str(e)}")
            st.write(f"Error type: {type(e).__name__}")
            st.write("This is the exact error that's causing the fallback to simple_cloud")

def main():
    test_google_drive_force()

if __name__ == "__main__":
    main() 