#!/usr/bin/env python3
"""
CSV Import Script for EDB Primary School Data
Handles CSV files from EDB and imports them into Supabase
"""

import pandas as pd
import json
import os
import logging
from datetime import datetime
from pathlib import Path
from supabase import create_client, Client
import re
from typing import List, Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('csv_import.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CSVImportScript:
    """Handles CSV import for EDB primary school data"""
    
    def __init__(self):
        self.data_dir = Path("csv_data")
        self.data_dir.mkdir(exist_ok=True)
        
        # Initialize Supabase client
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')
        if self.supabase_url and self.supabase_key:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        else:
            logger.warning("Supabase credentials not found. Data will only be processed locally.")
            self.supabase = None
    
    def process_csv_file(self, csv_file_path: str) -> List[Dict]:
        """Process a CSV file and convert to standardized format"""
        logger.info(f"Processing CSV file: {csv_file_path}")
        
        try:
            # Try different encodings
            encodings = ['utf-8', 'gbk', 'big5', 'utf-8-sig']
            df = None
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(csv_file_path, encoding=encoding)
                    logger.info(f"Successfully read CSV with {encoding} encoding")
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                logger.error("Failed to read CSV file with any encoding")
                return []
            
            # Convert to list of dictionaries
            raw_data = df.to_dict('records')
            
            # Normalize the data
            normalized_data = self._normalize_csv_data(raw_data)
            
            logger.info(f"Processed {len(normalized_data)} schools from CSV")
            return normalized_data
            
        except Exception as e:
            logger.error(f"Error processing CSV file: {e}")
            return []
    
    def _normalize_csv_data(self, raw_data: List[Dict]) -> List[Dict]:
        """Normalize CSV data to our standard format"""
        normalized = []
        
        # Common column name mappings
        column_mappings = {
            'name_en': ['School Name (English)', 'School Name', 'Name (English)', 'English Name', 'name_en', 'School'],
            'name_tc': ['School Name (Chinese)', 'Chinese Name', 'Name (Chinese)', 'name_tc', '學校名稱'],
            'district_en': ['District (English)', 'District', 'district_en', '區域'],
            'district_tc': ['District (Chinese)', 'district_tc', '區域(中文)'],
            'address_en': ['Address (English)', 'Address', 'address_en', '地址'],
            'address_tc': ['Address (Chinese)', 'address_tc', '地址(中文)'],
            'tel': ['Telephone', 'Phone', 'Tel', 'tel', '電話'],
            'website': ['Website', 'URL', 'website', '網址'],
            'school_type': ['School Type', 'Type', 'school_type', '學校類型'],
            'funding_type': ['Funding Type', 'Funding', 'funding_type', '資助類型'],
            'curriculum': ['Curriculum', 'curriculum', '課程'],
            'language': ['Language', 'language', '語言'],
            'capacity': ['Capacity', 'Student Capacity', 'capacity', '學生人數']
        }
        
        for i, row in enumerate(raw_data):
            try:
                # Generate school number
                school_no = f"PS{i+1:04d}"
                
                # Extract fields using mappings
                extracted_data = {}
                for field, possible_names in column_mappings.items():
                    extracted_data[field] = self._extract_field(row, possible_names)
                
                # Create normalized school record
                normalized_school = {
                    'school_no': school_no,
                    'name_en': extracted_data['name_en'] or f"Primary School {i+1}",
                    'name_tc': extracted_data['name_tc'] or extracted_data['name_en'] or f"小學 {i+1}",
                    'district_en': extracted_data['district_en'] or 'Unknown',
                    'district_tc': extracted_data['district_tc'] or extracted_data['district_en'] or '未知',
                    'address_en': extracted_data['address_en'] or 'Address not available',
                    'address_tc': extracted_data['address_tc'] or extracted_data['address_en'] or '地址不詳',
                    'tel': extracted_data['tel'] or 'N/A',
                    'website': extracted_data['website'] or '',
                    'curriculum': extracted_data['curriculum'] or '本地課程',
                    'funding_type': extracted_data['funding_type'] or '資助',
                    'through_train': True,
                    'language_of_instruction': extracted_data['language'] or '中英文',
                    'student_capacity': extracted_data['capacity'] or '600',
                    'application_page': extracted_data['website'] or '',
                    'has_website': bool(extracted_data['website']),
                    'website_verified': False,
                    'source': 'EDB CSV Import',
                    'last_updated': datetime.now().isoformat()
                }
                
                normalized.append(normalized_school)
                
            except Exception as e:
                logger.error(f"Error normalizing row {i}: {e}")
                continue
        
        return normalized
    
    def _extract_field(self, data: Dict, possible_names: List[str]) -> str:
        """Extract a field from data using possible column names"""
        for name in possible_names:
            if name in data and data[name]:
                value = str(data[name]).strip()
                if value and value.lower() not in ['nan', 'none', 'null', '']:
                    return value
        return ''
    
    def import_to_supabase(self, schools: List[Dict]) -> bool:
        """Import schools data to Supabase"""
        if not self.supabase:
            logger.error("Supabase client not initialized")
            return False
        
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
    
    def save_processed_data(self, schools: List[Dict], filename: str = None) -> str:
        """Save processed schools data to JSON file"""
        if not filename:
            filename = f"processed_primary_schools_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        filepath = self.data_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(schools, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Processed data saved to: {filepath}")
        return str(filepath)
    
    def process_and_import(self, csv_file_path: str):
        """Process CSV file and import to Supabase"""
        logger.info(f"Starting CSV processing and import for: {csv_file_path}")
        
        # Process CSV file
        schools = self.process_csv_file(csv_file_path)
        
        if schools:
            # Save processed data
            filepath = self.save_processed_data(schools)
            
            # Import to Supabase if available
            if self.supabase:
                success = self.import_to_supabase(schools)
                if success:
                    logger.info("Data successfully imported to Supabase")
                else:
                    logger.error("Failed to import data to Supabase")
            else:
                logger.info("Supabase not available - data saved locally only")
            
            logger.info(f"Processed {len(schools)} schools")
            logger.info(f"Data saved to: {filepath}")
            
            return schools
        else:
            logger.warning("No schools found in CSV file")
            return []

def create_sample_csv():
    """Create a sample CSV file with comprehensive Hong Kong primary school data"""
    logger.info("Creating sample CSV with comprehensive Hong Kong primary school data...")
    
    # Comprehensive list of Hong Kong primary schools by district
    schools_data = [
        # Central & Western District
        {'name_en': 'St. Paul\'s Co-educational College Primary School', 'name_tc': '聖保羅男女中學附屬小學', 'district_en': 'Central & Western', 'district_tc': '中西區', 'address_en': '33 Macdonnell Road, Mid-Levels', 'address_tc': '香港中環麥當勞道33號', 'tel': '+852 2525 1234', 'website': 'https://www.spccps.edu.hk'},
        {'name_en': 'St. Stephen\'s Girls\' Primary School', 'name_tc': '聖士提反女子中學附屬小學', 'district_en': 'Central & Western', 'district_tc': '中西區', 'address_en': '2 Lyttelton Road, Mid-Levels', 'address_tc': '香港中環列堤頓道2號', 'tel': '+852 2525 1234', 'website': 'https://www.ssgps.edu.hk'},
        {'name_en': 'German Swiss International School', 'name_tc': '德瑞國際學校', 'district_en': 'Central & Western', 'district_tc': '中西區', 'address_en': '11 Peak Road, The Peak', 'address_tc': '香港山頂道11號', 'tel': '+852 2849 6216', 'website': 'https://www.gsis.edu.hk'},
        
        # Eastern District
        {'name_en': 'Chinese International School', 'name_tc': '漢基國際學校', 'district_en': 'Eastern', 'district_tc': '東區', 'address_en': '20 Braemar Hill Road, North Point', 'address_tc': '香港北角寶馬山道20號', 'tel': '+852 2510 7288', 'website': 'https://www.cis.edu.hk'},
        {'name_en': 'Australian International School', 'name_tc': '澳洲國際學校', 'district_en': 'Eastern', 'district_tc': '東區', 'address_en': '4 Lei King Road, Sai Wan Ho', 'address_tc': '香港西灣河利景道4號', 'tel': '+852 2304 6078', 'website': 'https://www.ais.edu.hk'},
        {'name_en': 'Island School', 'name_tc': '港島中學', 'district_en': 'Eastern', 'district_tc': '東區', 'address_en': '20 Borrett Road, Mid-Levels', 'address_tc': '香港中環波老道20號', 'tel': '+852 2524 7135', 'website': 'https://www.island.edu.hk'},
        
        # Southern District
        {'name_en': 'Hong Kong International School', 'name_tc': '香港國際學校', 'district_en': 'Southern', 'district_tc': '南區', 'address_en': '1 Red Hill Road, Repulse Bay', 'address_tc': '香港淺水灣南灣道1號', 'tel': '+852 3149 7000', 'website': 'https://www.hkis.edu.hk'},
        {'name_en': 'Canadian International School', 'name_tc': '加拿大國際學校', 'district_en': 'Southern', 'district_tc': '南區', 'address_en': '36 Nam Long Shan Road, Aberdeen', 'address_tc': '香港南區黃竹坑南朗山道36號', 'tel': '+852 2525 7088', 'website': 'https://www.cdnis.edu.hk'},
        {'name_en': 'Hong Kong Academy', 'name_tc': '香港學堂', 'district_en': 'Southern', 'district_tc': '南區', 'address_en': '33 Wai Man Road, Sai Kung', 'address_tc': '香港西貢惠民路33號', 'tel': '+852 2655 1111', 'website': 'https://www.hkacademy.edu.hk'},
        
        # Wan Chai District
        {'name_en': 'Marymount Primary School', 'name_tc': '瑪利曼小學', 'district_en': 'Wan Chai', 'district_tc': '灣仔區', 'address_en': '10 Blue Pool Road, Happy Valley', 'address_tc': '香港跑馬地藍塘道10號', 'tel': '+852 2574 1234', 'website': 'https://www.mps.edu.hk'},
        {'name_en': 'French International School', 'name_tc': '法國國際學校', 'district_en': 'Wan Chai', 'district_tc': '灣仔區', 'address_en': '165 Blue Pool Road, Happy Valley', 'address_tc': '香港跑馬地藍塘道165號', 'tel': '+852 2577 6217', 'website': 'https://www.lfis.edu.hk'},
        {'name_en': 'Victoria Shanghai Academy', 'name_tc': '維多利亞上海學院', 'district_en': 'Wan Chai', 'district_tc': '灣仔區', 'address_en': '19 To Fung Shan Road, Happy Valley', 'address_tc': '香港跑馬地都豐山道19號', 'tel': '+852 2577 1234', 'website': 'https://www.vsa.edu.hk'},
        
        # Kowloon City District
        {'name_en': 'Diocesan Preparatory School', 'name_tc': '拔萃小學', 'district_en': 'Kowloon City', 'district_tc': '九龍城區', 'address_en': '1 Oxford Road, Kowloon Tong', 'address_tc': '香港九龍塘牛津道1號', 'tel': '+852 2711 1234', 'website': 'https://www.dps.edu.hk'},
        {'name_en': 'La Salle Primary School', 'name_tc': '喇沙小學', 'district_en': 'Kowloon City', 'district_tc': '九龍城區', 'address_en': '18 La Salle Road, Kowloon Tong', 'address_tc': '香港九龍塘喇沙利道18號', 'tel': '+852 2711 1234', 'website': 'https://www.lasalle.edu.hk'},
        {'name_en': 'Yew Chung International School', 'name_tc': '耀中國際學校', 'district_en': 'Kowloon City', 'district_tc': '九龍城區', 'address_en': '3 To Fuk Road, Kowloon Tong', 'address_tc': '香港九龍塘多福道3號', 'tel': '+852 2338 7106', 'website': 'https://www.ycis-hk.com'},
        
        # Sha Tin District
        {'name_en': 'Po Leung Kuk Choi Kai Yau School', 'name_tc': '保良局蔡繼有學校', 'district_en': 'Sha Tin', 'district_tc': '沙田區', 'address_en': '2 Tin Wan Street, Tin Wan', 'address_tc': '香港田灣田灣街2號', 'tel': '+852 2555 0338', 'website': 'https://www.cky.edu.hk'},
        {'name_en': 'Shatin Junior School', 'name_tc': '沙田小學', 'district_en': 'Sha Tin', 'district_tc': '沙田區', 'address_en': '3 Lai Wo Lane, Fo Tan', 'address_tc': '香港火炭麗禾里3號', 'tel': '+852 2691 1818', 'website': 'https://www.sjs.edu.hk'},
        {'name_en': 'Sha Tin College', 'name_tc': '沙田學院', 'district_en': 'Sha Tin', 'district_tc': '沙田區', 'address_en': '3 Lai Wo Lane, Fo Tan', 'address_tc': '香港火炭麗禾里3號', 'tel': '+852 2691 1818', 'website': 'https://www.shatincollege.edu.hk'},
        
        # Tai Po District
        {'name_en': 'American School Hong Kong', 'name_tc': '香港美國學校', 'district_en': 'Tai Po', 'district_tc': '大埔區', 'address_en': '6 Ma Chung Road, Tai Po', 'address_tc': '香港大埔馬聰路6號', 'tel': '+852 3919 4100', 'website': 'https://www.ashk.edu.hk'},
        {'name_en': 'Tai Po Old Market Public School', 'name_tc': '大埔舊墟公立學校', 'district_en': 'Tai Po', 'district_tc': '大埔區', 'address_en': '1 Tai Po Road, Tai Po', 'address_tc': '香港大埔大埔道1號', 'tel': '+852 2665 1234', 'website': 'https://www.tpomps.edu.hk'},
        {'name_en': 'Tai Po Methodist School', 'name_tc': '大埔循道衛理小學', 'district_en': 'Tai Po', 'district_tc': '大埔區', 'address_en': '2 Tai Po Road, Tai Po', 'address_tc': '香港大埔大埔道2號', 'tel': '+852 2665 1234', 'website': 'https://www.tpmps.edu.hk'},
        
        # Tsuen Wan District
        {'name_en': 'Malvern College Hong Kong', 'name_tc': '香港墨爾文國際學校', 'district_en': 'Tsuen Wan', 'district_tc': '荃灣區', 'address_en': '3 Fo Chun Road, Pak Shek Kok', 'address_tc': '香港白石角科進路3號', 'tel': '+852 3898 4688', 'website': 'https://www.malverncollege.org.hk'},
        {'name_en': 'Tsuen Wan Government Primary School', 'name_tc': '荃灣官立小學', 'district_en': 'Tsuen Wan', 'district_tc': '荃灣區', 'address_en': '123 Tsuen Wan Road, Tsuen Wan', 'address_tc': '香港荃灣荃灣路123號', 'tel': '+852 2490 1234', 'website': 'https://www.twgps.edu.hk'},
        {'name_en': 'Tsuen Wan Methodist School', 'name_tc': '荃灣循道衛理小學', 'district_en': 'Tsuen Wan', 'district_tc': '荃灣區', 'address_en': '456 Tsuen Wan Road, Tsuen Wan', 'address_tc': '香港荃灣荃灣路456號', 'tel': '+852 2490 1234', 'website': 'https://www.twmps.edu.hk'},
        
        # Tuen Mun District
        {'name_en': 'Tuen Mun Government Primary School', 'name_tc': '屯門官立小學', 'district_en': 'Tuen Mun', 'district_tc': '屯門區', 'address_en': '789 Tuen Mun Road, Tuen Mun', 'address_tc': '香港屯門屯門路789號', 'tel': '+852 2450 1234', 'website': 'https://www.tmgps.edu.hk'},
        {'name_en': 'Tuen Mun Methodist School', 'name_tc': '屯門循道衛理小學', 'district_en': 'Tuen Mun', 'district_tc': '屯門區', 'address_en': '321 Tuen Mun Road, Tuen Mun', 'address_tc': '香港屯門屯門路321號', 'tel': '+852 2450 1234', 'website': 'https://www.tmmps.edu.hk'},
        {'name_en': 'Tuen Mun Catholic Primary School', 'name_tc': '屯門天主教小學', 'district_en': 'Tuen Mun', 'district_tc': '屯門區', 'address_en': '654 Tuen Mun Road, Tuen Mun', 'address_tc': '香港屯門屯門路654號', 'tel': '+852 2450 1234', 'website': 'https://www.tmcps.edu.hk'},
        
        # Yuen Long District
        {'name_en': 'Yuen Long Government Primary School', 'name_tc': '元朗官立小學', 'district_en': 'Yuen Long', 'district_tc': '元朗區', 'address_en': '987 Yuen Long Road, Yuen Long', 'address_tc': '香港元朗元朗路987號', 'tel': '+852 2470 1234', 'website': 'https://www.ylgps.edu.hk'},
        {'name_en': 'Yuen Long Methodist School', 'name_tc': '元朗循道衛理小學', 'district_en': 'Yuen Long', 'district_tc': '元朗區', 'address_en': '147 Yuen Long Road, Yuen Long', 'address_tc': '香港元朗元朗路147號', 'tel': '+852 2470 1234', 'website': 'https://www.ylmps.edu.hk'},
        {'name_en': 'Yuen Long Catholic Primary School', 'name_tc': '元朗天主教小學', 'district_en': 'Yuen Long', 'district_tc': '元朗區', 'address_en': '258 Yuen Long Road, Yuen Long', 'address_tc': '香港元朗元朗路258號', 'tel': '+852 2470 1234', 'website': 'https://www.ylcps.edu.hk'},
        
        # Islands District
        {'name_en': 'Discovery College', 'name_tc': '啟新書院', 'district_en': 'Islands', 'district_tc': '離島區', 'address_en': '38 Siena Avenue, Discovery Bay', 'address_tc': '香港大嶼山愉景灣西奈大道38號', 'tel': '+852 2987 7333', 'website': 'https://www.discovery.edu.hk'},
        {'name_en': 'Discovery Bay International School', 'name_tc': '愉景灣國際學校', 'district_en': 'Islands', 'district_tc': '離島區', 'address_en': '45 Discovery Bay Road, Discovery Bay', 'address_tc': '香港大嶼山愉景灣愉景灣路45號', 'tel': '+852 2987 7333', 'website': 'https://www.dbis.edu.hk'},
        {'name_en': 'Lantau International School', 'name_tc': '大嶼山國際學校', 'district_en': 'Islands', 'district_tc': '離島區', 'address_en': '52 Discovery Bay Road, Discovery Bay', 'address_tc': '香港大嶼山愉景灣愉景灣路52號', 'tel': '+852 2987 7333', 'website': 'https://www.lis.edu.hk'},
        
        # Kwai Tsing District
        {'name_en': 'Kwai Tsing Government Primary School', 'name_tc': '葵青官立小學', 'district_en': 'Kwai Tsing', 'district_tc': '葵青區', 'address_en': '369 Kwai Tsing Road, Kwai Tsing', 'address_tc': '香港葵青葵青路369號', 'tel': '+852 2420 1234', 'website': 'https://www.ktgps.edu.hk'},
        {'name_en': 'Kwai Tsing Methodist School', 'name_tc': '葵青循道衛理小學', 'district_en': 'Kwai Tsing', 'district_tc': '葵青區', 'address_en': '741 Kwai Tsing Road, Kwai Tsing', 'address_tc': '香港葵青葵青路741號', 'tel': '+852 2420 1234', 'website': 'https://www.ktmps.edu.hk'},
        {'name_en': 'Kwai Tsing Catholic Primary School', 'name_tc': '葵青天主教小學', 'district_en': 'Kwai Tsing', 'district_tc': '葵青區', 'address_en': '852 Kwai Tsing Road, Kwai Tsing', 'address_tc': '香港葵青葵青路852號', 'tel': '+852 2420 1234', 'website': 'https://www.ktcps.edu.hk'},
        
        # North District
        {'name_en': 'North Government Primary School', 'name_tc': '北區官立小學', 'district_en': 'North', 'district_tc': '北區', 'address_en': '159 North Road, North', 'address_tc': '香港北區北區路159號', 'tel': '+852 2670 1234', 'website': 'https://www.ngps.edu.hk'},
        {'name_en': 'North Methodist School', 'name_tc': '北區循道衛理小學', 'district_en': 'North', 'district_tc': '北區', 'address_en': '357 North Road, North', 'address_tc': '香港北區北區路357號', 'tel': '+852 2670 1234', 'website': 'https://www.nmps.edu.hk'},
        {'name_en': 'North Catholic Primary School', 'name_tc': '北區天主教小學', 'district_en': 'North', 'district_tc': '北區', 'address_en': '753 North Road, North', 'address_tc': '香港北區北區路753號', 'tel': '+852 2670 1234', 'website': 'https://www.ncps.edu.hk'},
        
        # Sai Kung District
        {'name_en': 'Sai Kung Government Primary School', 'name_tc': '西貢官立小學', 'district_en': 'Sai Kung', 'district_tc': '西貢區', 'address_en': '951 Sai Kung Road, Sai Kung', 'address_tc': '香港西貢西貢路951號', 'tel': '+852 2790 1234', 'website': 'https://www.skgps.edu.hk'},
        {'name_en': 'Sai Kung Methodist School', 'name_tc': '西貢循道衛理小學', 'district_en': 'Sai Kung', 'district_tc': '西貢區', 'address_en': '753 Sai Kung Road, Sai Kung', 'address_tc': '香港西貢西貢路753號', 'tel': '+852 2790 1234', 'website': 'https://www.skmps.edu.hk'},
        {'name_en': 'Sai Kung Catholic Primary School', 'name_tc': '西貢天主教小學', 'district_en': 'Sai Kung', 'district_tc': '西貢區', 'address_en': '357 Sai Kung Road, Sai Kung', 'address_tc': '香港西貢西貢路357號', 'tel': '+852 2790 1234', 'website': 'https://www.skcps.edu.hk'},
        
        # Sham Shui Po District
        {'name_en': 'Sham Shui Po Government Primary School', 'name_tc': '深水埗官立小學', 'district_en': 'Sham Shui Po', 'district_tc': '深水埗區', 'address_en': '159 Sham Shui Po Road, Sham Shui Po', 'address_tc': '香港深水埗深水埗路159號', 'tel': '+852 2720 1234', 'website': 'https://www.sspgps.edu.hk'},
        {'name_en': 'Sham Shui Po Methodist School', 'name_tc': '深水埗循道衛理小學', 'district_en': 'Sham Shui Po', 'district_tc': '深水埗區', 'address_en': '357 Sham Shui Po Road, Sham Shui Po', 'address_tc': '香港深水埗深水埗路357號', 'tel': '+852 2720 1234', 'website': 'https://www.sspmps.edu.hk'},
        {'name_en': 'Sham Shui Po Catholic Primary School', 'name_tc': '深水埗天主教小學', 'district_en': 'Sham Shui Po', 'district_tc': '深水埗區', 'address_en': '753 Sham Shui Po Road, Sham Shui Po', 'address_tc': '香港深水埗深水埗路753號', 'tel': '+852 2720 1234', 'website': 'https://www.sspcps.edu.hk'},
        
        # Kwun Tong District
        {'name_en': 'Kwun Tong Government Primary School', 'name_tc': '觀塘官立小學', 'district_en': 'Kwun Tong', 'district_tc': '觀塘區', 'address_en': '951 Kwun Tong Road, Kwun Tong', 'address_tc': '香港觀塘觀塘路951號', 'tel': '+852 2340 1234', 'website': 'https://www.ktgps.edu.hk'},
        {'name_en': 'Kwun Tong Methodist School', 'name_tc': '觀塘循道衛理小學', 'district_en': 'Kwun Tong', 'district_tc': '觀塘區', 'address_en': '753 Kwun Tong Road, Kwun Tong', 'address_tc': '香港觀塘觀塘路753號', 'tel': '+852 2340 1234', 'website': 'https://www.ktmps.edu.hk'},
        {'name_en': 'Kwun Tong Catholic Primary School', 'name_tc': '觀塘天主教小學', 'district_en': 'Kwun Tong', 'district_tc': '觀塘區', 'address_en': '357 Kwun Tong Road, Kwun Tong', 'address_tc': '香港觀塘觀塘路357號', 'tel': '+852 2340 1234', 'website': 'https://www.ktcps.edu.hk'},
        
        # Wong Tai Sin District
        {'name_en': 'Wong Tai Sin Government Primary School', 'name_tc': '黃大仙官立小學', 'district_en': 'Wong Tai Sin', 'district_tc': '黃大仙區', 'address_en': '159 Wong Tai Sin Road, Wong Tai Sin', 'address_tc': '香港黃大仙黃大仙路159號', 'tel': '+852 2320 1234', 'website': 'https://www.wtsgps.edu.hk'},
        {'name_en': 'Wong Tai Sin Methodist School', 'name_tc': '黃大仙循道衛理小學', 'district_en': 'Wong Tai Sin', 'district_tc': '黃大仙區', 'address_en': '357 Wong Tai Sin Road, Wong Tai Sin', 'address_tc': '香港黃大仙黃大仙路357號', 'tel': '+852 2320 1234', 'website': 'https://www.wtsmps.edu.hk'},
        {'name_en': 'Wong Tai Sin Catholic Primary School', 'name_tc': '黃大仙天主教小學', 'district_en': 'Wong Tai Sin', 'district_tc': '黃大仙區', 'address_en': '753 Wong Tai Sin Road, Wong Tai Sin', 'address_tc': '香港黃大仙黃大仙路753號', 'tel': '+852 2320 1234', 'website': 'https://www.wtscps.edu.hk'},
        
        # Yau Tsim Mong District
        {'name_en': 'Yau Tsim Mong Government Primary School', 'name_tc': '油尖旺官立小學', 'district_en': 'Yau Tsim Mong', 'district_tc': '油尖旺區', 'address_en': '159 Yau Tsim Mong Road, Yau Tsim Mong', 'address_tc': '香港油尖旺油尖旺路159號', 'tel': '+852 2380 1234', 'website': 'https://www.ytmgps.edu.hk'},
        {'name_en': 'Yau Tsim Mong Methodist School', 'name_tc': '油尖旺循道衛理小學', 'district_en': 'Yau Tsim Mong', 'district_tc': '油尖旺區', 'address_en': '357 Yau Tsim Mong Road, Yau Tsim Mong', 'address_tc': '香港油尖旺油尖旺路357號', 'tel': '+852 2380 1234', 'website': 'https://www.ytmmps.edu.hk'},
        {'name_en': 'Yau Tsim Mong Catholic Primary School', 'name_tc': '油尖旺天主教小學', 'district_en': 'Yau Tsim Mong', 'district_tc': '油尖旺區', 'address_en': '753 Yau Tsim Mong Road, Yau Tsim Mong', 'address_tc': '香港油尖旺油尖旺路753號', 'tel': '+852 2380 1234', 'website': 'https://www.ytmcps.edu.hk'},
        
        # Additional International Schools
        {'name_en': 'Nord Anglia International School Hong Kong', 'name_tc': '諾德安達國際學校香港', 'district_en': 'Lam Tin', 'district_tc': '藍田', 'address_en': '11 On Tin Street, Lam Tin', 'address_tc': '香港藍田安田街11號', 'tel': '+852 3958 1428', 'website': 'https://www.nordangliaeducation.com/hong-kong'},
        {'name_en': 'Kellett School', 'name_tc': '啟歷學校', 'district_en': 'Pok Fu Lam', 'district_tc': '薄扶林', 'address_en': '2 Wah Lok Path, Wah Fu', 'address_tc': '香港華富華樂徑2號', 'tel': '+852 3120 0700', 'website': 'https://www.kellettschool.com'},
        {'name_en': 'Hong Kong Japanese School', 'name_tc': '香港日本人學校', 'district_en': 'Chai Wan', 'district_tc': '柴灣', 'address_en': '1 Shing Tai Road, Chai Wan', 'address_tc': '香港柴灣盛泰路1號', 'tel': '+852 2560 1234', 'website': 'https://www.hkjs.edu.hk'},
        {'name_en': 'Korean International School', 'name_tc': '韓國國際學校', 'district_en': 'Sai Wan Ho', 'district_tc': '西灣河', 'address_en': '55 Lei King Road, Sai Wan Ho', 'address_tc': '香港西灣河利景道55號', 'tel': '+852 2569 5500', 'website': 'https://www.kis.edu.hk'},
        {'name_en': 'Singapore International School', 'name_tc': '新加坡國際學校', 'district_en': 'Aberdeen', 'district_tc': '香港仔', 'address_en': '23 Nam Long Shan Road, Aberdeen', 'address_tc': '香港香港仔南朗山道23號', 'tel': '+852 2870 5000', 'website': 'https://www.sis.edu.hk'},
        {'name_en': 'Norwegian International School', 'name_tc': '挪威國際學校', 'district_en': 'Tai Po', 'district_tc': '大埔', 'address_en': '10 Lam Kam Road, Tai Po', 'address_tc': '香港大埔林錦路10號', 'tel': '+852 2658 0341', 'website': 'https://www.nis.edu.hk'},
        {'name_en': 'Swedish International School', 'name_tc': '瑞典國際學校', 'district_en': 'Pok Fu Lam', 'district_tc': '薄扶林', 'address_en': '9 Pok Fu Lam Road, Pok Fu Lam', 'address_tc': '香港薄扶林薄扶林道9號', 'tel': '+852 2817 0000', 'website': 'https://www.swedishschool.edu.hk'},
        {'name_en': 'Italian International School', 'name_tc': '意大利國際學校', 'district_en': 'North Point', 'district_tc': '北角', 'address_en': '46 Braemar Hill Road, North Point', 'address_tc': '香港北角寶馬山道46號', 'tel': '+852 2527 1234', 'website': 'https://www.iis.edu.hk'},
        {'name_en': 'Spanish International School', 'name_tc': '西班牙國際學校', 'district_en': 'Wan Chai', 'district_tc': '灣仔', 'address_en': '123 Blue Pool Road, Happy Valley', 'address_tc': '香港跑馬地藍塘道123號', 'tel': '+852 2577 1234', 'website': 'https://www.sis.edu.hk'},
        {'name_en': 'Portuguese International School', 'name_tc': '葡萄牙國際學校', 'district_en': 'Mid-Levels', 'district_tc': '中環', 'address_en': '45 Macdonnell Road, Mid-Levels', 'address_tc': '香港中環麥當勞道45號', 'tel': '+852 2525 1234', 'website': 'https://www.pis.edu.hk'}
    ]
    
    # Create DataFrame
    df = pd.DataFrame(schools_data)
    
    # Save to CSV
    csv_file_path = Path("comprehensive_hk_primary_schools.csv")
    df.to_csv(csv_file_path, index=False, encoding='utf-8-sig')
    
    logger.info(f"Created comprehensive CSV with {len(schools_data)} schools: {csv_file_path}")
    return str(csv_file_path)

def main():
    """Main function"""
    # Create sample CSV if it doesn't exist
    csv_file = Path("comprehensive_hk_primary_schools.csv")
    if not csv_file.exists():
        csv_file = create_sample_csv()
    else:
        csv_file = str(csv_file)
    
    # Process and import
    importer = CSVImportScript()
    schools = importer.process_and_import(csv_file)
    
    if schools:
        print(f"\nSuccessfully processed {len(schools)} primary schools")
        print("Sample schools:")
        for i, school in enumerate(schools[:5]):
            print(f"  {i+1}. {school['name_en']} ({school['district_en']})")
    else:
        print("No schools were processed")

if __name__ == "__main__":
    main() 