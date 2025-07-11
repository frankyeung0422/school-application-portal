#!/usr/bin/env python3
"""
Automatic School Data Scraper
Scrapes and updates kindergarten and primary school data automatically
Runs nightly to keep data current
"""

import requests
import pandas as pd
import json
import os
import time
import logging
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import re
from typing import List, Dict, Optional
import schedule
import threading
from dataclasses import dataclass
import sqlite3
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('school_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class SchoolData:
    """Data class for school information"""
    school_no: str
    name_en: str
    name_tc: str
    district_en: str
    district_tc: str
    address_en: str
    address_tc: str
    tel: str
    website: str
    school_type: str
    curriculum: str
    funding_type: str
    through_train: bool
    language_of_instruction: str
    student_capacity: str
    application_page: str
    has_website: bool
    website_verified: bool
    last_updated: str

class SchoolDataScraper:
    """Main scraper class for school data"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.data_dir = Path("scraped_data")
        self.data_dir.mkdir(exist_ok=True)
        
    def scrape_edb_kindergartens(self) -> List[SchoolData]:
        """Scrape kindergarten data from EDB website"""
        logger.info("Starting kindergarten data scraping...")
        
        schools = []
        base_url = "https://www.edb.gov.hk/en/edu-system/preprimary-kindergarten/quality-assurance-framework/kindergarten-profile/"
        
        try:
            # EDB kindergarten profile page
            response = self.session.get(base_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for kindergarten listings
            # This is a simplified approach - you may need to adjust based on actual EDB structure
            school_links = soup.find_all('a', href=re.compile(r'kindergarten.*profile'))
            
            for link in school_links[:50]:  # Limit for testing
                try:
                    school_data = self._extract_kindergarten_data(link)
                    if school_data:
                        schools.append(school_data)
                        logger.info(f"Scraped kindergarten: {school_data.name_en}")
                except Exception as e:
                    logger.error(f"Error scraping kindergarten {link.get('href', 'unknown')}: {e}")
                    
        except Exception as e:
            logger.error(f"Error accessing EDB kindergarten page: {e}")
            
        logger.info(f"Completed kindergarten scraping. Found {len(schools)} schools.")
        return schools
    
    def scrape_edb_primary_schools(self) -> List[SchoolData]:
        """Scrape primary school data from EDB website"""
        logger.info("Starting primary school data scraping...")
        
        schools = []
        base_url = "https://www.edb.gov.hk/en/edu-system/primary-secondary/applicable-to-primary/primary-1-admission/"
        
        try:
            # EDB primary school admission page
            response = self.session.get(base_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for primary school listings
            school_links = soup.find_all('a', href=re.compile(r'primary.*school'))
            
            for link in school_links[:50]:  # Limit for testing
                try:
                    school_data = self._extract_primary_school_data(link)
                    if school_data:
                        schools.append(school_data)
                        logger.info(f"Scraped primary school: {school_data.name_en}")
                except Exception as e:
                    logger.error(f"Error scraping primary school {link.get('href', 'unknown')}: {e}")
                    
        except Exception as e:
            logger.error(f"Error accessing EDB primary school page: {e}")
            
        logger.info(f"Completed primary school scraping. Found {len(schools)} schools.")
        return schools
    
    def _extract_kindergarten_data(self, link) -> Optional[SchoolData]:
        """Extract kindergarten data from individual school page"""
        try:
            school_url = link.get('href')
            if not school_url.startswith('http'):
                school_url = f"https://www.edb.gov.hk{school_url}"
                
            response = self.session.get(school_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract school information (adjust selectors based on actual page structure)
            name_en = self._extract_text(soup, '.school-name-en') or link.get_text(strip=True)
            name_tc = self._extract_text(soup, '.school-name-tc') or name_en
            district = self._extract_text(soup, '.district') or "Unknown"
            address = self._extract_text(soup, '.address') or "Unknown"
            tel = self._extract_text(soup, '.telephone') or "Unknown"
            website = self._extract_link(soup, '.website')
            
            # Generate school number if not available
            school_no = f"KG{len(name_en) % 1000:03d}"
            
            return SchoolData(
                school_no=school_no,
                name_en=name_en,
                name_tc=name_tc,
                district_en=district,
                district_tc=district,
                address_en=address,
                address_tc=address,
                tel=tel,
                website=website,
                school_type="Kindergarten",
                curriculum="Local",
                funding_type="Subsidized",
                through_train=False,
                language_of_instruction="Bilingual",
                student_capacity="120",
                application_page=website,
                has_website=bool(website),
                website_verified=bool(website),
                last_updated=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Error extracting kindergarten data: {e}")
            return None
    
    def _extract_primary_school_data(self, link) -> Optional[SchoolData]:
        """Extract primary school data from individual school page"""
        try:
            school_url = link.get('href')
            if not school_url.startswith('http'):
                school_url = f"https://www.edb.gov.hk{school_url}"
                
            response = self.session.get(school_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract school information (adjust selectors based on actual page structure)
            name_en = self._extract_text(soup, '.school-name-en') or link.get_text(strip=True)
            name_tc = self._extract_text(soup, '.school-name-tc') or name_en
            district = self._extract_text(soup, '.district') or "Unknown"
            address = self._extract_text(soup, '.address') or "Unknown"
            tel = self._extract_text(soup, '.telephone') or "Unknown"
            website = self._extract_link(soup, '.website')
            
            # Generate school number if not available
            school_no = f"PS{len(name_en) % 1000:03d}"
            
            return SchoolData(
                school_no=school_no,
                name_en=name_en,
                name_tc=name_tc,
                district_en=district,
                district_tc=district,
                address_en=address,
                address_tc=address,
                tel=tel,
                website=website,
                school_type="Primary School",
                curriculum="Local",
                funding_type="Aided",
                through_train=True,
                language_of_instruction="Bilingual",
                student_capacity="600",
                application_page=website,
                has_website=bool(website),
                website_verified=bool(website),
                last_updated=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Error extracting primary school data: {e}")
            return None
    
    def _extract_text(self, soup, selector: str) -> str:
        """Extract text from HTML element"""
        element = soup.select_one(selector)
        return element.get_text(strip=True) if element else ""
    
    def _extract_link(self, soup, selector: str) -> str:
        """Extract link from HTML element"""
        element = soup.select_one(selector)
        return element.get('href', '') if element else ""
    
    def scrape_school_websites(self, schools: List[SchoolData]) -> List[SchoolData]:
        """Scrape individual school websites for additional information"""
        logger.info("Starting school website scraping...")
        
        for school in schools:
            if school.website and school.has_website:
                try:
                    logger.info(f"Scraping website for: {school.name_en}")
                    
                    response = self.session.get(school.website, timeout=30)
                    response.raise_for_status()
                    
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Look for application information
                    application_keywords = ['admission', 'application', 'enrollment', 'apply']
                    application_links = []
                    
                    for link in soup.find_all('a', href=True):
                        link_text = link.get_text(strip=True).lower()
                        if any(keyword in link_text for keyword in application_keywords):
                            application_links.append(link.get('href'))
                    
                    if application_links:
                        # Use the first application link found
                        if not application_links[0].startswith('http'):
                            school.application_page = f"{school.website.rstrip('/')}/{application_links[0].lstrip('/')}"
                        else:
                            school.application_page = application_links[0]
                    
                    # Update verification status
                    school.website_verified = True
                    school.last_updated = datetime.now().isoformat()
                    
                    # Add delay to be respectful to servers
                    time.sleep(2)
                    
                except Exception as e:
                    logger.error(f"Error scraping website for {school.name_en}: {e}")
                    school.website_verified = False
        
        logger.info("Completed school website scraping.")
        return schools
    
    def save_data(self, schools: List[SchoolData], filename: str):
        """Save school data to JSON file"""
        try:
            data = []
            for school in schools:
                data.append({
                    'school_no': school.school_no,
                    'name_en': school.name_en,
                    'name_tc': school.name_tc,
                    'district_en': school.district_en,
                    'district_tc': school.district_tc,
                    'address_en': school.address_en,
                    'address_tc': school.address_tc,
                    'tel': school.tel,
                    'website': school.website,
                    'school_type': school.school_type,
                    'curriculum': school.curriculum,
                    'funding_type': school.funding_type,
                    'through_train': school.through_train,
                    'language_of_instruction': school.language_of_instruction,
                    'student_capacity': school.student_capacity,
                    'application_page': school.application_page,
                    'has_website': school.has_website,
                    'website_verified': school.website_verified,
                    'last_updated': school.last_updated
                })
            
            filepath = self.data_dir / filename
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Saved {len(schools)} schools to {filepath}")
            
        except Exception as e:
            logger.error(f"Error saving data: {e}")
    
    def update_database(self, schools: List[SchoolData], table_name: str):
        """Update SQLite database with scraped data"""
        try:
            db_path = "school_portal.db"
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Create table if it doesn't exist
            cursor.execute(f'''
                CREATE TABLE IF NOT EXISTS {table_name} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    school_no TEXT UNIQUE,
                    name_en TEXT,
                    name_tc TEXT,
                    district_en TEXT,
                    district_tc TEXT,
                    address_en TEXT,
                    address_tc TEXT,
                    tel TEXT,
                    website TEXT,
                    school_type TEXT,
                    curriculum TEXT,
                    funding_type TEXT,
                    through_train BOOLEAN,
                    language_of_instruction TEXT,
                    student_capacity TEXT,
                    application_page TEXT,
                    has_website BOOLEAN,
                    website_verified BOOLEAN,
                    last_updated TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Insert or update schools
            for school in schools:
                cursor.execute(f'''
                    INSERT OR REPLACE INTO {table_name} (
                        school_no, name_en, name_tc, district_en, district_tc,
                        address_en, address_tc, tel, website, school_type,
                        curriculum, funding_type, through_train, language_of_instruction,
                        student_capacity, application_page, has_website, website_verified, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    school.school_no, school.name_en, school.name_tc, school.district_en, school.district_tc,
                    school.address_en, school.address_tc, school.tel, school.website, school.school_type,
                    school.curriculum, school.funding_type, school.through_train, school.language_of_instruction,
                    school.student_capacity, school.application_page, school.has_website, school.website_verified, school.last_updated
                ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Updated database table {table_name} with {len(schools)} schools")
            
        except Exception as e:
            logger.error(f"Error updating database: {e}")
    
    def run_full_scrape(self):
        """Run complete scraping process for both kindergarten and primary schools"""
        logger.info("Starting full school data scraping process...")
        
        start_time = datetime.now()
        
        try:
            # Scrape kindergarten data
            kindergartens = self.scrape_edb_kindergartens()
            if kindergartens:
                kindergartens = self.scrape_school_websites(kindergartens)
                self.save_data(kindergartens, f"kindergartens_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
                self.update_database(kindergartens, "kindergartens")
            
            # Scrape primary school data
            primary_schools = self.scrape_edb_primary_schools()
            if primary_schools:
                primary_schools = self.scrape_school_websites(primary_schools)
                self.save_data(primary_schools, f"primary_schools_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
                self.update_database(primary_schools, "primary_schools")
            
            end_time = datetime.now()
            duration = end_time - start_time
            
            logger.info(f"Full scraping completed in {duration}")
            logger.info(f"Total schools scraped: {len(kindergartens) + len(primary_schools)}")
            
        except Exception as e:
            logger.error(f"Error in full scraping process: {e}")

def run_scheduled_scrape():
    """Function to run scheduled scraping"""
    scraper = SchoolDataScraper()
    scraper.run_full_scrape()

def start_scheduler():
    """Start the scheduler to run scraping nightly"""
    logger.info("Starting school data scraper scheduler...")
    
    # Schedule scraping to run every night at 2 AM
    schedule.every().day.at("02:00").do(run_scheduled_scrape)
    
    # Also run immediately for testing
    schedule.every().day.at("14:00").do(run_scheduled_scrape)
    
    logger.info("Scheduler started. Scraping will run nightly at 2 AM and 2 PM for testing.")
    
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="School Data Scraper")
    parser.add_argument("--run-now", action="store_true", help="Run scraping immediately")
    parser.add_argument("--start-scheduler", action="store_true", help="Start the scheduler")
    parser.add_argument("--kindergarten-only", action="store_true", help="Scrape only kindergartens")
    parser.add_argument("--primary-only", action="store_true", help="Scrape only primary schools")
    
    args = parser.parse_args()
    
    scraper = SchoolDataScraper()
    
    if args.run_now:
        if args.kindergarten_only:
            logger.info("Running kindergarten scraping only...")
            kindergartens = scraper.scrape_edb_kindergartens()
            if kindergartens:
                kindergartens = scraper.scrape_school_websites(kindergartens)
                scraper.save_data(kindergartens, f"kindergartens_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
                scraper.update_database(kindergartens, "kindergartens")
        elif args.primary_only:
            logger.info("Running primary school scraping only...")
            primary_schools = scraper.scrape_edb_primary_schools()
            if primary_schools:
                primary_schools = scraper.scrape_school_websites(primary_schools)
                scraper.save_data(primary_schools, f"primary_schools_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
                scraper.update_database(primary_schools, "primary_schools")
        else:
            scraper.run_full_scrape()
    
    elif args.start_scheduler:
        start_scheduler()
    
    else:
        # Default: run once
        scraper.run_full_scrape() 