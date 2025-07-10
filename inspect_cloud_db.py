from database_cloud import CloudDatabaseManager

def inspect_cloud_users_schema():
    db = CloudDatabaseManager(storage_type="google_drive")
    cursor = db.conn.cursor()
    cursor.execute("PRAGMA table_info(users);")
    columns = cursor.fetchall()
    print("Google Drive DB users table schema:")
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
    db.close_connection()

if __name__ == "__main__":
    inspect_cloud_users_schema() 