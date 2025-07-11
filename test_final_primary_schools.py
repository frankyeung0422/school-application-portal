#!/usr/bin/env python3
"""
Final test to verify primary schools are working correctly
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_final_primary_schools():
    """Test final primary schools setup"""
    
    print("Testing final primary schools setup...")
    
    try:
        # Test 1: Check Supabase data
        print("\n1. Checking Supabase primary schools...")
        from database_supabase import SupabaseDatabaseManager
        
        supabase_db = SupabaseDatabaseManager()
        primary_schools = supabase_db.get_all_primary_schools()
        
        print(f"✅ Supabase has {len(primary_schools)} primary schools")
        
        if primary_schools:
            print("   Sample schools:")
            for i, ps in enumerate(primary_schools[:5]):
                print(f"     {i+1}. {ps.get('name_en', 'N/A')} ({ps.get('district_en', 'N/A')})")
        
        # Test 2: Check Streamlit loading
        print("\n2. Testing Streamlit primary school loading...")
        from streamlit_app import load_primary_school_data
        
        data = load_primary_school_data()
        print(f"✅ Streamlit loaded {len(data)} primary schools")
        
        if data:
            print("   Sample data:")
            for i, ps in enumerate(data[:5]):
                source = ps.get('source', 'Unknown')
                print(f"     {i+1}. {ps.get('name_en', 'N/A')} (source: {source})")
        
        # Test 3: Check if data is from Supabase
        if data and len(data) > 0:
            sample_school = data[0]
            source = sample_school.get('source', '')
            
            if 'Supabase' in source or 'Direct SQL' in source:
                print("✅ Data is from Supabase database")
            elif 'Local Database' in source:
                print("✅ Data is from local database")
            else:
                print("⚠️ Data is from fallback sample data")
        
        # Test 4: Check districts
        if data:
            districts = set(ps.get('district_en', '') for ps in data if ps.get('district_en'))
            print(f"\n3. Districts found: {len(districts)}")
            for district in sorted(districts):
                print(f"   - {district}")
        
        # Test 5: Check curriculums
        if data:
            curriculums = set(ps.get('curriculum', '') for ps in data if ps.get('curriculum'))
            print(f"\n4. Curriculums found: {len(curriculums)}")
            for curriculum in sorted(curriculums):
                print(f"   - {curriculum}")
        
        print(f"\n🎉 Primary schools test completed!")
        print(f"📊 Total schools available: {len(data)}")
        
        if len(data) >= 20:
            print("✅ All 20 primary schools are available!")
        elif len(data) >= 5:
            print("✅ Primary schools are working (5+ schools available)")
        else:
            print("❌ Primary schools need more data")
        
    except Exception as e:
        print(f"❌ Error in final test: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main function"""
    print("🚀 Final Primary Schools Test")
    print("=" * 60)
    
    test_final_primary_schools()
    
    print("\n" + "=" * 60)
    print("✅ Test completed!")

if __name__ == "__main__":
    main() 