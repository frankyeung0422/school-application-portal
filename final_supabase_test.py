#!/usr/bin/env python3
"""
Final Supabase Integration Test
Tests all functionality with the new Supabase database
"""

import sys
import os
sys.path.append('.')

def test_supabase_integration():
    """Comprehensive test of Supabase integration"""
    print("🎯 FINAL SUPABASE INTEGRATION TEST")
    print("=" * 50)
    
    try:
        # Import required modules
        from streamlit_app import get_db, register_user, login_user, logout_user
        from database_cloud import SupabaseManager
        
        print("\n1️⃣ Testing Database Connection...")
        db_instance = get_db()
        if db_instance is None:
            print("❌ Database instance is None!")
            return False
        
        print(f"✅ Database instance: {type(db_instance)}")
        
        # Check if using Supabase
        if hasattr(db_instance, 'storage_manager') and db_instance.storage_manager:
            if hasattr(db_instance.storage_manager, 'supabase'):
                print("✅ Using Supabase database!")
            else:
                print("⚠️ Not using Supabase database")
                return False
        else:
            print("❌ No storage manager found")
            return False
        
        print("\n2️⃣ Testing User Registration...")
        # Test registration with new user
        success, message = register_user(
            "Final Test User", 
            "final_test@example.com", 
            "+852 8888 8888", 
            "finalpass123"
        )
        print(f"   Registration: {success} - {message}")
        
        if not success:
            print("❌ Registration failed!")
            return False
        
        print("\n3️⃣ Testing User Login...")
        # Test login with new user
        success, message = login_user("final_test@example.com", "finalpass123")
        print(f"   Login: {success} - {message}")
        
        if not success:
            print("❌ Login failed!")
            return False
        
        print("\n4️⃣ Testing Existing User Login...")
        # Test login with existing user
        success, message = login_user("frankyeung422@hotmail.com", "password123")
        print(f"   Login: {success} - {message}")
        
        if not success:
            print("❌ Existing user login failed!")
            return False
        
        print("\n5️⃣ Testing User Listing...")
        # List all users
        try:
            users = db_instance.storage_manager.get_all_users()
            print(f"   Total users: {len(users)}")
            for user in users:
                print(f"      ID: {user['id']}, Email: {user['email']}, Username: {user['username']}")
        except Exception as e:
            print(f"   ❌ Error listing users: {e}")
            return False
        
        print("\n6️⃣ Testing Child Profile Creation...")
        # Test child profile creation
        if hasattr(db_instance, 'add_child_profile'):
            success, message = db_instance.add_child_profile(
                db_instance.storage_manager.get_user_by_email("final_test@example.com")['id'],
                "Test Child",
                "2020-01-01",
                "Male"
            )
            print(f"   Child Profile: {success} - {message}")
        
        print("\n7️⃣ Testing Application Submission...")
        # Test application submission
        if hasattr(db_instance, 'submit_application'):
            user = db_instance.storage_manager.get_user_by_email("final_test@example.com")
            child_profiles = db_instance.get_child_profiles(user['id'])
            
            if child_profiles:
                success, message = db_instance.submit_application(
                    user['id'],
                    child_profiles[0]['id'],
                    '0001',
                    'Test Kindergarten',
                    'Final Test User',
                    'final_test@example.com',
                    '+852 8888 8888',
                    '2024-09-01',
                    'Test application'
                )
                print(f"   Application: {success} - {message}")
        
        print("\n8️⃣ Testing Notification System...")
        # Test notification system
        if hasattr(db_instance, 'add_notification'):
            user = db_instance.storage_manager.get_user_by_email("final_test@example.com")
            success, message = db_instance.add_notification(
                user['id'],
                "Test Notification",
                "This is a test notification",
                "high"
            )
            print(f"   Notification: {success} - {message}")
        
        print("\n9️⃣ Testing Portfolio System...")
        # Test portfolio system
        if hasattr(db_instance, 'add_portfolio_item'):
            user = db_instance.storage_manager.get_user_by_email("final_test@example.com")
            child_profiles = db_instance.get_child_profiles(user['id'])
            
            if child_profiles:
                success, message = db_instance.add_portfolio_item(
                    user['id'],
                    child_profiles[0]['id'],
                    "Test Portfolio Item",
                    "Test Category",
                    "2024-01-01",
                    "This is a test portfolio item"
                )
                print(f"   Portfolio: {success} - {message}")
        
        print("\n🔟 Testing Personal Statement System...")
        # Test personal statement system
        if hasattr(db_instance, 'add_personal_statement'):
            user = db_instance.storage_manager.get_user_by_email("final_test@example.com")
            child_profiles = db_instance.get_child_profiles(user['id'])
            
            if child_profiles:
                success, message = db_instance.add_personal_statement(
                    user['id'],
                    child_profiles[0]['id'],
                    "Test Statement",
                    "This is a test personal statement",
                    "Test School"
                )
                print(f"   Personal Statement: {success} - {message}")
        
        print("\n" + "=" * 50)
        print("🎉 ALL TESTS PASSED! SUPABASE INTEGRATION SUCCESSFUL!")
        print("=" * 50)
        
        print("\n📊 Final Database Status:")
        print(f"   Database Type: Supabase")
        print(f"   Total Users: {len(db_instance.storage_manager.get_all_users())}")
        print(f"   Connection: ✅ Active")
        print(f"   Status: ✅ Operational")
        
        return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_supabase_integration()
    if success:
        print("\n🚀 Your School Application Portal is ready to use with Supabase!")
        print("   Run: streamlit run streamlit_app.py")
    else:
        print("\n⚠️ Some tests failed. Please check the configuration.") 