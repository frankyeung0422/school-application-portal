import sqlite3
import hashlib

def debug_passwords():
    """Debug password hashes for existing users"""
    conn = sqlite3.connect('school_portal.db')
    cursor = conn.cursor()
    
    print("🔍 Debugging password hashes...")
    
    # Get all users and their password hashes
    cursor.execute("SELECT id, email, password_hash FROM users")
    users = cursor.fetchall()
    
    for user_id, email, stored_hash in users:
        print(f"\n👤 User ID: {user_id}, Email: {email}")
        print(f"   Stored hash: {stored_hash}")
        
        # Test common passwords and variations
        common_passwords = [
            "password123",
            "password",
            "123456",
            "test123",
            "admin",
            "user",
            "pass",
            "123",
            "test",
            "password1",
            "password12",
            "pass123",
            "test1",
            "test12",
            "user123",
            "admin123",
            "123123",
            "111111",
            "000000",
            "qwerty",
            "abc123",
            "password123!",
            "Password123",
            "PASSWORD123",
            "Password",
            "Test",
            "TEST",
            "User",
            "USER"
        ]
        
        found = False
        for password in common_passwords:
            # Try SHA256
            test_hash = hashlib.sha256(password.encode()).hexdigest()
            if test_hash == stored_hash:
                print(f"   ✅ Found password (SHA256): '{password}'")
                found = True
                break
            
            # Try MD5 (just in case)
            test_hash_md5 = hashlib.md5(password.encode()).hexdigest()
            if test_hash_md5 == stored_hash:
                print(f"   ✅ Found password (MD5): '{password}'")
                found = True
                break
        
        if not found:
            print(f"   ❓ Password not found in common list")
            
            # Let's also try to reverse engineer - maybe it's the email or username
            username = email.split('@')[0]
            test_hash = hashlib.sha256(username.encode()).hexdigest()
            if test_hash == stored_hash:
                print(f"   ✅ Found password (username): '{username}'")
            else:
                test_hash = hashlib.sha256(email.encode()).hexdigest()
                if test_hash == stored_hash:
                    print(f"   ✅ Found password (email): '{email}'")
    
    conn.close()

if __name__ == "__main__":
    debug_passwords() 