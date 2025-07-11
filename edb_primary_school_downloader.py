#!/usr/bin/env python3
"""
EDB Primary School Data Downloader
Downloads comprehensive primary school data from EDB website for all districts
and imports it into Supabase database
"""

import requests
import pandas as pd
import json
import os
import time
import logging
from datetime import datetime
from bs4 import BeautifulSoup
import re
from typing import List, Dict, Optional
from pathlib import Path
import random
from supabase import create_client, Client
import urllib.parse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('edb_downloader.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EDBPrimarySchoolDownloader:
    """Downloads primary school data from EDB website"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.data_dir = Path("edb_data")
        self.data_dir.mkdir(exist_ok=True)
        
        # EDB website URLs
        self.base_url = "https://www.edb.gov.hk"
        self.primary_school_url = "https://www.edb.gov.hk/en/edu-system/primary-secondary/applicable-to-primary/primary-1-admission/school-lists/"
        
        # Hong Kong districts
        self.districts = {
            'Central & Western': '中西區',
            'Eastern': '東區',
            'Southern': '南區',
            'Wan Chai': '灣仔區',
            'Sham Shui Po': '深水埗區',
            'Kowloon City': '九龍城區',
            'Kwun Tong': '觀塘區',
            'Wong Tai Sin': '黃大仙區',
            'Yau Tsim Mong': '油尖旺區',
            'Islands': '離島區',
            'Kwai Tsing': '葵青區',
            'North': '北區',
            'Sai Kung': '西貢區',
            'Sha Tin': '沙田區',
            'Tai Po': '大埔區',
            'Tsuen Wan': '荃灣區',
            'Tuen Mun': '屯門區',
            'Yuen Long': '元朗區'
        }
        
        # Initialize Supabase client
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')
        if self.supabase_url and self.supabase_key:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        else:
            logger.warning("Supabase credentials not found. Data will only be saved locally.")
            self.supabase = None
    
    def download_all_district_data(self) -> List[Dict]:
        """Download primary school data for all districts"""
        logger.info("Starting download of primary school data for all districts...")
        
        all_schools = []
        
        # First, try to get the main school list page
        try:
            main_schools = self._download_main_school_list()
            if main_schools:
                all_schools.extend(main_schools)
                logger.info(f"Downloaded {len(main_schools)} schools from main list")
        except Exception as e:
            logger.error(f"Error downloading main school list: {e}")
        
        # Try district-specific downloads
        for district_en, district_tc in self.districts.items():
            try:
                logger.info(f"Downloading data for {district_en}...")
                district_schools = self._download_district_data(district_en, district_tc)
                if district_schools:
                    all_schools.extend(district_schools)
                    logger.info(f"Downloaded {len(district_schools)} schools from {district_en}")
                time.sleep(random.uniform(2, 4))  # Be respectful
            except Exception as e:
                logger.error(f"Error downloading data for {district_en}: {e}")
                continue
        
        # Remove duplicates
        unique_schools = self._remove_duplicates(all_schools)
        logger.info(f"Total unique schools found: {len(unique_schools)}")
        
        return unique_schools
    
    def _download_main_school_list(self) -> List[Dict]:
        """Download the main primary school list from EDB"""
        schools = []
        
        try:
            # Try different EDB URLs for primary school data
            urls_to_try = [
                "https://www.edb.gov.hk/en/edu-system/primary-secondary/applicable-to-primary/primary-1-admission/school-lists/",
                "https://www.edb.gov.hk/en/edu-system/primary-secondary/applicable-to-primary/primary-1-admission/",
                "https://www.edb.gov.hk/en/edu-system/primary-secondary/applicable-to-primary/",
                "https://www.edb.gov.hk/en/edu-system/primary-secondary/"
            ]
            
            for url in urls_to_try:
                try:
                    logger.info(f"Trying URL: {url}")
                    response = self.session.get(url, timeout=30)
                    response.raise_for_status()
                    
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Look for CSV download links
                    csv_links = soup.find_all('a', href=re.compile(r'\.csv|\.xlsx|\.xls'))
                    if csv_links:
                        for link in csv_links:
                            csv_url = link.get('href')
                            if not csv_url.startswith('http'):
                                csv_url = self.base_url + csv_url
                            
                            logger.info(f"Found CSV link: {csv_url}")
                            csv_schools = self._download_csv_file(csv_url)
                            if csv_schools:
                                schools.extend(csv_schools)
                                break
                    
                    # Look for school tables
                    table_schools = self._extract_from_tables(soup)
                    if table_schools:
                        schools.extend(table_schools)
                        break
                    
                    # Look for school links
                    link_schools = self._extract_from_links(soup)
                    if link_schools:
                        schools.extend(link_schools)
                        break
                        
                except Exception as e:
                    logger.debug(f"Failed to access {url}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error downloading main school list: {e}")
        
        return schools
    
    def _download_district_data(self, district_en: str, district_tc: str) -> List[Dict]:
        """Download data for a specific district"""
        schools = []
        
        try:
            # Try district-specific URLs
            district_urls = [
                f"https://www.edb.gov.hk/en/edu-system/primary-secondary/applicable-to-primary/primary-1-admission/school-lists/?district={district_en}",
                f"https://www.edb.gov.hk/en/edu-system/primary-secondary/applicable-to-primary/primary-1-admission/school-lists/?district={district_tc}",
                f"https://www.edb.gov.hk/en/edu-system/primary-secondary/applicable-to-primary/primary-1-admission/?district={district_en}",
                f"https://www.edb.gov.hk/en/edu-system/primary-secondary/applicable-to-primary/primary-1-admission/?district={district_tc}"
            ]
            
            for url in district_urls:
                try:
                    response = self.session.get(url, timeout=30)
                    response.raise_for_status()
                    
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Extract schools from this district page
                    district_schools = self._extract_from_tables(soup)
                    district_schools.extend(self._extract_from_links(soup))
                    
                    # Add district information
                    for school in district_schools:
                        school['district_en'] = district_en
                        school['district_tc'] = district_tc
                    
                    schools.extend(district_schools)
                    
                    if schools:
                        break
                        
                except Exception as e:
                    logger.debug(f"Failed to access district URL {url}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error downloading district data for {district_en}: {e}")
        
        return schools
    
    def _download_csv_file(self, csv_url: str) -> List[Dict]:
        """Download and parse a CSV file"""
        schools = []
        
        try:
            logger.info(f"Downloading CSV from: {csv_url}")
            response = self.session.get(csv_url, timeout=60)
            response.raise_for_status()
            
            # Save the CSV file
            filename = f"edb_primary_schools_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            filepath = self.data_dir / filename
            
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            logger.info(f"CSV saved to: {filepath}")
            
            # Parse CSV
            try:
                df = pd.read_csv(filepath, encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(filepath, encoding='gbk')
            
            # Convert to list of dictionaries
            schools = df.to_dict('records')
            
            # Normalize the data
            schools = self._normalize_csv_data(schools)
            
            logger.info(f"Parsed {len(schools)} schools from CSV")
            
        except Exception as e:
            logger.error(f"Error downloading CSV from {csv_url}: {e}")
        
        return schools
    
    def _normalize_csv_data(self, schools: List[Dict]) -> List[Dict]:
        """Normalize CSV data to our standard format"""
        normalized = []
        
        for i, school in enumerate(schools):
            try:
                # Generate school number
                school_no = f"PS{i+1:04d}"
                
                # Extract school name (try different possible column names)
                name_en = self._extract_field(school, ['School Name (English)', 'School Name', 'Name (English)', 'English Name', 'name_en'])
                name_tc = self._extract_field(school, ['School Name (Chinese)', 'Chinese Name', 'Name (Chinese)', 'name_tc'])
                
                # Extract district
                district_en = self._extract_field(school, ['District (English)', 'District', 'district_en'])
                district_tc = self._extract_field(school, ['District (Chinese)', 'district_tc'])
                
                # Extract address
                address_en = self._extract_field(school, ['Address (English)', 'Address', 'address_en'])
                address_tc = self._extract_field(school, ['Address (Chinese)', 'address_tc'])
                
                # Extract phone
                tel = self._extract_field(school, ['Telephone', 'Phone', 'Tel', 'tel'])
                
                # Extract website
                website = self._extract_field(school, ['Website', 'URL', 'website'])
                
                normalized_school = {
                    'school_no': school_no,
                    'name_en': name_en or f"Primary School {i+1}",
                    'name_tc': name_tc or name_en or f"小學 {i+1}",
                    'district_en': district_en or 'Unknown',
                    'district_tc': district_tc or district_en or '未知',
                    'address_en': address_en or 'Address not available',
                    'address_tc': address_tc or address_en or '地址不詳',
                    'tel': tel or 'N/A',
                    'website': website or '',
                    'curriculum': '本地課程',
                    'funding_type': '資助',
                    'through_train': True,
                    'language_of_instruction': '中英文',
                    'student_capacity': '600',
                    'application_page': website or '',
                    'has_website': bool(website),
                    'website_verified': bool(website),
                    'source': 'EDB CSV Download',
                    'last_updated': datetime.now().isoformat()
                }
                
                normalized.append(normalized_school)
                
            except Exception as e:
                logger.error(f"Error normalizing school data: {e}")
                continue
        
        return normalized
    
    def _extract_field(self, data: Dict, possible_names: List[str]) -> str:
        """Extract a field from data using possible column names"""
        for name in possible_names:
            if name in data and data[name]:
                return str(data[name]).strip()
        return ''
    
    def _extract_from_tables(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract school data from HTML tables"""
        schools = []
        
        try:
            tables = soup.find_all('table')
            
            for table in tables:
                rows = table.find_all('tr')
                
                for row in rows[1:]:  # Skip header row
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 3:
                        school_data = self._parse_table_row(cells)
                        if school_data:
                            schools.append(school_data)
            
        except Exception as e:
            logger.error(f"Error extracting from tables: {e}")
        
        return schools
    
    def _extract_from_links(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract school data from links"""
        schools = []
        
        try:
            links = soup.find_all('a', href=True)
            
            for link in links:
                href = link.get('href', '')
                text = link.get_text(strip=True)
                
                # Check if this looks like a school link
                if self._is_school_link(href, text):
                    school_data = self._parse_school_link(link)
                    if school_data:
                        schools.append(school_data)
            
        except Exception as e:
            logger.error(f"Error extracting from links: {e}")
        
        return schools
    
    def _parse_table_row(self, cells) -> Optional[Dict]:
        """Parse a table row into school data"""
        try:
            if len(cells) < 2:
                return None
            
            # Extract school name from first cell
            name_text = cells[0].get_text(strip=True)
            if not name_text or len(name_text) < 2:
                return None
            
            # Generate school number
            school_no = f"PS{hash(name_text) % 10000:04d}"
            
            return {
                'school_no': school_no,
                'name_en': name_text,
                'name_tc': name_text,
                'district_en': 'Unknown',
                'district_tc': '未知',
                'address_en': 'Address not available',
                'address_tc': '地址不詳',
                'tel': 'N/A',
                'website': '',
                'curriculum': '本地課程',
                'funding_type': '資助',
                'through_train': True,
                'language_of_instruction': '中英文',
                'student_capacity': '600',
                'application_page': '',
                'has_website': False,
                'website_verified': False,
                'source': 'EDB Table Extraction',
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.debug(f"Error parsing table row: {e}")
            return None
    
    def _parse_school_link(self, link) -> Optional[Dict]:
        """Parse a school link into school data"""
        try:
            href = link.get('href', '')
            text = link.get_text(strip=True)
            
            if not text or len(text) < 2:
                return None
            
            # Generate school number
            school_no = f"PS{hash(text) % 10000:04d}"
            
            return {
                'school_no': school_no,
                'name_en': text,
                'name_tc': text,
                'district_en': 'Unknown',
                'district_tc': '未知',
                'address_en': 'Address not available',
                'address_tc': '地址不詳',
                'tel': 'N/A',
                'website': href if href.startswith('http') else '',
                'curriculum': '本地課程',
                'funding_type': '資助',
                'through_train': True,
                'language_of_instruction': '中英文',
                'student_capacity': '600',
                'application_page': href if href.startswith('http') else '',
                'has_website': bool(href and href.startswith('http')),
                'website_verified': False,
                'source': 'EDB Link Extraction',
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.debug(f"Error parsing school link: {e}")
            return None
    
    def _is_school_link(self, href: str, text: str) -> bool:
        """Check if a link is likely a school link"""
        school_indicators = ['school', 'primary', '小學', '學校', 'education']
        return any(indicator in href.lower() or indicator in text.lower() for indicator in school_indicators)
    
    def _remove_duplicates(self, schools: List[Dict]) -> List[Dict]:
        """Remove duplicate schools based on name"""
        seen_names = set()
        unique_schools = []
        
        for school in schools:
            name_key = school.get('name_en', '').lower().strip()
            if name_key and name_key not in seen_names:
                seen_names.add(name_key)
                unique_schools.append(school)
        
        return unique_schools
    
    def save_data(self, schools: List[Dict], filename: str = None) -> str:
        """Save schools data to JSON file"""
        if not filename:
            filename = f"edb_primary_schools_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        filepath = self.data_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(schools, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Data saved to: {filepath}")
        return str(filepath)
    
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
    
    def run_download_and_import(self):
        """Run the complete download and import process"""
        logger.info("Starting EDB primary school download and import process...")
        
        start_time = datetime.now()
        
        try:
            # Download all school data
            schools = self.download_all_district_data()
            
            if schools:
                # Save to local file
                filepath = self.save_data(schools)
                
                # Import to Supabase if available
                if self.supabase:
                    success = self.import_to_supabase(schools)
                    if success:
                        logger.info("Data successfully imported to Supabase")
                    else:
                        logger.error("Failed to import data to Supabase")
                else:
                    logger.info("Supabase not available - data saved locally only")
                
                end_time = datetime.now()
                duration = end_time - start_time
                
                logger.info(f"Process completed in {duration}")
                logger.info(f"Total schools processed: {len(schools)}")
                logger.info(f"Data saved to: {filepath}")
                
                return schools
            else:
                logger.warning("No schools found during download")
                return []
                
        except Exception as e:
            logger.error(f"Error in download and import process: {e}")
            return []

def main():
    """Main function"""
    downloader = EDBPrimarySchoolDownloader()
    schools = downloader.run_download_and_import()
    
    if schools:
        print(f"\nSuccessfully processed {len(schools)} primary schools")
        print("Sample schools:")
        for i, school in enumerate(schools[:5]):
            print(f"  {i+1}. {school['name_en']} ({school['district_en']})")
    else:
        print("No schools were processed")

if __name__ == "__main__":
    main() 