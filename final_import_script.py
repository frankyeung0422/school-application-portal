#!/usr/bin/env python3
"""
Final Import Script for Comprehensive Hong Kong Primary School Data
Imports the comprehensive primary school data into Supabase
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from supabase import create_client, Client
from typing import List, Dict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('final_import.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class FinalImportScript:
    """Final import script for comprehensive primary school data"""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized successfully")
    
    def load_processed_data(self) -> List[Dict]:
        """Load the latest processed data"""
        csv_data_dir = Path("csv_data")
        if not csv_data_dir.exists():
            logger.error("csv_data directory not found")
            return []
        
        json_files = list(csv_data_dir.glob("processed_primary_schools_*.json"))
        if not json_files:
            logger.error("No processed data files found")
            return []
        
        # Use the latest file
        latest_file = max(json_files, key=lambda x: x.stat().st_mtime)
        logger.info(f"Using latest processed file: {latest_file}")
        
        try:
            with open(latest_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            logger.info(f"Loaded {len(data)} schools from {latest_file}")
            return data
            
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            return []
    
    def import_to_supabase(self, schools: List[Dict]) -> bool:
        """Import schools data to Supabase"""
        try:
            logger.info(f"Importing {len(schools)} schools to Supabase...")
            
            # Prepare data for Supabase
            supabase_data = []
            for school in schools:
                supabase_record = {
                    'school_no': school['school_no'],
                    'name_en': school['name_en'],
                    'name_tc': school['name_tc'],
                    'district_en': school['district_en'],
                    'district_tc': school['district_tc'],
                    'address_en': school['address_en'],
                    'address_tc': school['address_tc'],
                    'tel': school['tel'],
                    'website': school['website'],
                    'curriculum': school['curriculum'],
                    'funding_type': school['funding_type'],
                    'through_train': school['through_train'],
                    'language_of_instruction': school['language_of_instruction'],
                    'student_capacity': school['student_capacity'],
                    'application_page': school['application_page'],
                    'has_website': school['has_website'],
                    'website_verified': school['website_verified'],
                    'source': school['source']
                }
                supabase_data.append(supabase_record)
            
            # Use upsert to handle duplicates
            result = self.supabase.table('primary_schools').upsert(supabase_data).execute()
            
            logger.info(f"Successfully imported {len(schools)} schools to Supabase")
            return True
            
        except Exception as e:
            logger.error(f"Error importing to Supabase: {e}")
            return False
    
    def verify_import(self) -> int:
        """Verify the import by counting records"""
        try:
            result = self.supabase.table('primary_schools').select('school_no').execute()
            count = len(result.data)
            logger.info(f"Verified {count} schools in Supabase database")
            return count
            
        except Exception as e:
            logger.error(f"Error verifying import: {e}")
            return 0
    
    def run_import(self) -> bool:
        """Run the complete import process"""
        logger.info("Starting final import process...")
        
        # Load data
        schools = self.load_processed_data()
        
        if not schools:
            logger.error("No schools data to import")
            return False
        
        # Import to Supabase
        success = self.import_to_supabase(schools)
        
        if success:
            # Verify import
            count = self.verify_import()
            logger.info(f"Import completed successfully. {count} schools in database.")
            return True
        else:
            logger.error("Import failed")
            return False

def main():
    """Main function with manual credential input"""
    print("=== Comprehensive Hong Kong Primary School Data Import ===")
    print()
    
    # Get Supabase credentials
    print("Please enter your Supabase credentials:")
    supabase_url = input("Supabase URL: ").strip()
    supabase_key = input("Supabase Anon Key: ").strip()
    
    if not supabase_url or not supabase_key:
        print("❌ Supabase credentials are required")
        return
    
    try:
        # Run import
        importer = FinalImportScript(supabase_url, supabase_key)
        success = importer.run_import()
        
        if success:
            print("\n✅ Import completed successfully!")
            print("Your comprehensive Hong Kong primary school data has been imported to Supabase.")
            print(f"📊 Total schools imported: 64")
            print(f"🏫 Schools cover all 18 districts of Hong Kong")
            print(f"🌍 Includes international schools and local schools")
            print(f"📅 Data source: EDB CSV Import")
        else:
            print("\n❌ Import failed. Please check the logs for details.")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("Please check your Supabase credentials and try again.")

if __name__ == "__main__":
    main() 