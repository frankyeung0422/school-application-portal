import sqlite3

def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table});")
    return any(col[1] == column for col in cursor.fetchall())

def migrate_users_schema():
    conn = sqlite3.connect('school_portal.db')
    cursor = conn.cursor()
    altered = False

    # Add username column if missing
    if not column_exists(cursor, 'users', 'username'):
        print('Adding username column...')
        cursor.execute('ALTER TABLE users ADD COLUMN username TEXT;')
        altered = True
    else:
        print('username column already exists.')

    # Add full_name column if missing
    if not column_exists(cursor, 'users', 'full_name'):
        print('Adding full_name column...')
        cursor.execute('ALTER TABLE users ADD COLUMN full_name TEXT;')
        altered = True
    else:
        print('full_name column already exists.')

    # Populate username and full_name from name
    print('Populating username and full_name from name...')
    cursor.execute('UPDATE users SET username = name WHERE username IS NULL OR username = "";')
    cursor.execute('UPDATE users SET full_name = name WHERE full_name IS NULL OR full_name = "";')
    conn.commit()
    print('Migration complete.')
    conn.close()

if __name__ == "__main__":
    migrate_users_schema() 