#!/usr/bin/env python3
"""
Test database integration with Streamlit app
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_database_integration():
    """Test if the database integration works with the Streamlit app"""
    
    print("Testing database integration...")
    
    try:
        # Import the database manager
        from database_cloud import CloudDatabaseManager
        
        # Initialize database manager
        db_manager = CloudDatabaseManager(storage_type="local")
        
        print("✅ Database manager initialized")
        
        # Test getting kindergartens
        kindergartens = db_manager.get_all_kindergartens()
        print(f"✅ Found {len(kindergartens)} kindergartens in database")
        
        if kindergartens:
            print("Sample kindergarten:")
            kg = kindergartens[0]
            print(f"  - Name: {kg.get('name_en', 'N/A')}")
            print(f"  - District: {kg.get('district_en', 'N/A')}")
            print(f"  - Website: {kg.get('website', 'N/A')}")
        
        # Test getting primary schools
        primary_schools = db_manager.get_all_primary_schools()
        print(f"✅ Found {len(primary_schools)} primary schools in database")
        
        if primary_schools:
            print("Sample primary school:")
            ps = primary_schools[0]
            print(f"  - Name: {ps.get('name_en', 'N/A')}")
            print(f"  - District: {ps.get('district_en', 'N/A')}")
            print(f"  - Website: {ps.get('website', 'N/A')}")
        
        # Test Streamlit app data loading functions
        print("\nTesting Streamlit app data loading...")
        
        # Mock streamlit for testing
        class MockStreamlit:
            def cache_data(self, func):
                return func
            
            def secrets(self):
                return {}
        
        # Replace streamlit with mock
        sys.modules['streamlit'] = MockStreamlit()
        
        # Import the data loading functions
        from streamlit_app import load_kindergarten_data, load_primary_school_data
        
        # Test kindergarten data loading
        kg_data = load_kindergarten_data()
        print(f"✅ Streamlit app loaded {len(kg_data)} kindergartens")
        
        # Test primary school data loading
        ps_data = load_primary_school_data()
        print(f"✅ Streamlit app loaded {len(ps_data)} primary schools")
        
        print("\n🎉 Database integration test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during database integration test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_database_integration() 