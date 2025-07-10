import streamlit as st
import sqlite3
from database_supabase import SupabaseDatabaseManager

def migrate_to_supabase():
    """Migrate users from SQLite to Supabase"""
    print("🚀 Migrating users from SQLite to Supabase...")
    
    try:
        # Check if Supabase credentials are available
        if 'SUPABASE' not in st.secrets:
            print("❌ Supabase credentials not found in Streamlit secrets")
            print("Please add your Supabase URL and anon key to Streamlit secrets")
            return False
        
        # Create Supabase database manager
        supabase_db = SupabaseDatabaseManager()
        
        if not supabase_db.supabase:
            print("❌ Supabase connection failed")
            return False
        
        print("✅ Supabase connection established")
        
        # Migrate users from SQLite
        success = supabase_db.migrate_from_sqlite('school_portal.db')
        
        if success:
            print("✅ Migration completed successfully!")
            
            # Verify migration
            print("\n🔍 Verifying migration...")
            users = supabase_db.get_all_users()
            print(f"📊 Users in Supabase: {len(users)}")
            
            for user in users:
                print(f"   ID: {user['id']}, Email: {user['email']}, Username: {user['username']}")
            
            return True
        else:
            print("❌ Migration failed")
            return False
            
    except Exception as e:
        print(f"❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    migrate_to_supabase() 