#!/usr/bin/env python3
"""
Supabase Import Script for Primary School Data
Imports processed primary school data into Supabase database
"""

import json
import os
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
        logging.FileHandler('supabase_import.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SupabaseImportScript:
    """Handles importing data to Supabase"""
    
    def __init__(self):
        # Initialize Supabase client
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            logger.error("Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.")
            raise ValueError("Supabase credentials required")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        logger.info("Supabase client initialized successfully")
    
    def load_processed_data(self, json_file_path: str) -> List[Dict]:
        """Load processed data from JSON file"""
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            logger.info(f"Loaded {len(data)} schools from {json_file_path}")
            return data
            
        except Exception as e:
            logger.error(f"Error loading data from {json_file_path}: {e}")
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
        """Verify the import by counting records in Supabase"""
        try:
            result = self.supabase.table('primary_schools').select('school_no').execute()
            count = len(result.data)
            logger.info(f"Verified {count} schools in Supabase database")
            return count
            
        except Exception as e:
            logger.error(f"Error verifying import: {e}")
            return 0
    
    def run_import(self, json_file_path: str = None):
        """Run the complete import process"""
        logger.info("Starting Supabase import process...")
        
        # Find the latest processed data file if not specified
        if not json_file_path:
            csv_data_dir = Path("csv_data")
            if csv_data_dir.exists():
                json_files = list(csv_data_dir.glob("processed_primary_schools_*.json"))
                if json_files:
                    json_file_path = str(max(json_files, key=lambda x: x.stat().st_mtime))
                    logger.info(f"Using latest processed file: {json_file_path}")
                else:
                    logger.error("No processed data files found in csv_data directory")
                    return False
            else:
                logger.error("csv_data directory not found")
                return False
        
        # Load data
        schools = self.load_processed_data(json_file_path)
        
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

def create_env_file():
    """Create a template .env file for Supabase credentials"""
    env_content = """# Supabase Configuration
# Replace with your actual Supabase URL and anon key
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
"""
    
    env_file = Path(".env")
    if not env_file.exists():
        with open(env_file, 'w') as f:
            f.write(env_content)
        logger.info("Created .env template file. Please add your Supabase credentials.")
    else:
        logger.info(".env file already exists")

def load_env_file():
    """Load environment variables from .env file"""
    env_file = Path(".env")
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
        logger.info("Loaded environment variables from .env file")

def main():
    """Main function"""
    # Create .env file if it doesn't exist
    create_env_file()
    
    # Load environment variables
    load_env_file()
    
    try:
        # Run import
        importer = SupabaseImportScript()
        success = importer.run_import()
        
        if success:
            print("\n✅ Import completed successfully!")
            print("Your comprehensive Hong Kong primary school data has been imported to Supabase.")
        else:
            print("\n❌ Import failed. Please check the logs for details.")
            
    except ValueError as e:
        print(f"\n❌ Configuration error: {e}")
        print("Please set your Supabase credentials in the .env file")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        print("Please check the logs for details")

if __name__ == "__main__":
    main() 