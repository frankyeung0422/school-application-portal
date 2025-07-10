import sqlite3

def fix_users_schema():
    """Fix the users table schema to handle the name/full_name column properly"""
    conn = sqlite3.connect('school_portal.db')
    cursor = conn.cursor()
    
    print("🔧 Fixing users table schema...")
    
    # First, let's see the current constraints
    cursor.execute("PRAGMA table_info(users);")
    columns = cursor.fetchall()
    print("Current table structure:")
    for col in columns:
        print(f"   {col[1]} ({col[2]}) - NOT NULL: {col[3]}")
    
    # The issue is that the 'name' column has a NOT NULL constraint
    # We need to either:
    # 1. Make it nullable, or
    # 2. Ensure we always insert into both name and full_name
    
    # Let's try to make the name column nullable
    try:
        # SQLite doesn't support ALTER COLUMN to change constraints directly
        # So we need to recreate the table
        print("Recreating users table with proper schema...")
        
        # Create a temporary table with the correct schema
        cursor.execute('''
            CREATE TABLE users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                username TEXT,
                full_name TEXT
            )
        ''')
        
        # Copy data from old table to new table
        cursor.execute('''
            INSERT INTO users_new (id, name, email, phone, password_hash, created_at, is_active, last_login, username, full_name)
            SELECT id, name, email, phone, password_hash, created_at, is_active, last_login, username, full_name
            FROM users
        ''')
        
        # Drop old table and rename new table
        cursor.execute('DROP TABLE users')
        cursor.execute('ALTER TABLE users_new RENAME TO users')
        
        conn.commit()
        print("✅ Users table schema fixed successfully!")
        
    except Exception as e:
        print(f"❌ Error fixing schema: {e}")
        conn.rollback()
    
    conn.close()

if __name__ == "__main__":
    fix_users_schema() 