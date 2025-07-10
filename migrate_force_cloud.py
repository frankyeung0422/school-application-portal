import sqlite3
from database_cloud import CloudDatabaseManager

def force_migrate_to_cloud():
    """Force migration: clear cloud DB and migrate all users from local"""
    print("🔄 Force migrating users from local DB to Google Drive DB...")
    
    # Connect to local DB
    local_conn = sqlite3.connect('school_portal.db')
    local_cursor = local_conn.cursor()

    # Connect to Google Drive DB
    cloud_db = CloudDatabaseManager(storage_type="google_drive")
    cloud_conn = cloud_db.conn
    cloud_cursor = cloud_conn.cursor()

    # Clear existing users from cloud DB
    print("🗑️ Clearing existing users from Google Drive DB...")
    cloud_cursor.execute("DELETE FROM users")
    cloud_conn.commit()
    print("✅ Cleared existing users")

    # Fetch all users from local DB
    local_cursor.execute("SELECT name, email, password_hash, created_at FROM users")
    users = local_cursor.fetchall()
    print(f"📊 Found {len(users)} users in local DB to migrate.")

    migrated = 0
    for user in users:
        # user fields: name, email, password_hash, created_at
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
        
        # Insert user into cloud DB
        cloud_cursor.execute('''
            INSERT INTO users (username, email, password_hash, full_name, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, email, password_hash, full_name, created_at))
        migrated += 1
        print(f"   ✅ Migrated user: {email} (Username: {username})")
    
    cloud_conn.commit()
    print(f"✅ Migration complete. {migrated} users migrated.")
    
    # Verify migration
    print("\n🔍 Verifying migration...")
    cloud_cursor.execute("SELECT id, email, username, full_name FROM users ORDER BY id")
    cloud_users = cloud_cursor.fetchall()
    print(f"📊 Users in Google Drive DB after migration: {len(cloud_users)}")
    for user in cloud_users:
        print(f"   ID: {user[0]}, Email: {user[1]}, Username: {user[2]}, Full Name: {user[3]}")
    
    local_conn.close()
    cloud_db.close_connection()
    
    print("\n🎉 Force migration completed successfully!")

if __name__ == "__main__":
    force_migrate_to_cloud() 