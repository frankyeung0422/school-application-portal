import streamlit as st
import sys
import os

# Add current directory to path
sys.path.append('.')

def test_cloud_login():
    """Test login functionality with Google Drive database"""
    print("🧪 Testing Google Drive database login functionality...")
    
    try:
        # Import the functions used by Streamlit app
        from streamlit_app import get_db, login_user
        
        # Test credentials for migrated users
        test_users = [
            ("test@example.com", "password123"),
            ("frankyeung422@hotmail.com", "password123"),
            ("test2@example.com", "testpass123")
        ]
        
        print(f"🔐 Testing login with {len(test_users)} migrated users...")
        
        # Get the database instance that Streamlit app uses
        print("\n📊 Getting Google Drive database instance...")
        db_instance = get_db()
        
        if db_instance is None:
            print("❌ Database instance is None!")
            return
        
        print(f"✅ Database instance: {type(db_instance)}")
        print(f"   Database path: {getattr(db_instance, 'db_path', 'Unknown')}")
        
        # Test each user
        for email, password in test_users:
            print(f"\n🔍 Testing login for: {email}")
            print(f"   Password: {password}")
            
            # Test direct database login
            print("   Testing direct database login...")
            success, message, user_data = db_instance.login_user(email, password)
            
            print(f"   Success: {success}")
            print(f"   Message: {message}")
            print(f"   User data: {user_data}")
            
            if success:
                print("   ✅ Direct database login successful!")
            else:
                print("   ❌ Direct database login failed!")
                
                # Debug: Check what's in the database
                print("   🔍 Checking database contents...")
                try:
                    if hasattr(db_instance, 'conn') and db_instance.conn:
                        cursor = db_instance.conn.cursor()
                        cursor.execute("SELECT id, email, username, full_name FROM users WHERE email = ?", (email,))
                        user = cursor.fetchone()
                        
                        if user:
                            print(f"      ✅ User found in cloud database:")
                            print(f"         ID: {user[0]}")
                            print(f"         Email: {user[1]}")
                            print(f"         Username: {user[2]}")
                            print(f"         Full Name: {user[3]}")
                        else:
                            print(f"      ❌ User not found in cloud database")
                            
                except Exception as e:
                    print(f"      ❌ Error checking cloud database: {e}")
            
            # Test the Streamlit login function
            print("   Testing Streamlit login function...")
            success, message = login_user(email, password)
            
            print(f"   Success: {success}")
            print(f"   Message: {message}")
            
            if success:
                print("   ✅ Streamlit login function successful!")
            else:
                print("   ❌ Streamlit login function failed!")
        
        # Show all users in cloud database
        print(f"\n📊 All users in Google Drive database:")
        try:
            if hasattr(db_instance, 'conn') and db_instance.conn:
                cursor = db_instance.conn.cursor()
                cursor.execute("SELECT id, email, username, full_name FROM users ORDER BY id")
                all_users = cursor.fetchall()
                print(f"   Total users: {len(all_users)}")
                for user in all_users:
                    print(f"      ID: {user[0]}, Email: {user[1]}, Username: {user[2]}, Full Name: {user[3]}")
        except Exception as e:
            print(f"   ❌ Error listing users: {e}")
            
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_cloud_login() 