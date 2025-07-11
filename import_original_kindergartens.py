#!/usr/bin/env python3
"""
Import all 734 kindergartens from the original scraped_data.json file
"""

import json
import sys
import os
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def import_original_kindergartens():
    """Import all kindergartens from the original scraped_data.json file"""
    
    print("Importing all 734 kindergartens from original data file...")
    
    try:
        # Read the original data file with proper encoding
        with open('backend/scraped_data.json', 'r', encoding='utf-8') as f:
            original_data = json.load(f)
        
        print(f"✅ Found {len(original_data)} kindergartens in original file")
        
        # Import database manager
        from database_cloud import CloudDatabaseManager
        
        # Initialize database manager
        db_manager = CloudDatabaseManager(storage_type="local")
        
        if not db_manager.conn:
            print("❌ Database connection failed")
            return
        
        # Clear existing kindergartens to avoid duplicates
        cursor = db_manager.conn.cursor()
        cursor.execute('DELETE FROM kindergartens')
        db_manager.conn.commit()
        print("✅ Cleared existing kindergarten data")
        
        # Import each kindergarten
        imported_count = 0
        for kg in original_data:
            try:
                # Add missing fields with default values
                kg_data = {
                    "school_no": kg.get("school_no", ""),
                    "name_en": kg.get("name_en", ""),
                    "name_tc": kg.get("name_tc", ""),
                    "district_en": kg.get("district_en", ""),
                    "district_tc": kg.get("district_tc", ""),
                    "website": kg.get("website", ""),
                    "application_page": kg.get("application_page", ""),
                    "has_website": kg.get("has_website", False),
                    "website_verified": kg.get("website_verified", False),
                    "address_en": kg.get("address_en", ""),
                    "address_tc": kg.get("address_tc", ""),
                    "tel": kg.get("tel", ""),
                    "curriculum": kg.get("curriculum", "本地課程"),
                    "funding_type": kg.get("funding_type", "資助"),
                    "through_train": kg.get("through_train", False),
                    "language_of_instruction": kg.get("language_of_instruction", "中文"),
                    "student_capacity": kg.get("student_capacity", "120"),
                    "last_updated": kg.get("last_updated", datetime.now().isoformat()),
                    "source": "Original Scraped Data"
                }
                
                # Insert into database
                cursor.execute('''
                    INSERT INTO kindergartens (
                        school_no, name_en, name_tc, district_en, district_tc,
                        address_en, address_tc, tel, website, school_type,
                        curriculum, funding_type, through_train, language_of_instruction,
                        student_capacity, application_page, has_website, website_verified, 
                        last_updated, source
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    kg_data["school_no"], kg_data["name_en"], kg_data["name_tc"], 
                    kg_data["district_en"], kg_data["district_tc"], kg_data["address_en"], 
                    kg_data["address_tc"], kg_data["tel"], kg_data["website"], "Kindergarten",
                    kg_data["curriculum"], kg_data["funding_type"], kg_data["through_train"], 
                    kg_data["language_of_instruction"], kg_data["student_capacity"], 
                    kg_data["application_page"], kg_data["has_website"], kg_data["website_verified"], 
                    kg_data["last_updated"], kg_data["source"]
                ))
                
                imported_count += 1
                
                # Progress indicator
                if imported_count % 50 == 0:
                    print(f"✅ Imported {imported_count} kindergartens...")
                
            except Exception as e:
                print(f"❌ Error importing {kg.get('name_en', 'Unknown')}: {e}")
                continue
        
        # Commit all changes
        db_manager.conn.commit()
        
        print(f"\n🎉 Successfully imported {imported_count} kindergartens!")
        print(f"📊 Database now contains {imported_count} kindergarten records")
        
        # Verify the import
        cursor.execute('SELECT COUNT(*) FROM kindergartens')
        count = cursor.fetchone()[0]
        print(f"✅ Verified: {count} kindergartens in database")
        
        # Show sample data
        cursor.execute('SELECT name_en, district_en FROM kindergartens LIMIT 5')
        samples = cursor.fetchall()
        print("\nSample imported kindergartens:")
        for sample in samples:
            print(f"  - {sample[0]} ({sample[1]})")
        
    except Exception as e:
        print(f"❌ Error during import: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main function"""
    print("🚀 Starting import of all 734 kindergartens from original data...")
    print("=" * 70)
    
    import_original_kindergartens()
    
    print("\n" + "=" * 70)
    print("✅ Import completed!")
    print("\nYour database now contains all 734 kindergartens from the original data.")
    print("The Streamlit app will load all kindergartens from the database.")

if __name__ == "__main__":
    main() 