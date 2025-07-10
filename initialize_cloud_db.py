import streamlit as st
import sqlite3
import tempfile
import os
from cloud_storage_sqlite import CloudSQLiteManager
import hashlib

def initialize_cloud_database():
    """Initialize Google Drive database with migrated users"""
    print("🚀 Initializing Google Drive database with migrated users...")
    
    try:
        # Check Google Drive connection
        if 'GOOGLE_DRIVE' not in st.secrets:
            print("❌ Google Drive credentials not found")
            return
        
        # Create storage manager
        storage_manager = CloudSQLiteManager("school_portal.db")
        
        if not storage_manager.drive_service or not storage_manager.file_id:
            print("❌ Google Drive not properly initialized")
            return
        
        print("✅ Google Drive connection established")
        
        # Get users from local database
        print("\n📊 Reading users from local database...")
        local_conn = sqlite3.connect('school_portal.db')
        local_cursor = local_conn.cursor()
        local_cursor.execute("SELECT name, email, password_hash, created_at FROM users")
        users = local_cursor.fetchall()
        local_conn.close()
        
        print(f"   Found {len(users)} users to migrate")
        
        # Create a new database with migrated users
        print("\n🗄️ Creating new database with migrated users...")
        
        # Create temporary database file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
            temp_db_path = tmp_file.name
        
        # Create database connection
        conn = sqlite3.connect(temp_db_path)
        cursor = conn.cursor()
        
        # Create tables
        print("   Creating tables...")
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT,
                phone TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Child profiles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS child_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                child_name TEXT NOT NULL,
                date_of_birth DATE,
                gender TEXT,
                nationality TEXT,
                address TEXT,
                parent_name TEXT,
                parent_phone TEXT,
                parent_email TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Applications table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                child_id INTEGER,
                school_name TEXT NOT NULL,
                school_type TEXT NOT NULL,
                application_date DATE NOT NULL,
                status TEXT DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (child_id) REFERENCES child_profiles (id)
            )
        ''')
        
        # Application tracking table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS application_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                school_no TEXT NOT NULL,
                school_name TEXT NOT NULL,
                status TEXT DEFAULT 'tracking',
                notes TEXT,
                date_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Notifications table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Portfolio items table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS portfolio_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                child_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT,
                item_date DATE,
                attachment_path TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (child_id) REFERENCES child_profiles (id)
            )
        ''')
        
        # Personal statements table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS personal_statements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                child_id INTEGER,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                target_school TEXT,
                version TEXT DEFAULT '1.0',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (child_id) REFERENCES child_profiles (id)
            )
        ''')
        
        # Insert migrated users
        print("   Inserting migrated users...")
        for user in users:
            name = user[0]
            email = user[1]
            password_hash = user[2]
            created_at = user[3]
            
            # Fallback: if name is empty/null, use email prefix
            if not name or name.strip() == "":
                username = email.split('@')[0]
                full_name = username
            else:
                username = name
                full_name = name
            
            cursor.execute('''
                INSERT INTO users (username, email, password_hash, full_name, created_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (username, email, password_hash, full_name, created_at))
            
            print(f"      ✅ Migrated: {email} (Username: {username})")
        
        conn.commit()
        conn.close()
        
        # Check file size before upload
        file_size = os.path.getsize(temp_db_path)
        print(f"   Database file size: {file_size} bytes")
        
        # Set the temporary file path in storage manager
        storage_manager.temp_db_path = temp_db_path
        
        # Upload to Google Drive
        print("\n📤 Uploading database to Google Drive...")
        try:
            success = storage_manager.upload_database()
            
            if success:
                print("✅ Database uploaded successfully to Google Drive!")
                
                # Verify upload
                print("\n🔍 Verifying upload...")
                db_path = storage_manager.download_database()
                
                if db_path and os.path.exists(db_path):
                    file_size = os.path.getsize(db_path)
                    print(f"   Downloaded file size: {file_size} bytes")
                    
                    if file_size > 0:
                        # Check users in downloaded file
                        conn = sqlite3.connect(db_path)
                        cursor = conn.cursor()
                        cursor.execute("SELECT COUNT(*) FROM users")
                        user_count = cursor.fetchone()[0]
                        print(f"   Users in downloaded database: {user_count}")
                        
                        if user_count > 0:
                            cursor.execute("SELECT id, email, username FROM users ORDER BY id")
                            users = cursor.fetchall()
                            for user in users:
                                print(f"      ID: {user[0]}, Email: {user[1]}, Username: {user[2]}")
                        
                        conn.close()
                        print("✅ Database verification successful!")
                    else:
                        print("❌ Downloaded database is empty")
                else:
                    print("❌ Failed to download database for verification")
            else:
                print("❌ Failed to upload database to Google Drive")
                
        except Exception as e:
            print(f"❌ Upload error: {e}")
            import traceback
            traceback.print_exc()
        
        # Clean up temporary file
        if os.path.exists(temp_db_path):
            os.unlink(temp_db_path)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    initialize_cloud_database() 