import streamlit as st
import sys
import os

# Add current directory to path
sys.path.append('.')

def test_supabase_login():
    """Test login functionality with Supabase database"""
    print("🧪 Testing Supabase database login functionality...")
    
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
        print("\n📊 Getting Supabase database instance...")
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
                    if hasattr(db_instance, 'storage_manager') and db_instance.storage_manager:
                        users = db_instance.storage_manager.get_all_users()
                        print(f"      Total users in Supabase: {len(users)}")
                        
                        for user in users:
                            if user['email'] == email:
                                print(f"      ✅ User found in Supabase:")
                                print(f"         ID: {user['id']}")
                                print(f"         Email: {user['email']}")
                                print(f"         Username: {user['username']}")
                                print(f"         Full Name: {user['full_name']}")
                                break
                        else:
                            print(f"      ❌ User not found in Supabase")
                            
                except Exception as e:
                    print(f"      ❌ Error checking Supabase database: {e}")
            
            # Test the Streamlit login function
            print("   Testing Streamlit login function...")
            success, message = login_user(email, password)
            
            print(f"   Success: {success}")
            print(f"   Message: {message}")
            
            if success:
                print("   ✅ Streamlit login function successful!")
            else:
                print("   ❌ Streamlit login function failed!")
        
        # Show all users in Supabase database
        print(f"\n📊 All users in Supabase database:")
        try:
            if hasattr(db_instance, 'storage_manager') and db_instance.storage_manager:
                users = db_instance.storage_manager.get_all_users()
                print(f"   Total users: {len(users)}")
                for user in users:
                    print(f"      ID: {user['id']}, Email: {user['email']}, Username: {user['username']}, Full Name: {user['full_name']}")
        except Exception as e:
            print(f"   ❌ Error listing users: {e}")
            
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_supabase_login() 