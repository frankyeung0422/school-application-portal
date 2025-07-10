import streamlit as st
import sys
import os

# Add current directory to path
sys.path.append('.')

def test_app_supabase():
    """Test that the app is using Supabase correctly"""
    print("🧪 Testing app with Supabase database...")
    
    try:
        # Import the functions used by Streamlit app
        from streamlit_app import get_db, register_user, login_user
        
        # Get the database instance
        print("\n📊 Getting database instance...")
        db_instance = get_db()
        
        if db_instance is None:
            print("❌ Database instance is None!")
            return
        
        print(f"✅ Database instance: {type(db_instance)}")
        print(f"   Database path: {getattr(db_instance, 'db_path', 'Unknown')}")
        
        # Check if it's using Supabase
        if hasattr(db_instance, 'storage_manager') and db_instance.storage_manager:
            if hasattr(db_instance.storage_manager, 'supabase'):
                print("✅ App is using Supabase database!")
            else:
                print("⚠️ App is not using Supabase database")
        else:
            print("⚠️ No storage manager found")
        
        # Test registration
        print("\n👤 Testing user registration...")
        success, message = register_user("Test User", "test_new@example.com", "+852 9999 9999", "testpass123")
        print(f"   Registration: {success} - {message}")
        
        # Test login
        print("\n🔐 Testing user login...")
        success, message = login_user("test_new@example.com", "testpass123")
        print(f"   Login: {success} - {message}")
        
        # Test login with existing user
        print("\n🔐 Testing login with existing user...")
        success, message = login_user("frankyeung422@hotmail.com", "password123")
        print(f"   Login: {success} - {message}")
        
        # Show all users
        print("\n📊 All users in database:")
        try:
            if hasattr(db_instance, 'storage_manager') and db_instance.storage_manager:
                users = db_instance.storage_manager.get_all_users()
                print(f"   Total users: {len(users)}")
                for user in users:
                    print(f"      ID: {user['id']}, Email: {user['email']}, Username: {user['username']}")
        except Exception as e:
            print(f"   ❌ Error listing users: {e}")
            
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_app_supabase() 