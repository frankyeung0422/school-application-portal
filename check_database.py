#!/usr/bin/env python3
"""
Check database tables and data
"""

import sqlite3
import json
from pathlib import Path

def check_database():
    """Check the database tables and data"""
    
    db_path = "school_portal.db"
    
    if not Path(db_path).exists():
        print(f"Database file {db_path} does not exist")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("Database Tables:")
    for table in tables:
        print(f"  - {table[0]}")
    
    print()
    
    # Check kindergartens table
    if any('kindergartens' in table for table in tables):
        cursor.execute("SELECT COUNT(*) FROM kindergartens")
        kg_count = cursor.fetchone()[0]
        print(f"Kindergartens: {kg_count} records")
        
        if kg_count > 0:
            cursor.execute("SELECT name_en, district_en, website FROM kindergartens LIMIT 3")
            kg_samples = cursor.fetchall()
            print("Sample kindergartens:")
            for kg in kg_samples:
                print(f"  - {kg[0]} ({kg[1]}) - {kg[2]}")
    
    print()
    
    # Check primary_schools table
    if any('primary_schools' in table for table in tables):
        cursor.execute("SELECT COUNT(*) FROM primary_schools")
        ps_count = cursor.fetchone()[0]
        print(f"Primary Schools: {ps_count} records")
        
        if ps_count > 0:
            cursor.execute("SELECT name_en, district_en, website FROM primary_schools LIMIT 3")
            ps_samples = cursor.fetchall()
            print("Sample primary schools:")
            for ps in ps_samples:
                print(f"  - {ps[0]} ({ps[1]}) - {ps[2]}")
    
    print()
    
    # Check last update times
    if any('kindergartens' in table for table in tables):
        cursor.execute("SELECT MAX(last_updated) FROM kindergartens")
        kg_last_update = cursor.fetchone()[0]
        print(f"Last kindergarten update: {kg_last_update}")
    
    if any('primary_schools' in table for table in tables):
        cursor.execute("SELECT MAX(last_updated) FROM primary_schools")
        ps_last_update = cursor.fetchone()[0]
        print(f"Last primary school update: {ps_last_update}")
    
    conn.close()

if __name__ == "__main__":
    check_database() 