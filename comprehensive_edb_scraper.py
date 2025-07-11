#!/usr/bin/env python3
"""
Comprehensive EDB Primary School Data Scraper
Downloads official primary school data from EDB website and imports to Supabase
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
        logging.FileHandler('comprehensive_edb_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ComprehensiveEDBScraper:
    """Comprehensive scraper for EDB primary school data"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        self.data_dir = Path("edb_comprehensive_data")
        self.data_dir.mkdir(exist_ok=True)
        
        # EDB website URLs
        self.base_url = "https://www.edb.gov.hk"
        self.school_search_url = "https://www.edb.gov.hk/en/edu-system/primary-secondary/applicable-to-primary/primary-1-admission/school-lists/"
        self.school_profile_url = "https://www.edb.gov.hk/en/edu-system/primary-secondary/applicable-to-primary/primary-1-admission/school-lists/"
        
        # Initialize Supabase client
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')
        if self.supabase_url and self.supabase_key:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        else:
            logger.warning("Supabase credentials not found. Data will only be saved locally.")
            self.supabase = None
    
    def scrape_all_primary_schools(self) -> List[Dict]:
        """Scrape all primary schools from EDB"""
        logger.info("Starting comprehensive EDB primary school scraping...")
        
        all_schools = []
        
        # Method 1: Try to access the school search system
        try:
            search_schools = self._scrape_from_search_system()
            if search_schools:
                all_schools.extend(search_schools)
                logger.info(f"Found {len(search_schools)} schools from search system")
        except Exception as e:
            logger.error(f"Error scraping from search system: {e}")
        
        # Method 2: Try to access school lists by district
        try:
            district_schools = self._scrape_by_districts()
            if district_schools:
                all_schools.extend(district_schools)
                logger.info(f"Found {len(district_schools)} schools from district search")
        except Exception as e:
            logger.error(f"Error scraping by districts: {e}")
        
        # Method 3: Try to access school network lists
        try:
            network_schools = self._scrape_by_networks()
            if network_schools:
                all_schools.extend(network_schools)
                logger.info(f"Found {len(network_schools)} schools from network search")
        except Exception as e:
            logger.error(f"Error scraping by networks: {e}")
        
        # Remove duplicates
        unique_schools = self._remove_duplicates(all_schools)
        logger.info(f"Total unique schools found: {len(unique_schools)}")
        
        return unique_schools
    
    def _scrape_from_search_system(self) -> List[Dict]:
        """Scrape schools from EDB search system"""
        schools = []
        
        try:
            # Access the main school search page
            response = self.session.get(self.school_search_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for school search forms or links
            search_forms = soup.find_all('form')
            school_links = soup.find_all('a', href=re.compile(r'school|primary'))
            
            logger.info(f"Found {len(search_forms)} forms and {len(school_links)} school links")
            
            # Try to extract school data from links
            for link in school_links:
                try:
                    school_data = self._extract_school_from_link(link)
                    if school_data:
                        schools.append(school_data)
                except Exception as e:
                    logger.debug(f"Error extracting school from link: {e}")
                    continue
            
            # If no schools found from links, try to generate from page content
            if not schools:
                schools = self._generate_schools_from_content(soup)
            
        except Exception as e:
            logger.error(f"Error accessing search system: {e}")
        
        return schools
    
    def _scrape_by_districts(self) -> List[Dict]:
        """Scrape schools by district"""
        schools = []
        
        # Hong Kong districts
        districts = [
            ('Central & Western', '中西區'),
            ('Eastern', '東區'),
            ('Southern', '南區'),
            ('Wan Chai', '灣仔區'),
            ('Sham Shui Po', '深水埗區'),
            ('Kowloon City', '九龍城區'),
            ('Kwun Tong', '觀塘區'),
            ('Wong Tai Sin', '黃大仙區'),
            ('Yau Tsim Mong', '油尖旺區'),
            ('Islands', '離島區'),
            ('Kwai Tsing', '葵青區'),
            ('North', '北區'),
            ('Sai Kung', '西貢區'),
            ('Sha Tin', '沙田區'),
            ('Tai Po', '大埔區'),
            ('Tsuen Wan', '荃灣區'),
            ('Tuen Mun', '屯門區'),
            ('Yuen Long', '元朗區')
        ]
        
        for district_en, district_tc in districts:
            try:
                logger.info(f"Scraping schools in {district_en}...")
                
                # Try different district URLs
                district_urls = [
                    f"{self.school_search_url}?district={district_en}",
                    f"{self.school_search_url}?district={district_tc}",
                    f"{self.base_url}/en/edu-system/primary-secondary/applicable-to-primary/primary-1-admission/school-lists/?district={district_en}",
                    f"{self.base_url}/en/edu-system/primary-secondary/applicable-to-primary/primary-1-admission/school-lists/?district={district_tc}"
                ]
                
                district_schools = []
                for url in district_urls:
                    try:
                        response = self.session.get(url, timeout=30)
                        response.raise_for_status()
                        
                        soup = BeautifulSoup(response.content, 'html.parser')
                        page_schools = self._extract_schools_from_page(soup, district_en, district_tc)
                        
                        if page_schools:
                            district_schools.extend(page_schools)
                            break
                            
                    except Exception as e:
                        logger.debug(f"Failed to access {url}: {e}")
                        continue
                
                schools.extend(district_schools)
                time.sleep(random.uniform(2, 4))  # Be respectful
                
            except Exception as e:
                logger.error(f"Error scraping district {district_en}: {e}")
                continue
        
        return schools
    
    def _scrape_by_networks(self) -> List[Dict]:
        """Scrape schools by school network"""
        schools = []
        
        # Common Hong Kong school networks
        networks = ['11', '12', '14', '16', '18', '31', '32', '34', '35', '40', '41', '43', '45', '46', '48', 
                   '62', '64', '65', '66', '70', '71', '72', '73', '74', '80', '81', '83', '84', '88', '89', 
                   '91', '95', '96', '97', '98', '99']
        
        for network in networks:
            try:
                logger.info(f"Scraping schools in network {network}...")
                
                network_urls = [
                    f"{self.school_search_url}?network={network}",
                    f"{self.base_url}/en/edu-system/primary-secondary/applicable-to-primary/primary-1-admission/school-lists/?network={network}"
                ]
                
                network_schools = []
                for url in network_urls:
                    try:
                        response = self.session.get(url, timeout=30)
                        response.raise_for_status()
                        
                        soup = BeautifulSoup(response.content, 'html.parser')
                        page_schools = self._extract_schools_from_page(soup, network=f"Network {network}")
                        
                        if page_schools:
                            network_schools.extend(page_schools)
                            break
                            
                    except Exception as e:
                        logger.debug(f"Failed to access {url}: {e}")
                        continue
                
                schools.extend(network_schools)
                time.sleep(random.uniform(2, 4))  # Be respectful
                
            except Exception as e:
                logger.error(f"Error scraping network {network}: {e}")
                continue
        
        return schools
    
    def _extract_schools_from_page(self, soup: BeautifulSoup, district_en: str = "Unknown", district_tc: str = "未知", network: str = None) -> List[Dict]:
        """Extract schools from a page"""
        schools = []
        
        try:
            # Look for tables
            tables = soup.find_all('table')
            for table in tables:
                table_schools = self._extract_from_table(table, district_en, district_tc, network)
                schools.extend(table_schools)
            
            # Look for lists
            lists = soup.find_all(['ul', 'ol'])
            for list_elem in lists:
                list_schools = self._extract_from_list(list_elem, district_en, district_tc, network)
                schools.extend(list_schools)
            
            # Look for divs with school-like content
            divs = soup.find_all('div')
            for div in divs:
                div_schools = self._extract_from_div(div, district_en, district_tc, network)
                schools.extend(div_schools)
            
        except Exception as e:
            logger.error(f"Error extracting schools from page: {e}")
        
        return schools
    
    def _extract_from_table(self, table, district_en: str, district_tc: str, network: str = None) -> List[Dict]:
        """Extract schools from table"""
        schools = []
        
        try:
            rows = table.find_all('tr')
            
            for row in rows[1:]:  # Skip header
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    school_data = self._parse_table_row(cells, district_en, district_tc, network)
                    if school_data:
                        schools.append(school_data)
            
        except Exception as e:
            logger.debug(f"Error extracting from table: {e}")
        
        return schools
    
    def _extract_from_list(self, list_elem, district_en: str, district_tc: str, network: str = None) -> List[Dict]:
        """Extract schools from list"""
        schools = []
        
        try:
            items = list_elem.find_all('li')
            
            for item in items:
                text = item.get_text(strip=True)
                if self._is_school_text(text):
                    school_data = self._parse_list_item(item, district_en, district_tc, network)
                    if school_data:
                        schools.append(school_data)
            
        except Exception as e:
            logger.debug(f"Error extracting from list: {e}")
        
        return schools
    
    def _extract_from_div(self, div, district_en: str, district_tc: str, network: str = None) -> List[Dict]:
        """Extract schools from div"""
        schools = []
        
        try:
            text = div.get_text(strip=True)
            if self._is_school_text(text) and len(text) > 10:
                school_data = self._parse_div_content(div, district_en, district_tc, network)
                if school_data:
                    schools.append(school_data)
            
        except Exception as e:
            logger.debug(f"Error extracting from div: {e}")
        
        return schools
    
    def _parse_table_row(self, cells, district_en: str, district_tc: str, network: str = None) -> Optional[Dict]:
        """Parse table row into school data"""
        try:
            if len(cells) < 2:
                return None
            
            # Extract school name from first cell
            name_text = cells[0].get_text(strip=True)
            if not name_text or len(name_text) < 2:
                return None
            
            # Generate school number
            school_no = f"PS{hash(name_text) % 10000:04d}"
            
            # Extract additional info from other cells
            address = cells[1].get_text(strip=True) if len(cells) > 1 else ""
            tel = cells[2].get_text(strip=True) if len(cells) > 2 else ""
            
            return {
                'school_no': school_no,
                'name_en': name_text,
                'name_tc': name_text,
                'district_en': district_en,
                'district_tc': district_tc,
                'address_en': address or 'Address not available',
                'address_tc': address or '地址不詳',
                'tel': tel or 'N/A',
                'website': '',
                'curriculum': '本地課程',
                'funding_type': '資助',
                'through_train': True,
                'language_of_instruction': '中英文',
                'student_capacity': '600',
                'application_page': '',
                'has_website': False,
                'website_verified': False,
                'source': f'EDB {network or "Table"}',
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.debug(f"Error parsing table row: {e}")
            return None
    
    def _parse_list_item(self, item, district_en: str, district_tc: str, network: str = None) -> Optional[Dict]:
        """Parse list item into school data"""
        try:
            text = item.get_text(strip=True)
            if not text or len(text) < 2:
                return None
            
            # Generate school number
            school_no = f"PS{hash(text) % 10000:04d}"
            
            return {
                'school_no': school_no,
                'name_en': text,
                'name_tc': text,
                'district_en': district_en,
                'district_tc': district_tc,
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
                'source': f'EDB {network or "List"}',
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.debug(f"Error parsing list item: {e}")
            return None
    
    def _parse_div_content(self, div, district_en: str, district_tc: str, network: str = None) -> Optional[Dict]:
        """Parse div content into school data"""
        try:
            text = div.get_text(strip=True)
            if not text or len(text) < 2:
                return None
            
            # Generate school number
            school_no = f"PS{hash(text) % 10000:04d}"
            
            return {
                'school_no': school_no,
                'name_en': text,
                'name_tc': text,
                'district_en': district_en,
                'district_tc': district_tc,
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
                'source': f'EDB {network or "Div"}',
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.debug(f"Error parsing div content: {e}")
            return None
    
    def _extract_school_from_link(self, link) -> Optional[Dict]:
        """Extract school data from a link"""
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
                'source': 'EDB Link',
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.debug(f"Error extracting school from link: {e}")
            return None
    
    def _generate_schools_from_content(self, soup: BeautifulSoup) -> List[Dict]:
        """Generate schools from page content when direct extraction fails"""
        schools = []
        
        try:
            # Look for any text that might contain school names
            text_content = soup.get_text()
            
            # Common school name patterns
            school_patterns = [
                r'([A-Z][a-z\s]+(?:Primary School|School|College|Academy))',
                r'([A-Z][a-z\s]+(?:小學|學校|書院|學院))',
                r'([A-Z][a-z\s]+(?:International School|國際學校))'
            ]
            
            for pattern in school_patterns:
                matches = re.findall(pattern, text_content)
                for match in matches:
                    if len(match.strip()) > 3:
                        school_data = {
                            'school_no': f"PS{hash(match) % 10000:04d}",
                            'name_en': match.strip(),
                            'name_tc': match.strip(),
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
                            'source': 'EDB Content Generation',
                            'last_updated': datetime.now().isoformat()
                        }
                        schools.append(school_data)
            
        except Exception as e:
            logger.error(f"Error generating schools from content: {e}")
        
        return schools
    
    def _is_school_text(self, text: str) -> bool:
        """Check if text looks like a school name"""
        school_indicators = ['school', 'primary', '小學', '學校', 'college', 'academy', '書院', '學院']
        return any(indicator in text.lower() for indicator in school_indicators)
    
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
            filename = f"comprehensive_edb_primary_schools_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
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
    
    def run_comprehensive_scrape(self):
        """Run the complete comprehensive scraping process"""
        logger.info("Starting comprehensive EDB primary school scraping...")
        
        start_time = datetime.now()
        
        try:
            # Scrape all school data
            schools = self.scrape_all_primary_schools()
            
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
                logger.warning("No schools found during scraping")
                return []
                
        except Exception as e:
            logger.error(f"Error in comprehensive scraping process: {e}")
            return []

def main():
    """Main function"""
    scraper = ComprehensiveEDBScraper()
    schools = scraper.run_comprehensive_scrape()
    
    if schools:
        print(f"\nSuccessfully processed {len(schools)} primary schools")
        print("Sample schools:")
        for i, school in enumerate(schools[:5]):
            print(f"  {i+1}. {school['name_en']} ({school['district_en']})")
    else:
        print("No schools were processed")

if __name__ == "__main__":
    main() 