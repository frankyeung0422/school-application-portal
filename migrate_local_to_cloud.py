import sqlite3
import sys

# Import the cloud DB manager
from database_cloud import CloudDatabaseManager

def migrate_users():
    print("🔄 Migrating users from local DB to Google Drive DB...")
    # Connect to local DB
    local_conn = sqlite3.connect('school_portal.db')
    local_cursor = local_conn.cursor()

    # Connect to Google Drive DB
    cloud_db = CloudDatabaseManager(storage_type="google_drive")
    cloud_conn = cloud_db.conn
    cloud_cursor = cloud_conn.cursor()

    # Fetch all users from local DB
    local_cursor.execute("SELECT name, email, password_hash, created_at FROM users")
    users = local_cursor.fetchall()
    print(f"Found {len(users)} users in local DB.")

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
        # Check if user already exists in cloud DB
        cloud_cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cloud_cursor.fetchone():
            print(f"   Skipping existing user: {email}")
            continue
        # Insert user into cloud DB
        cloud_cursor.execute('''
            INSERT INTO users (username, email, password_hash, full_name, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, email, password_hash, full_name, created_at))
        migrated += 1
        print(f"   Migrated user: {email}")
    cloud_conn.commit()
    print(f"✅ Migration complete. {migrated} users migrated.")
    local_conn.close()
    cloud_db.close_connection()

if __name__ == "__main__":
    migrate_users() 