import sqlite3
import hashlib
import os

def diagnose_user_login():
    """Comprehensive diagnosis of user login issues"""
    print("🔍 Diagnosing user login issues...")
    
    # Check if database file exists
    db_path = "school_portal.db"
    if not os.path.exists(db_path):
        print(f"❌ Database file not found: {db_path}")
        return
    
    print(f"✅ Database file found: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
        if not cursor.fetchone():
            print("❌ Users table does not exist!")
            return
        
        print("✅ Users table exists")
        
        # Check table structure
        cursor.execute("PRAGMA table_info(users);")
        columns = cursor.fetchall()
        print("\n📋 Users table structure:")
        for col in columns:
            print(f"   {col[1]} ({col[2]}) - NOT NULL: {col[3]}")
        
        # Check for specific user
        target_email = "frankyeung422@hotmail.com"
        print(f"\n🔍 Looking for user: {target_email}")
        
        cursor.execute("SELECT * FROM users WHERE email = ?", (target_email,))
        user = cursor.fetchone()
        
        if user:
            print("✅ User found in database!")
            print(f"   User ID: {user[0]}")
            print(f"   Name: {user[1]}")
            print(f"   Email: {user[2]}")
            print(f"   Phone: {user[3]}")
            print(f"   Password Hash: {user[4][:20]}...")
            print(f"   Created: {user[5]}")
            print(f"   Active: {user[6]}")
            print(f"   Last Login: {user[7]}")
            print(f"   Username: {user[8]}")
            print(f"   Full Name: {user[9]}")
            
            # Test different password combinations
            print(f"\n🧪 Testing password combinations...")
            
            test_passwords = [
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
                "USER",
                "frankyeung422",
                "frankyeung",
                "frank",
                "yeung",
                "422",
                "hotmail",
                "hotmail422"
            ]
            
            stored_hash = user[4]
            found_password = None
            
            for password in test_passwords:
                test_hash = hashlib.sha256(password.encode()).hexdigest()
                if test_hash == stored_hash:
                    found_password = password
                    print(f"   ✅ Found password: '{password}'")
                    break
            
            if not found_password:
                print(f"   ❌ Password not found in test list")
                print(f"   💡 You may need to reset the password")
                
                # Try to reset password
                print(f"\n🔄 Attempting to reset password to 'password123'...")
                new_password = "password123"
                new_hash = hashlib.sha256(new_password.encode()).hexdigest()
                
                cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (new_hash, target_email))
                conn.commit()
                
                # Verify the update
                cursor.execute("SELECT password_hash FROM users WHERE email = ?", (target_email,))
                updated_hash = cursor.fetchone()[0]
                
                if updated_hash == new_hash:
                    print(f"   ✅ Password reset successful!")
                    print(f"   🔑 New password: '{new_password}'")
                else:
                    print(f"   ❌ Password reset failed")
        else:
            print(f"❌ User '{target_email}' not found in database")
            
            # Show all users in database
            cursor.execute("SELECT id, email, name FROM users")
            all_users = cursor.fetchall()
            print(f"\n📊 All users in database ({len(all_users)} total):")
            for u in all_users:
                print(f"   ID: {u[0]}, Email: {u[1]}, Name: {u[2]}")
        
        # Test the login function from the database manager
        print(f"\n🧪 Testing database manager login function...")
        try:
            # Import the database manager
            import sys
            sys.path.append('.')
            from database_cloud import CloudDatabaseManager
            
            db_manager = CloudDatabaseManager(storage_type="local")
            
            # Test with the found password or default
            test_password = found_password if found_password else "password123"
            print(f"   Testing login with password: '{test_password}'")
            
            success, message, user_data = db_manager.login_user(target_email, test_password)
            
            if success:
                print(f"   ✅ Database manager login successful!")
                print(f"   User data: {user_data}")
            else:
                print(f"   ❌ Database manager login failed: {message}")
                
        except Exception as e:
            print(f"   ❌ Error testing database manager: {e}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    diagnose_user_login() 