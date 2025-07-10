import sqlite3

def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table});")
    return any(col[1] == column for col in cursor.fetchall())

def migrate_child_profiles():
    conn = sqlite3.connect('school_portal.db')
    cursor = conn.cursor()
    
    print("Checking child_profiles table schema...")
    
    # Check if child_name column exists
    if not column_exists(cursor, 'child_profiles', 'child_name'):
        print('Adding child_name column...')
        cursor.execute('ALTER TABLE child_profiles ADD COLUMN child_name TEXT;')
        
        # Copy data from name to child_name
        print('Copying data from name to child_name...')
        cursor.execute('UPDATE child_profiles SET child_name = name WHERE child_name IS NULL;')
        
        conn.commit()
        print('Child profiles migration complete.')
    else:
        print('child_name column already exists.')
    
    conn.close()

if __name__ == "__main__":
    migrate_child_profiles() 