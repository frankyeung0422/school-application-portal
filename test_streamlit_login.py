import streamlit as st
import sys
import os

# Add current directory to path
sys.path.append('.')

def test_streamlit_login():
    """Test the exact login logic used by the Streamlit app"""
    print("🧪 Testing Streamlit app login logic...")
    
    # Import the functions used by Streamlit app
    from streamlit_app import get_db, login_user
    
    # Test credentials
    test_email = "frankyeung422@hotmail.com"
    test_password = "password123"
    
    print(f"🔐 Testing login with:")
    print(f"   Email: {test_email}")
    print(f"   Password: {test_password}")
    
    try:
        # Get the database instance that Streamlit app uses
        print("\n📊 Getting database instance...")
        db_instance = get_db()
        
        if db_instance is None:
            print("❌ Database instance is None!")
            return
        
        print(f"✅ Database instance: {type(db_instance)}")
        print(f"   Database path: {getattr(db_instance, 'db_path', 'Unknown')}")
        
        # Test direct database login
        print("\n🔍 Testing direct database login...")
        success, message, user_data = db_instance.login_user(test_email, test_password)
        
        print(f"   Success: {success}")
        print(f"   Message: {message}")
        print(f"   User data: {user_data}")
        
        if success:
            print("✅ Direct database login successful!")
        else:
            print("❌ Direct database login failed!")
            
            # Let's check what's in the database that the app is using
            print("\n🔍 Checking database contents...")
            try:
                if hasattr(db_instance, 'conn') and db_instance.conn:
                    cursor = db_instance.conn.cursor()
                    cursor.execute("SELECT id, email, password_hash FROM users WHERE email = ?", (test_email,))
                    user = cursor.fetchone()
                    
                    if user:
                        print(f"   ✅ User found in app database:")
                        print(f"      ID: {user[0]}")
                        print(f"      Email: {user[1]}")
                        print(f"      Hash: {user[2][:20]}...")
                    else:
                        print(f"   ❌ User not found in app database")
                        
                    # Show all users in app database
                    cursor.execute("SELECT id, email FROM users")
                    all_users = cursor.fetchall()
                    print(f"   📊 All users in app database ({len(all_users)} total):")
                    for u in all_users:
                        print(f"      ID: {u[0]}, Email: {u[1]}")
                        
            except Exception as e:
                print(f"   ❌ Error checking app database: {e}")
        
        # Test the Streamlit login function
        print("\n🔍 Testing Streamlit login function...")
        success, message = login_user(test_email, test_password)
        
        print(f"   Success: {success}")
        print(f"   Message: {message}")
        
        if success:
            print("✅ Streamlit login function successful!")
        else:
            print("❌ Streamlit login function failed!")
            
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_streamlit_login() 