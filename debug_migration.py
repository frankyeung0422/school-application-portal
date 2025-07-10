import sqlite3
from database_cloud import CloudDatabaseManager

def debug_migration():
    """Debug what happened with the migration"""
    print("🔍 Debugging migration results...")
    
    # Check local database
    print("\n📊 Local Database (school_portal.db):")
    local_conn = sqlite3.connect('school_portal.db')
    local_cursor = local_conn.cursor()
    local_cursor.execute("SELECT id, email, name FROM users ORDER BY id")
    local_users = local_cursor.fetchall()
    print(f"   Total users: {len(local_users)}")
    for user in local_users:
        print(f"      ID: {user[0]}, Email: {user[1]}, Name: {user[2]}")
    local_conn.close()
    
    # Check Google Drive database
    print("\n📊 Google Drive Database:")
    try:
        cloud_db = CloudDatabaseManager(storage_type="google_drive")
        cloud_conn = cloud_db.conn
        cloud_cursor = cloud_conn.cursor()
        cloud_cursor.execute("SELECT id, email, username, full_name FROM users ORDER BY id")
        cloud_users = cloud_cursor.fetchall()
        print(f"   Total users: {len(cloud_users)}")
        for user in cloud_users:
            print(f"      ID: {user[0]}, Email: {user[1]}, Username: {user[2]}, Full Name: {user[3]}")
        cloud_db.close_connection()
    except Exception as e:
        print(f"   ❌ Error accessing Google Drive DB: {e}")
    
    # Check if the migrated users exist in cloud DB
    print("\n🔍 Checking for migrated users in cloud DB:")
    migrated_emails = ["test@example.com", "frankyeung422@hotmail.com", "test2@example.com"]
    
    try:
        cloud_db = CloudDatabaseManager(storage_type="google_drive")
        cloud_conn = cloud_db.conn
        cloud_cursor = cloud_conn.cursor()
        
        for email in migrated_emails:
            cloud_cursor.execute("SELECT id, email, username, full_name FROM users WHERE email = ?", (email,))
            user = cloud_cursor.fetchone()
            if user:
                print(f"   ✅ {email} found: ID={user[0]}, Username={user[2]}, Full Name={user[3]}")
            else:
                print(f"   ❌ {email} NOT found in cloud DB")
        
        cloud_db.close_connection()
    except Exception as e:
        print(f"   ❌ Error checking migrated users: {e}")

if __name__ == "__main__":
    debug_migration() 