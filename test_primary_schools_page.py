#!/usr/bin/env python3
"""
Test primary schools page functionality
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_primary_schools_data():
    """Test primary school data loading"""
    
    print("Testing primary school data loading...")
    
    try:
        # Import the function from streamlit app
        from streamlit_app import load_primary_school_data
        
        # Load primary school data
        primary_schools = load_primary_school_data()
        
        print(f"✅ Loaded {len(primary_schools)} primary schools")
        
        if primary_schools:
            print("\nSample primary schools:")
            for i, school in enumerate(primary_schools[:5]):
                print(f"  {i+1}. {school.get('name_en', 'N/A')} ({school.get('district_en', 'N/A')})")
            
            # Check data structure
            sample_school = primary_schools[0]
            required_fields = ['school_no', 'name_en', 'name_tc', 'district_en', 'district_tc']
            
            print(f"\nChecking data structure...")
            for field in required_fields:
                if field in sample_school:
                    print(f"  ✅ {field}: {sample_school[field]}")
                else:
                    print(f"  ❌ Missing field: {field}")
            
            # Check districts
            districts = set(school.get('district_en', '') for school in primary_schools if school.get('district_en'))
            print(f"\nDistricts found: {len(districts)}")
            for district in sorted(districts):
                print(f"  - {district}")
            
            # Check curriculums
            curriculums = set(school.get('curriculum', '') for school in primary_schools if school.get('curriculum'))
            print(f"\nCurriculums found: {len(curriculums)}")
            for curriculum in sorted(curriculums):
                print(f"  - {curriculum}")
        
        else:
            print("❌ No primary school data loaded")
            
    except Exception as e:
        print(f"❌ Error testing primary school data: {e}")
        import traceback
        traceback.print_exc()

def test_database_primary_schools():
    """Test database primary schools"""
    
    print("\nTesting database primary schools...")
    
    try:
        from database_cloud import CloudDatabaseManager
        
        db_manager = CloudDatabaseManager(storage_type="local")
        
        if not db_manager.conn:
            print("❌ Database connection failed")
            return
        
        # Get primary schools from database
        primary_schools = db_manager.get_all_primary_schools()
        
        print(f"✅ Database contains {len(primary_schools)} primary schools")
        
        if primary_schools:
            print("\nSample database primary schools:")
            for i, school in enumerate(primary_schools[:5]):
                print(f"  {i+1}. {school.get('name_en', 'N/A')} ({school.get('district_en', 'N/A')})")
        
    except Exception as e:
        print(f"❌ Error testing database primary schools: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main test function"""
    print("🚀 Testing Primary Schools Page Functionality")
    print("=" * 60)
    
    test_primary_schools_data()
    test_database_primary_schools()
    
    print("\n" + "=" * 60)
    print("✅ Primary schools testing completed!")

if __name__ == "__main__":
    main() 