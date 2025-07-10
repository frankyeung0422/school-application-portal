from database_cloud import CloudDatabaseManager
import sqlite3

def debug_db_connection():
    """Debug Google Drive database connection"""
    print("🔍 Debugging Google Drive database connection...")
    
    try:
        # Create database instance
        print("📊 Creating CloudDatabaseManager instance...")
        cloud_db = CloudDatabaseManager(storage_type="google_drive")
        
        print(f"✅ Database instance created: {type(cloud_db)}")
        print(f"   Storage type: {cloud_db.storage_type}")
        print(f"   Database path: {cloud_db.db_path}")
        print(f"   Connection: {cloud_db.conn}")
        
        if cloud_db.conn:
            print("✅ Database connection established")
            
            # Check if tables exist
            cursor = cloud_db.conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print(f"📋 Tables in database: {[table[0] for table in tables]}")
            
            # Check users table
            if ('users',) in tables:
                cursor.execute("SELECT COUNT(*) FROM users")
                user_count = cursor.fetchone()[0]
                print(f"👥 Users in database: {user_count}")
                
                if user_count > 0:
                    cursor.execute("SELECT id, email, username, full_name FROM users ORDER BY id")
                    users = cursor.fetchall()
                    for user in users:
                        print(f"   ID: {user[0]}, Email: {user[1]}, Username: {user[2]}, Full Name: {user[3]}")
                else:
                    print("   No users found")
            else:
                print("❌ Users table does not exist")
                
            # Check database file location
            cursor.execute("PRAGMA database_list")
            db_files = cursor.fetchall()
            print(f"📁 Database files: {db_files}")
            
        else:
            print("❌ No database connection")
            
        # Close connection
        cloud_db.close_connection()
        print("✅ Connection closed")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_db_connection() 