import streamlit as st
from cloud_storage_sqlite import CloudSQLiteManager
import tempfile
import os

def test_google_drive_connection():
    """Test Google Drive connection and storage manager"""
    print("🔍 Testing Google Drive connection...")
    
    try:
        # Check if Google Drive credentials are available
        if 'GOOGLE_DRIVE' not in st.secrets:
            print("❌ Google Drive credentials not found in Streamlit secrets")
            return
        
        print("✅ Google Drive credentials found in secrets")
        
        # Create storage manager
        print("📊 Creating CloudSQLiteManager...")
        storage_manager = CloudSQLiteManager("school_portal.db")
        
        print(f"   Drive service: {storage_manager.drive_service}")
        print(f"   File ID: {storage_manager.file_id}")
        print(f"   Folder ID: {storage_manager.folder_id}")
        
        if not storage_manager.drive_service:
            print("❌ Google Drive service not initialized")
            return
        
        if not storage_manager.file_id:
            print("❌ No database file ID found")
            return
        
        print("✅ Google Drive connection established")
        
        # Test download
        print("\n📥 Testing database download...")
        db_path = storage_manager.download_database()
        print(f"   Downloaded to: {db_path}")
        
        if db_path and os.path.exists(db_path):
            print("✅ Database download successful")
            
            # Check file size
            file_size = os.path.getsize(db_path)
            print(f"   File size: {file_size} bytes")
            
            if file_size > 0:
                print("✅ Database file has content")
            else:
                print("⚠️ Database file is empty")
        else:
            print("❌ Database download failed")
        
        # Test database connection
        print("\n🔗 Testing database connection...")
        conn = storage_manager.get_database_connection()
        
        if conn:
            print("✅ Database connection successful")
            
            # Check tables
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print(f"   Tables: {[table[0] for table in tables]}")
            
            # Check users
            if ('users',) in tables:
                cursor.execute("SELECT COUNT(*) FROM users")
                user_count = cursor.fetchone()[0]
                print(f"   Users: {user_count}")
                
                if user_count > 0:
                    cursor.execute("SELECT id, email, username FROM users LIMIT 3")
                    users = cursor.fetchall()
                    for user in users:
                        print(f"      ID: {user[0]}, Email: {user[1]}, Username: {user[2]}")
            
            conn.close()
        else:
            print("❌ Database connection failed")
        
        # Test upload
        print("\n📤 Testing database upload...")
        success = storage_manager.upload_database()
        print(f"   Upload success: {success}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_google_drive_connection() 