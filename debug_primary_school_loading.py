#!/usr/bin/env python3
"""
Debug primary school loading step by step
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def debug_primary_school_loading():
    """Debug primary school loading step by step"""
    
    print("Debugging primary school loading...")
    
    try:
        # Test 1: Get database manager
        print("\n1. Testing database manager...")
        from streamlit_app import get_db
        
        db = get_db()
        if db:
            print("✅ Database manager created successfully")
            print(f"   Type: {type(db)}")
        else:
            print("❌ Database manager is None")
            return
        
        # Test 2: Try to get primary schools
        print("\n2. Testing get_all_primary_schools()...")
        try:
            primary_schools = db.get_all_primary_schools()
            print(f"✅ get_all_primary_schools() returned: {type(primary_schools)}")
            print(f"   Length: {len(primary_schools) if primary_schools else 0}")
            
            if primary_schools:
                print("   Sample data:")
                for i, ps in enumerate(primary_schools[:3]):
                    print(f"     {i+1}. {ps.get('name_en', 'N/A')}")
            else:
                print("   ❌ No primary schools returned")
                
        except Exception as e:
            print(f"❌ Error in get_all_primary_schools(): {e}")
            import traceback
            traceback.print_exc()
        
        # Test 3: Test the full load_primary_school_data function
        print("\n3. Testing load_primary_school_data()...")
        try:
            from streamlit_app import load_primary_school_data
            
            data = load_primary_school_data()
            print(f"✅ load_primary_school_data() returned: {len(data)} schools")
            
            if data:
                print("   Sample data:")
                for i, ps in enumerate(data[:3]):
                    print(f"     {i+1}. {ps.get('name_en', 'N/A')} (source: {ps.get('source', 'N/A')})")
            else:
                print("   ❌ No data returned")
                
        except Exception as e:
            print(f"❌ Error in load_primary_school_data(): {e}")
            import traceback
            traceback.print_exc()
        
        # Test 4: Direct Supabase test
        print("\n4. Testing direct Supabase connection...")
        try:
            from database_supabase import SupabaseDatabaseManager
            
            supabase_db = SupabaseDatabaseManager()
            primary_schools = supabase_db.get_all_primary_schools()
            print(f"✅ Direct Supabase returned: {len(primary_schools)} schools")
            
            if primary_schools:
                print("   Sample data:")
                for i, ps in enumerate(primary_schools[:3]):
                    print(f"     {i+1}. {ps.get('name_en', 'N/A')}")
            else:
                print("   ❌ No primary schools from direct Supabase")
                
        except Exception as e:
            print(f"❌ Error in direct Supabase test: {e}")
            import traceback
            traceback.print_exc()
        
    except Exception as e:
        print(f"❌ General error: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main function"""
    print("🔍 Debugging Primary School Loading")
    print("=" * 60)
    
    debug_primary_school_loading()
    
    print("\n" + "=" * 60)
    print("✅ Debug completed!")

if __name__ == "__main__":
    main() 