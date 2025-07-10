import streamlit as st
from database_supabase import SupabaseDatabaseManager

def test_supabase_connection():
    """Test Supabase connection with provided credentials"""
    print("🔍 Testing Supabase connection...")
    
    try:
        # Check if Supabase credentials are available
        if 'SUPABASE' not in st.secrets:
            print("❌ Supabase credentials not found in Streamlit secrets")
            return False
        
        print("✅ Supabase credentials found in secrets")
        print(f"   URL: {st.secrets['SUPABASE']['URL']}")
        print(f"   Key: {st.secrets['SUPABASE']['ANON_KEY'][:20]}...")
        
        # Create Supabase database manager
        print("\n📊 Creating Supabase database manager...")
        supabase_db = SupabaseDatabaseManager()
        
        if not supabase_db.supabase:
            print("❌ Supabase connection failed")
            return False
        
        print("✅ Supabase connection established successfully!")
        
        # Test basic operations
        print("\n🧪 Testing basic operations...")
        
        # Test getting all users (should be empty initially)
        users = supabase_db.get_all_users()
        print(f"   Current users in database: {len(users)}")
        
        # Test creating a test user
        print("\n👤 Testing user creation...")
        success = supabase_db.create_user(
            username="testuser",
            email="test@example.com",
            password_hash="test_hash_123",
            full_name="Test User",
            phone="+852 1234 5678"
        )
        
        if success:
            print("✅ Test user created successfully!")
            
            # Test getting the user
            user = supabase_db.get_user_by_email("test@example.com")
            if user:
                print(f"   Retrieved user: {user['username']} ({user['email']})")
            
            # Test user verification
            verified_user = supabase_db.verify_user("test@example.com", "test_hash_123")
            if verified_user:
                print("✅ User verification successful!")
            else:
                print("❌ User verification failed!")
            
            # Test login
            login_success, login_message, login_user_data = supabase_db.login_user("test@example.com", "test_hash_123")
            print(f"   Login test: {login_success} - {login_message}")
            
        else:
            print("❌ Failed to create test user")
        
        # Show final user count
        final_users = supabase_db.get_all_users()
        print(f"\n📊 Final user count: {len(final_users)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_supabase_connection() 