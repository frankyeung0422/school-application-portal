import sqlite3
import hashlib

def test_user_registration_and_login():
    """Test user registration and login functionality"""
    conn = sqlite3.connect('school_portal.db')
    cursor = conn.cursor()
    
    # Test user data
    test_name = "Test User 2"
    test_email = "test2@example.com"
    test_phone = "+852 5555 5555"
    test_password = "testpass123"
    
    print("🧪 Testing user registration and login...")
    
    # Step 1: Check if user already exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (test_email,))
    existing_user = cursor.fetchone()
    
    if existing_user:
        print(f"⚠️ User {test_email} already exists, skipping registration")
    else:
        # Step 2: Register new user
        print(f"📝 Registering new user: {test_email}")
        password_hash = hashlib.sha256(test_password.encode()).hexdigest()
        username = test_email.split('@')[0]
        
        try:
            cursor.execute('''
                INSERT INTO users (username, email, password_hash, full_name, phone)
                VALUES (?, ?, ?, ?, ?)
            ''', (username, test_email, password_hash, test_name, test_phone))
            conn.commit()
            print("✅ User registration successful")
        except Exception as e:
            print(f"❌ Registration failed: {e}")
            return
    
    # Step 3: Test login
    print(f"🔐 Testing login for: {test_email}")
    password_hash = hashlib.sha256(test_password.encode()).hexdigest()
    
    cursor.execute('''
        SELECT id, username, email, full_name, phone
        FROM users WHERE email = ? AND password_hash = ?
    ''', (test_email, password_hash))
    
    user = cursor.fetchone()
    
    if user:
        print("✅ Login successful!")
        print(f"   User ID: {user[0]}")
        print(f"   Username: {user[1]}")
        print(f"   Email: {user[2]}")
        print(f"   Full Name: {user[3]}")
        print(f"   Phone: {user[4]}")
    else:
        print("❌ Login failed - user not found or password incorrect")
        
        # Debug: Check what's in the database
        cursor.execute("SELECT email, password_hash FROM users WHERE email = ?", (test_email,))
        db_user = cursor.fetchone()
        if db_user:
            print(f"   Found user in DB: email={db_user[0]}, hash={db_user[1][:20]}...")
            print(f"   Expected hash: {password_hash[:20]}...")
        else:
            print("   User not found in database")
    
    conn.close()

if __name__ == "__main__":
    test_user_registration_and_login() 