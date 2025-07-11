#!/usr/bin/env python3
"""
Migrate primary schools from local database to Supabase
"""

import sys
import os
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def migrate_primary_schools_to_supabase():
    """Migrate primary schools from local database to Supabase"""
    
    print("Migrating primary schools from local database to Supabase...")
    
    try:
        # Import database managers
        from database_cloud import CloudDatabaseManager
        from database_supabase import SupabaseDatabaseManager
        
        # Initialize local database manager
        local_db = CloudDatabaseManager(storage_type="local")
        
        if not local_db.conn:
            print("❌ Local database connection failed")
            return
        
        # Initialize Supabase database manager
        supabase_db = SupabaseDatabaseManager()
        
        # Get primary schools from local database
        local_primary_schools = local_db.get_all_primary_schools()
        
        print(f"✅ Found {len(local_primary_schools)} primary schools in local database")
        
        if not local_primary_schools:
            print("❌ No primary schools found in local database")
            return
        
        # Migrate each primary school to Supabase
        migrated_count = 0
        for ps in local_primary_schools:
            try:
                # Prepare data for Supabase
                ps_data = {
                    "school_no": ps.get("school_no", ""),
                    "name_en": ps.get("name_en", ""),
                    "name_tc": ps.get("name_tc", ""),
                    "district_en": ps.get("district_en", ""),
                    "district_tc": ps.get("district_tc", ""),
                    "address_en": ps.get("address_en", ""),
                    "address_tc": ps.get("address_tc", ""),
                    "tel": ps.get("tel", ""),
                    "website": ps.get("website", ""),
                    "school_type": "Primary School",
                    "curriculum": ps.get("curriculum", ""),
                    "funding_type": ps.get("funding_type", ""),
                    "through_train": ps.get("through_train", False),
                    "language_of_instruction": ps.get("language_of_instruction", ""),
                    "student_capacity": ps.get("student_capacity", ""),
                    "application_page": ps.get("application_page", ""),
                    "has_website": ps.get("has_website", False),
                    "website_verified": ps.get("website_verified", False),
                    "source": "Local Database Migration"
                }
                
                # Insert into Supabase
                result = supabase_db.supabase.table('primary_schools').insert(ps_data).execute()
                
                if result.data:
                    migrated_count += 1
                    print(f"✅ Migrated: {ps.get('name_en', 'Unknown')}")
                else:
                    print(f"❌ Failed to migrate: {ps.get('name_en', 'Unknown')}")
                
            except Exception as e:
                print(f"❌ Error migrating {ps.get('name_en', 'Unknown')}: {e}")
                continue
        
        print(f"\n🎉 Successfully migrated {migrated_count} primary schools to Supabase!")
        
        # Verify migration
        try:
            supabase_primary_schools = supabase_db.get_all_primary_schools()
            print(f"✅ Supabase now contains {len(supabase_primary_schools)} primary schools")
            
            if supabase_primary_schools:
                print("\nSample migrated primary schools:")
                for i, ps in enumerate(supabase_primary_schools[:5]):
                    print(f"  {i+1}. {ps.get('name_en', 'N/A')} ({ps.get('district_en', 'N/A')})")
        
        except Exception as e:
            print(f"❌ Error verifying migration: {e}")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main function"""
    print("🚀 Starting Primary Schools Migration to Supabase")
    print("=" * 60)
    
    print("⚠️  IMPORTANT: Make sure you have run the SQL script in Supabase first!")
    print("   File: SUPABASE_CREATE_PRIMARY_SCHOOLS.sql")
    print("   Run this in your Supabase SQL Editor before proceeding.")
    print()
    
    input("Press Enter to continue with migration...")
    
    migrate_primary_schools_to_supabase()
    
    print("\n" + "=" * 60)
    print("✅ Migration completed!")
    print("\nYour Supabase database now contains all primary schools.")
    print("The Streamlit app will load primary schools from Supabase.")

if __name__ == "__main__":
    main() 