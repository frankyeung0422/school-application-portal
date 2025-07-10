#!/usr/bin/env python3
"""
Test child profile creation with Supabase
"""

import streamlit as st
import sys
import os

# Add current directory to path
sys.path.append('.')

def test_child_profile_creation():
    """Test child profile creation with Supabase"""
    print("🧪 Testing child profile creation with Supabase...")
    
    try:
        # Import the functions
        from streamlit_app import get_db, add_child_profile, login_user
        
        # Get database instance
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
        
        # First, login a user to set up session state
        print("\n🔐 Logging in user for testing...")
        success, message = login_user("frankyeung422@hotmail.com", "password123")
        if not success:
            print(f"❌ Login failed: {message}")
            return False
        
        print(f"✅ Login successful: {message}")
        print(f"   Current user: {st.session_state.current_user}")
        
        # Test child profile creation
        print("\n👶 Testing child profile creation...")
        
        # Test creating a child profile using the correct function signature
        success, message = add_child_profile(
            "Test Child",
            "2020-01-01",
            "Male"
        )
        
        print(f"   Child profile creation: {success} - {message}")
        
        if success:
            # Test getting child profiles
            print("\n📋 Testing get child profiles...")
            user_id = st.session_state.current_user['id']
            child_profiles = db_instance.get_child_profiles(user_id)
            print(f"   Found {len(child_profiles)} child profiles")
            
            for profile in child_profiles:
                print(f"      - {profile['child_name']} ({profile['gender']}) - {profile['date_of_birth']}")
            
            # Test creating another child profile
            print("\n👶 Testing second child profile creation...")
            success2, message2 = add_child_profile(
                "Test Child 2",
                "2021-06-15",
                "Female"
            )
            
            print(f"   Second child profile: {success2} - {message2}")
            
            # Get updated child profiles
            child_profiles_updated = db_instance.get_child_profiles(user_id)
            print(f"   Updated: Found {len(child_profiles_updated)} child profiles")
            
            return True
        else:
            print(f"❌ Child profile creation failed: {message}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_child_profile_creation()
    if success:
        print("\n🎉 Child profile creation test PASSED!")
    else:
        print("\n❌ Child profile creation test FAILED!") 