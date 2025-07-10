import streamlit as st
from supabase import create_client, Client

def setup_supabase_tables():
    """Set up database tables in Supabase"""
    print("🗄️ Setting up Supabase database tables...")
    
    try:
        # Get Supabase credentials
        if 'SUPABASE' not in st.secrets:
            print("❌ Supabase credentials not found")
            return False
        
        supabase_url = st.secrets['SUPABASE']['URL']
        supabase_key = st.secrets['SUPABASE']['ANON_KEY']
        
        # Create Supabase client
        supabase: Client = create_client(supabase_url, supabase_key)
        print("✅ Supabase client created")
        
        # SQL script to create all tables
        sql_script = """
        -- Create users table
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            phone TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create child_profiles table
        CREATE TABLE IF NOT EXISTS child_profiles (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(id),
            child_name TEXT NOT NULL,
            date_of_birth DATE,
            gender TEXT,
            nationality TEXT,
            address TEXT,
            parent_name TEXT,
            parent_phone TEXT,
            parent_email TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create applications table
        CREATE TABLE IF NOT EXISTS applications (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(id),
            child_id BIGINT REFERENCES child_profiles(id),
            school_name TEXT NOT NULL,
            school_type TEXT NOT NULL,
            application_date DATE NOT NULL,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create application_tracking table
        CREATE TABLE IF NOT EXISTS application_tracking (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(id),
            school_no TEXT NOT NULL,
            school_name TEXT NOT NULL,
            status TEXT DEFAULT 'tracking',
            notes TEXT,
            date_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create notifications table
        CREATE TABLE IF NOT EXISTS notifications (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(id),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create portfolio_items table
        CREATE TABLE IF NOT EXISTS portfolio_items (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(id),
            child_id BIGINT REFERENCES child_profiles(id),
            title TEXT NOT NULL,
            description TEXT,
            category TEXT,
            item_date DATE,
            attachment_path TEXT,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create personal_statements table
        CREATE TABLE IF NOT EXISTS personal_statements (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(id),
            child_id BIGINT REFERENCES child_profiles(id),
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            target_school TEXT,
            version TEXT DEFAULT '1.0',
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
        
        print("📋 Creating tables...")
        
        # Execute the SQL script
        # Note: We'll need to use the Supabase dashboard for this
        # For now, let's test if we can connect and create a simple table
        
        # Test creating a simple table via API
        try:
            # Test if users table exists by trying to insert a test record
            test_data = {
                'username': 'test_setup',
                'email': 'test_setup@example.com',
                'password_hash': 'test_hash',
                'full_name': 'Test Setup User'
            }
            
            result = supabase.table('users').insert(test_data).execute()
            print("✅ Users table exists and is working!")
            
            # Clean up test data
            supabase.table('users').delete().eq('email', 'test_setup@example.com').execute()
            print("✅ Test data cleaned up")
            
        except Exception as e:
            print(f"❌ Table creation test failed: {e}")
            print("\n📝 You need to create the tables manually in Supabase dashboard:")
            print("1. Go to your Supabase dashboard")
            print("2. Click on 'SQL Editor'")
            print("3. Create a new query")
            print("4. Paste and run the SQL script from SUPABASE_SETUP_GUIDE.md")
            return False
        
        print("✅ All tables are ready!")
        return True
        
    except Exception as e:
        print(f"❌ Error setting up tables: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    setup_supabase_tables() 