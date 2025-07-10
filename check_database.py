import sqlite3
import hashlib

def check_database():
    """Check the database contents"""
    try:
        conn = sqlite3.connect('school_portal.db')
        cursor = conn.cursor()
        
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
        if cursor.fetchone():
            print("✅ Users table exists")
            
            # Check table structure
            cursor.execute("PRAGMA table_info(users);")
            columns = cursor.fetchall()
            print("📋 Users table structure:")
            for col in columns:
                print(f"   {col[1]} ({col[2]})")
            
            # Check users with correct column names
            try:
                cursor.execute("SELECT * FROM users;")
                users = cursor.fetchall()
                print(f"📊 Found {len(users)} users in database:")
                for user in users:
                    print(f"   User data: {user}")
            except Exception as e:
                print(f"❌ Error reading users: {e}")
        else:
            print("❌ Users table does not exist")
        
        # Check child_profiles table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='child_profiles';")
        if cursor.fetchone():
            print("✅ Child profiles table exists")
            cursor.execute("PRAGMA table_info(child_profiles);")
            columns = cursor.fetchall()
            print("📋 Child profiles table structure:")
            for col in columns:
                print(f"   {col[1]} ({col[2]})")
            
            # Check child profiles data
            try:
                cursor.execute("SELECT * FROM child_profiles;")
                children = cursor.fetchall()
                print(f"📊 Found {len(children)} child profiles:")
                for child in children:
                    print(f"   Child data: {child}")
            except Exception as e:
                print(f"❌ Error reading child profiles: {e}")
        else:
            print("❌ Child profiles table does not exist")
        
        # List all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"\n📋 All tables in database:")
        for table in tables:
            print(f"   {table[0]}")
            
        conn.close()
        
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    check_database() 