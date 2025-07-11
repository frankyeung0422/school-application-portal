#!/usr/bin/env python3
"""
Schooland.hk Primary School Data Scraper
Specialized scraper for comprehensive primary school data from Schooland.hk
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
from typing import List, Dict, Optional, Set
from dataclasses import dataclass, asdict
from pathlib import Path
import random

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('schooland_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class PrimarySchoolData:
    """Data class for primary school information from Schooland.hk"""
    school_no: str
    name_en: str
    name_tc: str
    school_type: str  # 官立, 資助, 直資, 私立
    religion: str     # 無宗教, 基督教, 天主教, 佛教, 道教, 儒釋道, 孔教, 回教
    district: str     # 中西區, 九龍城, 元朗區, etc.
    school_network: str  # 校網 11, 12, 14, etc.
    gender: str       # 男女小學, 男子小學, 女子小學
    connection: str   # 有結龍中學, 有直屬中學, 有聯繫中學
    address: str
    telephone: str
    website: str
    application_info: str
    last_updated: str
    source: str = "Schooland.hk"

class SchoolandScraper:
    """Specialized scraper for Schooland.hk primary school data"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.data_dir = Path("scraped_data")
        self.data_dir.mkdir(exist_ok=True)
        
        # Schooland.hk base URL
        self.base_url = "https://www.schooland.hk/ps/"
        
        # Hong Kong districts mapping
        self.districts = {
            '中西區': 'Central and Western',
            '東區': 'Eastern', 
            '南區': 'Southern',
            '灣仔區': 'Wan Chai',
            '深水埗區': 'Sham Shui Po',
            '九龍城區': 'Kowloon City',
            '觀塘區': 'Kwun Tong',
            '黃大仙區': 'Wong Tai Sin',
            '油尖旺區': 'Yau Tsim Mong',
            '離島區': 'Islands',
            '葵青區': 'Kwai Tsing',
            '北區': 'North',
            '西貢區': 'Sai Kung',
            '沙田區': 'Sha Tin',
            '大埔區': 'Tai Po',
            '荃灣區': 'Tsuen Wan',
            '屯門區': 'Tuen Mun',
            '元朗區': 'Yuen Long'
        }
        
        # School types mapping
        self.school_types = {
            '官立': 'Government',
            '資助': 'Aided',
            '直資': 'Direct Subsidy Scheme',
            '私立': 'Private'
        }
        
        # Religion mapping
        self.religions = {
            '無宗教': 'No Religion',
            '基督教': 'Christian',
            '天主教': 'Catholic',
            '佛教': 'Buddhist',
            '道教': 'Taoist',
            '儒釋道': 'Confucianism-Buddhism-Taoism',
            '孔教': 'Confucianism',
            '回教': 'Islamic'
        }
        
        # Gender mapping
        self.gender_types = {
            '男女小學': 'Co-educational',
            '男子小學': 'Boys',
            '女子小學': 'Girls'
        }
        
        # Connection types
        self.connection_types = {
            '有結龍中學': 'Through-train Secondary',
            '有直屬中學': 'Direct Secondary',
            '有聯繫中學': 'Affiliated Secondary'
        }
    
    def scrape_all_primary_schools(self) -> List[PrimarySchoolData]:
        """Scrape all primary schools from Schooland.hk by iterating through all districts"""
        logger.info("Starting comprehensive primary school scraping from Schooland.hk (by district)...")
        schools = []
        for district_tc, district_en in self.districts.items():
            try:
                logger.info(f"Scraping schools in {district_en} ({district_tc})...")
                district_url = f"{self.base_url}?district={district_tc}"
                response = self.session.get(district_url, timeout=30)
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Look for school data in multiple ways
                district_schools = []
                
                # Method 1: Look for main school table
                tables = soup.find_all('table')
                logger.info(f"Found {len(tables)} tables in {district_en}")
                
                for table_idx, table in enumerate(tables):
                    rows = table.find_all('tr')
                    logger.info(f"Table {table_idx}: Found {len(rows)} rows")
                    
                    for row_idx, row in enumerate(rows):
                        cells = row.find_all(['td', 'th'])
                        if len(cells) >= 3:  # At least 3 columns
                            cell_texts = [cell.get_text(strip=True) for cell in cells]
                            logger.debug(f"Row {row_idx}: {cell_texts}")
                            
                            # Skip rows that are clearly filters/categories
                            if any(filter_text in ' '.join(cell_texts).lower() for filter_text in 
                                   ['種類', '宗教', '地區', '校網', '性別', 'filter', 'category']):
                                logger.debug(f"Skipping filter row: {cell_texts}")
                                continue
                            
                            # Skip rows with empty or very short school names
                            if not cell_texts[0] or len(cell_texts[0]) < 3:
                                logger.debug(f"Skipping row with short name: {cell_texts}")
                                continue
                            
                            # Skip rows that look like statistics/numbers only
                            if all(cell.isdigit() or not cell for cell in cell_texts):
                                logger.debug(f"Skipping numeric row: {cell_texts}")
                                continue
                            
                            try:
                                school_data = self._parse_improved_table_row(cells, district_tc)
                                if school_data:
                                    district_schools.append(school_data)
                                    logger.info(f"Found school: {school_data.name_tc}")
                            except Exception as e:
                                logger.debug(f"Error parsing row {row_idx}: {e}")
                                continue
                
                # Method 2: Look for school links in the page
                school_links = soup.find_all('a', href=True)
                for link in school_links:
                    href = link.get('href', '')
                    link_text = link.get_text(strip=True)
                    
                    # Check if this looks like a school link
                    if (len(link_text) > 3 and 
                        ('小學' in link_text or 'Primary' in link_text or 'School' in link_text) and
                        not any(filter_text in link_text for filter_text in ['種類', '宗教', '地區', '校網', '性別'])):
                        
                        try:
                            school_data = self._scrape_school_detail_page(href, link_text, district_tc)
                            if school_data:
                                district_schools.append(school_data)
                                logger.info(f"Found school from link: {school_data.name_tc}")
                        except Exception as e:
                            logger.debug(f"Error scraping school link: {e}")
                            continue
                
                # Method 3: Look for school listings in divs
                school_divs = soup.find_all(['div', 'li'], class_=re.compile(r'school|primary|list|item'))
                for div in school_divs:
                    text = div.get_text(strip=True)
                    if len(text) > 10 and ('小學' in text or 'Primary' in text):
                        try:
                            school_data = self._parse_listing_element(div, district_tc)
                            if school_data:
                                district_schools.append(school_data)
                                logger.info(f"Found school from div: {school_data.name_tc}")
                        except Exception as e:
                            logger.debug(f"Error parsing div: {e}")
                            continue
                
                schools.extend(district_schools)
                logger.info(f"Found {len(district_schools)} schools in {district_en}")
                time.sleep(random.uniform(1, 2))  # Be respectful
                
            except Exception as e:
                logger.error(f"Error scraping district {district_en}: {e}")
                continue
        
        unique_schools = self._remove_duplicates(schools)
        logger.info(f"Found {len(unique_schools)} unique primary schools across all districts.")
        return unique_schools
    
    def _extract_from_table(self, soup) -> List[PrimarySchoolData]:
        """Extract school data from table format"""
        schools = []
        
        try:
            # Look for table with school data
            tables = soup.find_all('table')
            
            for table in tables:
                rows = table.find_all('tr')
                
                for row in rows[1:]:  # Skip header row
                    cells = row.find_all(['td', 'th'])
                    
                    if len(cells) >= 6:  # Expect at least 6 columns
                        try:
                            school_data = self._parse_table_row(cells)
                            if school_data:
                                schools.append(school_data)
                        except Exception as e:
                            logger.debug(f"Error parsing table row: {e}")
                            continue
            
            logger.info(f"Extracted {len(schools)} schools from tables")
            
        except Exception as e:
            logger.error(f"Error extracting from table: {e}")
        
        return schools
    
    def _extract_from_links(self, soup) -> List[PrimarySchoolData]:
        """Extract school data from school links"""
        schools = []
        
        try:
            # Look for school links
            school_links = soup.find_all('a', href=True)
            
            for link in school_links:
                href = link.get('href', '')
                link_text = link.get_text(strip=True)
                
                # Check if this looks like a school link
                if self._is_school_link(href, link_text):
                    try:
                        school_data = self._scrape_school_detail_page(href, link_text, '') # Pass empty district for now
                        if school_data:
                            schools.append(school_data)
                            time.sleep(random.uniform(1, 3))  # Be respectful
                    except Exception as e:
                        logger.debug(f"Error scraping school detail: {e}")
                        continue
            
            logger.info(f"Extracted {len(schools)} schools from links")
            
        except Exception as e:
            logger.error(f"Error extracting from links: {e}")
        
        return schools
    
    def _extract_from_listings(self, soup) -> List[PrimarySchoolData]:
        """Extract school data from listing format"""
        schools = []
        
        try:
            # Look for school listings in various formats
            school_elements = soup.find_all(['div', 'li', 'p'], class_=re.compile(r'school|primary|list'))
            
            for element in school_elements:
                try:
                    school_data = self._parse_listing_element(element, '') # Pass empty district for now
                    if school_data:
                        schools.append(school_data)
                except Exception as e:
                    logger.debug(f"Error parsing listing element: {e}")
                    continue
            
            logger.info(f"Extracted {len(schools)} schools from listings")
            
        except Exception as e:
            logger.error(f"Error extracting from listings: {e}")
        
        return schools
    
    def _scrape_by_district(self) -> List[PrimarySchoolData]:
        """Scrape schools by district"""
        schools = []
        
        for district_tc, district_en in self.districts.items():
            try:
                logger.info(f"Scraping schools in {district_en}...")
                
                # Construct district URL
                district_url = f"{self.base_url}?district={district_tc}"
                response = self.session.get(district_url, timeout=30)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                district_schools = self._extract_from_table(soup)
                district_schools.extend(self._extract_from_links(soup))
                
                for school in district_schools:
                    school.district = district_tc
                
                schools.extend(district_schools)
                time.sleep(random.uniform(2, 5))  # Be respectful
                
            except Exception as e:
                logger.error(f"Error scraping district {district_en}: {e}")
                continue
        
        return schools
    
    def _scrape_by_school_network(self) -> List[PrimarySchoolData]:
        """Scrape schools by school network"""
        schools = []
        
        # Common school networks in Hong Kong
        networks = ['11', '12', '14', '16', '18', '31', '32', '34', '35', '40', '41', '43', '45', '46', '48', 
                   '62', '64', '65', '66', '70', '71', '72', '73', '74', '80', '81', '83', '84', '88', '89', 
                   '91', '95', '96', '97', '98', '99']
        
        for network in networks:
            try:
                logger.info(f"Scraping schools in network {network}...")
                
                # Construct network URL
                network_url = f"{self.base_url}?network={network}"
                response = self.session.get(network_url, timeout=30)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                network_schools = self._extract_from_table(soup)
                network_schools.extend(self._extract_from_links(soup))
                
                for school in network_schools:
                    school.school_network = f"校網 {network}"
                
                schools.extend(network_schools)
                time.sleep(random.uniform(2, 5))  # Be respectful
                
            except Exception as e:
                logger.error(f"Error scraping network {network}: {e}")
                continue
        
        return schools
    
    def _scrape_by_school_type(self) -> List[PrimarySchoolData]:
        """Scrape schools by school type"""
        schools = []
        
        for school_type_tc, school_type_en in self.school_types.items():
            try:
                logger.info(f"Scraping {school_type_en} schools...")
                
                # Construct school type URL
                type_url = f"{self.base_url}?type={school_type_tc}"
                response = self.session.get(type_url, timeout=30)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                type_schools = self._extract_from_table(soup)
                type_schools.extend(self._extract_from_links(soup))
                
                for school in type_schools:
                    school.school_type = school_type_tc
                
                schools.extend(type_schools)
                time.sleep(random.uniform(2, 5))  # Be respectful
                
            except Exception as e:
                logger.error(f"Error scraping school type {school_type_en}: {e}")
                continue
        
        return schools
    
    def _parse_table_row(self, cells) -> Optional[PrimarySchoolData]:
        """Parse a table row into school data"""
        try:
            if len(cells) < 6:
                return None
            
            # Extract data from cells
            name_cell = cells[0].get_text(strip=True)
            type_cell = cells[1].get_text(strip=True)
            religion_cell = cells[2].get_text(strip=True)
            district_cell = cells[3].get_text(strip=True)
            network_cell = cells[4].get_text(strip=True)
            gender_cell = cells[5].get_text(strip=True)
            
            # Generate school number
            school_no = f"PS{hash(name_cell) % 10000:04d}"
            
            return PrimarySchoolData(
                school_no=school_no,
                name_en=name_cell,
                name_tc=name_cell,
                school_type=type_cell,
                religion=religion_cell,
                district=district_cell,
                school_network=network_cell,
                gender=gender_cell,
                connection="",
                address="",
                telephone="",
                website="",
                application_info="",
                last_updated=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.debug(f"Error parsing table row: {e}")
            return None
    
    def _is_school_link(self, href: str, text: str) -> bool:
        """Check if a link is likely a school link"""
        school_indicators = ['school', 'primary', '小學', '學校']
        return any(indicator in href.lower() or indicator in text.lower() for indicator in school_indicators)
    
    def _parse_improved_table_row(self, cells, district_tc) -> Optional[PrimarySchoolData]:
        """Parse a table row with improved logic to identify real schools"""
        try:
            if len(cells) < 3:
                return None
            
            # Extract data from cells
            name_cell = cells[0].get_text(strip=True)
            
            # Skip if name is too short or looks like a filter
            if len(name_cell) < 3 or any(filter_text in name_cell for filter_text in ['種類', '宗教', '地區', '校網', '性別']):
                return None
            
            # Extract other fields based on available columns
            school_type = cells[1].get_text(strip=True) if len(cells) > 1 else ""
            religion = cells[2].get_text(strip=True) if len(cells) > 2 else ""
            network = cells[3].get_text(strip=True) if len(cells) > 3 else ""
            gender = cells[4].get_text(strip=True) if len(cells) > 4 else ""
            
            # Try to get detail page link
            link = cells[0].find('a')
            detail_url = link['href'] if link and 'href' in link.attrs else None
            
            # Get additional details if detail page exists
            address = ''
            telephone = ''
            website = ''
            application_info = ''
            
            if detail_url:
                if not detail_url.startswith('http'):
                    detail_url = f"https://www.schooland.hk{detail_url}"
                try:
                    detail_resp = self.session.get(detail_url, timeout=20)
                    detail_resp.raise_for_status()
                    detail_soup = BeautifulSoup(detail_resp.content, 'html.parser')
                    
                    # Try multiple selectors for address
                    addr_selectors = ['.address', '.location', '[class*="address"]', '[class*="location"]']
                    for selector in addr_selectors:
                        addr_tag = detail_soup.select_one(selector)
                        if addr_tag:
                            address = addr_tag.get_text(strip=True)
                            break
                    
                    # Try multiple selectors for telephone
                    tel_selectors = ['.tel', '.phone', '[class*="tel"]', '[class*="phone"]']
                    for selector in tel_selectors:
                        tel_tag = detail_soup.select_one(selector)
                        if tel_tag:
                            telephone = tel_tag.get_text(strip=True)
                            break
                    
                    # Try to find website link
                    web_links = detail_soup.find_all('a', href=True)
                    for web_link in web_links:
                        href = web_link.get('href', '')
                        text = web_link.get_text(strip=True)
                        if any(keyword in text.lower() for keyword in ['網站', 'website', '網址']):
                            website = href
                            break
                        elif href.startswith('http') and any(domain in href for domain in ['.edu.hk', '.org.hk', '.com']):
                            website = href
                            break
                    
                except Exception as e:
                    logger.debug(f"Error scraping detail page {detail_url}: {e}")
            
            # Generate school number
            school_no = f"PS{hash(name_cell + district_tc) % 10000:04d}"
            
            return PrimarySchoolData(
                school_no=school_no,
                name_en='',  # Schooland.hk usually only has Chinese name
                name_tc=name_cell,
                school_type=school_type,
                religion=religion,
                district=district_tc,
                school_network=network,
                gender=gender,
                connection='',
                address=address,
                telephone=telephone,
                website=website,
                application_info=application_info,
                last_updated=datetime.now().isoformat(),
            )
            
        except Exception as e:
            logger.debug(f"Error parsing improved table row: {e}")
            return None
    
    def _scrape_school_detail_page(self, href: str, school_name: str, district_tc: str) -> Optional[PrimarySchoolData]:
        """Scrape individual school detail page with improved logic"""
        try:
            if not href.startswith('http'):
                href = f"https://www.schooland.hk{href}"
            
            response = self.session.get(href, timeout=20)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract detailed information with multiple selector attempts
            address = ''
            telephone = ''
            website = ''
            
            # Try multiple selectors for address
            addr_selectors = ['.address', '.location', '[class*="address"]', '[class*="location"]']
            for selector in addr_selectors:
                addr_tag = soup.select_one(selector)
                if addr_tag:
                    address = addr_tag.get_text(strip=True)
                    break
            
            # Try multiple selectors for telephone
            tel_selectors = ['.tel', '.phone', '[class*="tel"]', '[class*="phone"]']
            for selector in tel_selectors:
                tel_tag = soup.select_one(selector)
                if tel_tag:
                    telephone = tel_tag.get_text(strip=True)
                    break
            
            # Try to find website link
            web_links = soup.find_all('a', href=True)
            for web_link in web_links:
                href = web_link.get('href', '')
                text = web_link.get_text(strip=True)
                if any(keyword in text.lower() for keyword in ['網站', 'website', '網址']):
                    website = href
                    break
                elif href.startswith('http') and any(domain in href for domain in ['.edu.hk', '.org.hk', '.com']):
                    website = href
                    break
            
            # Generate school number
            school_no = f"PS{hash(school_name + district_tc) % 10000:04d}"
            
            return PrimarySchoolData(
                school_no=school_no,
                name_en='',
                name_tc=school_name,
                school_type='',
                religion='',
                district=district_tc,
                school_network='',
                gender='',
                connection='',
                address=address,
                telephone=telephone,
                website=website,
                application_info='',
                last_updated=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.debug(f"Error scraping school detail page: {e}")
            return None
    
    def _parse_listing_element(self, element, district_tc) -> Optional[PrimarySchoolData]:
        """Parse a listing element with improved logic"""
        try:
            text = element.get_text(strip=True)
            
            # Look for school name patterns
            school_name_match = re.search(r'([^\s]+小學|[^\s]+Primary School)', text)
            if not school_name_match:
                return None
            
            school_name = school_name_match.group(1)
            
            # Skip if it looks like a filter/category
            if any(filter_text in school_name for filter_text in ['種類', '宗教', '地區', '校網', '性別']):
                return None
            
            # Generate school number
            school_no = f"PS{hash(school_name + district_tc) % 10000:04d}"
            
            return PrimarySchoolData(
                school_no=school_no,
                name_en='',
                name_tc=school_name,
                school_type='',
                religion='',
                district=district_tc,
                school_network='',
                gender='',
                connection='',
                address='',
                telephone='',
                website='',
                application_info='',
                last_updated=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.debug(f"Error parsing listing element: {e}")
            return None
    
    def _extract_text(self, soup, selector: str) -> str:
        """Extract text from HTML element"""
        element = soup.select_one(selector)
        return element.get_text(strip=True) if element else ""
    
    def _extract_link(self, soup, selector: str) -> str:
        """Extract link from HTML element"""
        element = soup.select_one(selector)
        return element.get('href', '') if element else ""
    
    def _remove_duplicates(self, schools: List[PrimarySchoolData]) -> List[PrimarySchoolData]:
        """Remove duplicate schools based on name"""
        seen_names = set()
        unique_schools = []
        
        for school in schools:
            if school.name_en not in seen_names:
                seen_names.add(school.name_en)
                unique_schools.append(school)
        
        return unique_schools
    
    def save_data(self, schools: List[PrimarySchoolData], filename: str = None):
        """Save school data to JSON file"""
        if filename is None:
            filename = f"schooland_primary_schools_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            data = []
            for school in schools:
                data.append(asdict(school))
            
            filepath = self.data_dir / filename
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Saved {len(schools)} schools to {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error saving data: {e}")
            return None
    
    def run_scraping(self):
        """Run the complete scraping process"""
        logger.info("Starting Schooland.hk primary school scraping...")
        
        start_time = datetime.now()
        
        try:
            # Scrape all primary schools
            schools = self.scrape_all_primary_schools()
            
            if schools:
                # Save data
                filepath = self.save_data(schools)
                
                end_time = datetime.now()
                duration = end_time - start_time
                
                logger.info(f"Scraping completed in {duration}")
                logger.info(f"Total schools scraped: {len(schools)}")
                logger.info(f"Data saved to: {filepath}")
                
                return schools
            else:
                logger.warning("No schools found during scraping")
                return []
                
        except Exception as e:
            logger.error(f"Error in scraping process: {e}")
            return []

def main():
    """Main function to run the scraper"""
    scraper = SchoolandScraper()
    schools = scraper.run_scraping()
    
    if schools:
        print(f"\n✅ Successfully scraped {len(schools)} primary schools from Schooland.hk")
        print(f"📁 Data saved to: scraped_data/")
        
        # Show sample of scraped data
        print(f"\n📋 Sample schools:")
        for i, school in enumerate(schools[:5]):
            print(f"  {i+1}. {school.name_en} ({school.district}) - {school.school_type}")
    else:
        print("❌ No schools were scraped. Check the log file for details.")

if __name__ == "__main__":
    main() 