import sqlite3
import hashlib

def test_existing_users():
    """Test login with existing users"""
    conn = sqlite3.connect('school_portal.db')
    cursor = conn.cursor()
    
    # Test existing users
    test_users = [
        ("test@example.com", "password123"),
        ("frankyeung422@hotmail.com", "password123")
    ]
    
    print("🧪 Testing existing user logins...")
    
    for email, password in test_users:
        print(f"\n🔐 Testing login for: {email}")
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        cursor.execute('''
            SELECT id, username, email, full_name, phone
            FROM users WHERE email = ? AND password_hash = ?
        ''', (email, password_hash))
        
        user = cursor.fetchone()
        
        if user:
            print("✅ Login successful!")
            print(f"   User ID: {user[0]}")
            print(f"   Username: {user[1]}")
            print(f"   Email: {user[2]}")
            print(f"   Full Name: {user[3]}")
            print(f"   Phone: {user[4]}")
        else:
            print("❌ Login failed")
            
            # Debug: Check what's in the database
            cursor.execute("SELECT email, password_hash FROM users WHERE email = ?", (email,))
            db_user = cursor.fetchone()
            if db_user:
                print(f"   Found user in DB: email={db_user[0]}, hash={db_user[1][:20]}...")
                print(f"   Expected hash: {password_hash[:20]}...")
            else:
                print("   User not found in database")
    
    conn.close()

if __name__ == "__main__":
    test_existing_users() 