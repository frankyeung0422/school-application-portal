#!/usr/bin/env python3
"""
Check Supabase primary schools table and data
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def check_supabase_primary_schools():
    """Check Supabase primary schools table and data"""
    
    print("Checking Supabase primary schools table and data...")
    
    try:
        from database_supabase import SupabaseDatabaseManager
        
        # Initialize Supabase database manager
        supabase_db = SupabaseDatabaseManager()
        
        # Check if table exists
        try:
            result = supabase_db.supabase.table('primary_schools').select('*').limit(1).execute()
            print("✅ Primary schools table exists in Supabase")
        except Exception as e:
            print(f"❌ Primary schools table does not exist: {e}")
            return
        
        # Get all primary schools
        try:
            primary_schools = supabase_db.get_all_primary_schools()
            print(f"✅ Found {len(primary_schools)} primary schools in Supabase")
            
            if primary_schools:
                print("\nSample primary schools from Supabase:")
                for i, ps in enumerate(primary_schools[:5]):
                    print(f"  {i+1}. {ps.get('name_en', 'N/A')} ({ps.get('district_en', 'N/A')})")
                
                # Check data structure
                sample_school = primary_schools[0]
                required_fields = ['school_no', 'name_en', 'name_tc', 'district_en', 'district_tc']
                
                print(f"\nChecking data structure...")
                for field in required_fields:
                    if field in sample_school:
                        print(f"  ✅ {field}: {sample_school[field]}")
                    else:
                        print(f"  ❌ Missing field: {field}")
            else:
                print("❌ No primary schools found in Supabase table")
        
        except Exception as e:
            print(f"❌ Error getting primary schools: {e}")
        
        # Check table structure
        try:
            result = supabase_db.supabase.rpc('get_table_info', {'table_name': 'primary_schools'}).execute()
            print(f"\nTable structure: {result}")
        except:
            print("\nCould not get table structure info")
        
    except Exception as e:
        print(f"❌ Error checking Supabase: {e}")
        import traceback
        traceback.print_exc()

def test_streamlit_primary_school_loading():
    """Test how Streamlit app loads primary school data"""
    
    print("\nTesting Streamlit primary school data loading...")
    
    try:
        from streamlit_app import load_primary_school_data
        
        # Load primary school data
        primary_schools = load_primary_school_data()
        
        print(f"✅ Streamlit loaded {len(primary_schools)} primary schools")
        
        if primary_schools:
            print("\nSample primary schools from Streamlit:")
            for i, ps in enumerate(primary_schools[:5]):
                print(f"  {i+1}. {ps.get('name_en', 'N/A')} ({ps.get('district_en', 'N/A')})")
            
            # Check if data is from database or fallback
            sample_school = primary_schools[0]
            if sample_school.get('source') == 'Local Database Migration':
                print("✅ Data is from Supabase database")
            elif sample_school.get('source') == 'Original Scraped Data':
                print("✅ Data is from local database")
            else:
                print("⚠️ Data is from fallback sample data")
        else:
            print("❌ No primary schools loaded by Streamlit")
            
    except Exception as e:
        print(f"❌ Error testing Streamlit loading: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main function"""
    print("🔍 Checking Supabase Primary Schools Setup")
    print("=" * 60)
    
    check_supabase_primary_schools()
    test_streamlit_primary_school_loading()
    
    print("\n" + "=" * 60)
    print("✅ Check completed!")

if __name__ == "__main__":
    main() 