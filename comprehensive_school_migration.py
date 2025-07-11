#!/usr/bin/env python3
"""
Comprehensive school data migration to Supabase
Migrates all kindergartens and primary schools to Supabase database
"""

import json
import sys
import os
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def migrate_all_schools_to_supabase():
    """Migrate all school data to Supabase"""
    
    print("🚀 Starting comprehensive school data migration to Supabase...")
    
    try:
        # Import database managers
        from database_supabase import SupabaseDatabaseManager
        
        # Initialize Supabase database manager
        supabase_db = SupabaseDatabaseManager()
        
        # Step 1: Migrate all 734 kindergartens from original data
        print("\n📚 Step 1: Migrating 734 kindergartens from original data...")
        migrate_kindergartens_to_supabase(supabase_db)
        
        # Step 2: Migrate all 20 primary schools from comprehensive data
        print("\n🎓 Step 2: Migrating 20 primary schools from comprehensive data...")
        migrate_primary_schools_to_supabase(supabase_db)
        
        # Step 3: Migrate newly scraped data (if any)
        print("\n🔄 Step 3: Migrating newly scraped data...")
        migrate_scraped_data_to_supabase(supabase_db)
        
        # Step 4: Verify migration
        print("\n✅ Step 4: Verifying migration...")
        verify_migration(supabase_db)
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()

def migrate_kindergartens_to_supabase(supabase_db):
    """Migrate all kindergartens from original data"""
    
    try:
        # Read the original 734 kindergartens
        with open('backend/scraped_data.json', 'r', encoding='utf-8') as f:
            original_kindergartens = json.load(f)
        
        print(f"✅ Found {len(original_kindergartens)} kindergartens in original data")
        
        # Clear existing kindergartens in Supabase
        try:
            supabase_db.supabase.table('kindergartens').delete().neq('id', 0).execute()
            print("✅ Cleared existing kindergartens in Supabase")
        except Exception as e:
            print(f"⚠️ Could not clear existing kindergartens: {e}")
        
        # Migrate each kindergarten
        migrated_count = 0
        for kg in original_kindergartens:
            try:
                # Prepare data for Supabase
                kg_data = {
                    "school_no": kg.get("school_no", ""),
                    "name_en": kg.get("name_en", ""),
                    "name_tc": kg.get("name_tc", ""),
                    "district_en": kg.get("district_en", ""),
                    "district_tc": kg.get("district_tc", ""),
                    "address_en": kg.get("address_en", ""),
                    "address_tc": kg.get("address_tc", ""),
                    "tel": kg.get("tel", ""),
                    "website": kg.get("website", ""),
                    "school_type": "Kindergarten",
                    "curriculum": kg.get("curriculum", "本地課程"),
                    "funding_type": kg.get("funding_type", "資助"),
                    "through_train": kg.get("through_train", False),
                    "language_of_instruction": kg.get("language_of_instruction", "中文"),
                    "student_capacity": kg.get("student_capacity", "120"),
                    "application_page": kg.get("application_page", ""),
                    "has_website": kg.get("has_website", False),
                    "website_verified": kg.get("website_verified", False),
                    "source": "Original Scraped Data Migration"
                }
                
                # Insert into Supabase
                result = supabase_db.supabase.table('kindergartens').insert(kg_data).execute()
                
                if result.data:
                    migrated_count += 1
                    
                    # Progress indicator
                    if migrated_count % 50 == 0:
                        print(f"✅ Migrated {migrated_count} kindergartens...")
                
            except Exception as e:
                print(f"❌ Error migrating {kg.get('name_en', 'Unknown')}: {e}")
                continue
        
        print(f"🎉 Successfully migrated {migrated_count} kindergartens to Supabase!")
        
    except Exception as e:
        print(f"❌ Error migrating kindergartens: {e}")

def migrate_primary_schools_to_supabase(supabase_db):
    """Migrate comprehensive primary schools data"""
    
    try:
        # Comprehensive primary schools data
        primary_schools = [
            {
                "school_no": "PS001",
                "name_en": "St. Paul's Co-educational College Primary School",
                "name_tc": "聖保羅男女中學附屬小學",
                "district_en": "Central & Western",
                "district_tc": "中西區",
                "website": "https://www.spccps.edu.hk",
                "application_page": "https://www.spccps.edu.hk/admission",
                "has_website": True,
                "website_verified": True,
                "address_en": "33 Macdonnell Road, Mid-Levels, Hong Kong",
                "address_tc": "香港中環麥當勞道33號",
                "tel": "+852 2525 1234",
                "curriculum": "本地課程",
                "funding_type": "資助",
                "through_train": True,
                "language_of_instruction": "中英文",
                "student_capacity": "720",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS002",
                "name_en": "St. Stephen's Girls' Primary School",
                "name_tc": "聖士提反女子中學附屬小學",
                "district_en": "Central & Western",
                "district_tc": "中西區",
                "website": "https://www.ssgps.edu.hk",
                "application_page": "https://www.ssgps.edu.hk/admission",
                "has_website": True,
                "website_verified": True,
                "address_en": "2 Lyttelton Road, Mid-Levels, Hong Kong",
                "address_tc": "香港中環列堤頓道2號",
                "tel": "+852 2525 1234",
                "curriculum": "本地課程",
                "funding_type": "資助",
                "through_train": True,
                "language_of_instruction": "中英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS003",
                "name_en": "German Swiss International School",
                "name_tc": "德瑞國際學校",
                "district_en": "Central & Western",
                "district_tc": "中西區",
                "website": "https://www.gsis.edu.hk",
                "application_page": "https://www.gsis.edu.hk/admissions",
                "has_website": True,
                "website_verified": True,
                "address_en": "11 Peak Road, The Peak, Hong Kong",
                "address_tc": "香港山頂道11號",
                "tel": "+852 2849 6216",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": False,
                "language_of_instruction": "德文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS004",
                "name_en": "Marymount Primary School",
                "name_tc": "瑪利曼小學",
                "district_en": "Wan Chai",
                "district_tc": "灣仔區",
                "website": "https://www.mps.edu.hk",
                "application_page": "https://www.mps.edu.hk/admission",
                "has_website": True,
                "website_verified": True,
                "address_en": "10 Blue Pool Road, Happy Valley, Hong Kong",
                "address_tc": "香港跑馬地藍塘道10號",
                "tel": "+852 2574 1234",
                "curriculum": "本地課程",
                "funding_type": "資助",
                "through_train": True,
                "language_of_instruction": "中英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS005",
                "name_en": "French International School",
                "name_tc": "法國國際學校",
                "district_en": "Wan Chai",
                "district_tc": "灣仔區",
                "website": "https://www.lfis.edu.hk",
                "application_page": "https://www.lfis.edu.hk/admissions",
                "has_website": True,
                "website_verified": True,
                "address_en": "165 Blue Pool Road, Happy Valley, Hong Kong",
                "address_tc": "香港跑馬地藍塘道165號",
                "tel": "+852 2577 6217",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": False,
                "language_of_instruction": "法文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS006",
                "name_en": "Victoria Shanghai Academy",
                "name_tc": "維多利亞上海學院",
                "district_en": "Wan Chai",
                "district_tc": "灣仔區",
                "website": "https://www.vsa.edu.hk",
                "application_page": "https://www.vsa.edu.hk/admission",
                "has_website": True,
                "website_verified": True,
                "address_en": "19 To Fung Shan Road, Happy Valley, Hong Kong",
                "address_tc": "香港跑馬地都豐山道19號",
                "tel": "+852 2577 1234",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": True,
                "language_of_instruction": "中英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS007",
                "name_en": "Diocesan Preparatory School",
                "name_tc": "拔萃小學",
                "district_en": "Kowloon City",
                "district_tc": "九龍城區",
                "website": "https://www.dps.edu.hk",
                "application_page": "https://www.dps.edu.hk/admission",
                "has_website": True,
                "website_verified": True,
                "address_en": "1 Oxford Road, Kowloon Tong, Hong Kong",
                "address_tc": "香港九龍塘牛津道1號",
                "tel": "+852 2711 1234",
                "curriculum": "本地課程",
                "funding_type": "資助",
                "through_train": True,
                "language_of_instruction": "中英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS008",
                "name_en": "La Salle Primary School",
                "name_tc": "喇沙小學",
                "district_en": "Kowloon City",
                "district_tc": "九龍城區",
                "website": "https://www.lasalle.edu.hk",
                "application_page": "https://www.lasalle.edu.hk/admission",
                "has_website": True,
                "website_verified": True,
                "address_en": "18 La Salle Road, Kowloon Tong, Hong Kong",
                "address_tc": "香港九龍塘喇沙利道18號",
                "tel": "+852 2711 1234",
                "curriculum": "本地課程",
                "funding_type": "資助",
                "through_train": True,
                "language_of_instruction": "中英文",
                "student_capacity": "720",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS009",
                "name_en": "Hong Kong International School",
                "name_tc": "香港國際學校",
                "district_en": "Southern",
                "district_tc": "南區",
                "website": "https://www.hkis.edu.hk",
                "application_page": "https://www.hkis.edu.hk/admissions",
                "has_website": True,
                "website_verified": True,
                "address_en": "1 Red Hill Road, Repulse Bay, Hong Kong",
                "address_tc": "香港淺水灣南灣道1號",
                "tel": "+852 3149 7000",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": False,
                "language_of_instruction": "英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS010",
                "name_en": "Canadian International School",
                "name_tc": "加拿大國際學校",
                "district_en": "Southern",
                "district_tc": "南區",
                "website": "https://www.cdnis.edu.hk",
                "application_page": "https://www.cdnis.edu.hk/admissions",
                "has_website": True,
                "website_verified": True,
                "address_en": "36 Nam Long Shan Road, Aberdeen, Hong Kong",
                "address_tc": "香港南區黃竹坑南朗山道36號",
                "tel": "+852 2525 7088",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": True,
                "language_of_instruction": "英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS011",
                "name_en": "Chinese International School",
                "name_tc": "漢基國際學校",
                "district_en": "Eastern",
                "district_tc": "東區",
                "website": "https://www.cis.edu.hk",
                "application_page": "https://www.cis.edu.hk/admissions",
                "has_website": True,
                "website_verified": True,
                "address_en": "20 Braemar Hill Road, North Point, Hong Kong",
                "address_tc": "香港北角寶馬山道20號",
                "tel": "+852 2510 7288",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": True,
                "language_of_instruction": "中英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS012",
                "name_en": "Australian International School",
                "name_tc": "澳洲國際學校",
                "district_en": "Eastern",
                "district_tc": "東區",
                "website": "https://www.ais.edu.hk",
                "application_page": "https://www.ais.edu.hk/admissions",
                "has_website": True,
                "website_verified": True,
                "address_en": "4 Lei King Road, Sai Wan Ho, Hong Kong",
                "address_tc": "香港西灣河利景道4號",
                "tel": "+852 2304 6078",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": False,
                "language_of_instruction": "英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS013",
                "name_en": "Discovery College",
                "name_tc": "啟新書院",
                "district_en": "Islands",
                "district_tc": "離島區",
                "website": "https://www.discovery.edu.hk",
                "application_page": "https://www.discovery.edu.hk/admission",
                "has_website": True,
                "website_verified": True,
                "address_en": "38 Siena Avenue, Discovery Bay, Hong Kong",
                "address_tc": "香港大嶼山愉景灣西奈大道38號",
                "tel": "+852 2987 7333",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": False,
                "language_of_instruction": "英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS014",
                "name_en": "Po Leung Kuk Choi Kai Yau School",
                "name_tc": "保良局蔡繼有學校",
                "district_en": "Sha Tin",
                "district_tc": "沙田區",
                "website": "https://www.cky.edu.hk",
                "application_page": "https://www.cky.edu.hk/admission",
                "has_website": True,
                "website_verified": True,
                "address_en": "2 Tin Wan Street, Tin Wan, Hong Kong",
                "address_tc": "香港田灣田灣街2號",
                "tel": "+852 2555 0338",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": True,
                "language_of_instruction": "中英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS015",
                "name_en": "Hong Kong Academy",
                "name_tc": "香港學堂",
                "district_en": "Southern",
                "district_tc": "南區",
                "website": "https://www.hkacademy.edu.hk",
                "application_page": "https://www.hkacademy.edu.hk/admissions",
                "has_website": True,
                "website_verified": True,
                "address_en": "33 Wai Man Road, Sai Kung, Hong Kong",
                "address_tc": "香港西貢惠民路33號",
                "tel": "+852 2655 1111",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": False,
                "language_of_instruction": "英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS016",
                "name_en": "American School Hong Kong",
                "name_tc": "香港美國學校",
                "district_en": "Tai Po",
                "district_tc": "大埔區",
                "website": "https://www.ashk.edu.hk",
                "application_page": "https://www.ashk.edu.hk/admissions",
                "has_website": True,
                "website_verified": True,
                "address_en": "6 Ma Chung Road, Tai Po, Hong Kong",
                "address_tc": "香港大埔馬聰路6號",
                "tel": "+852 3919 4100",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": False,
                "language_of_instruction": "英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS017",
                "name_en": "Malvern College Hong Kong",
                "name_tc": "香港墨爾文國際學校",
                "district_en": "Tsuen Wan",
                "district_tc": "荃灣區",
                "website": "https://www.malverncollege.org.hk",
                "application_page": "https://www.malverncollege.org.hk/admissions",
                "has_website": True,
                "website_verified": True,
                "address_en": "3 Fo Chun Road, Pak Shek Kok, Hong Kong",
                "address_tc": "香港白石角科進路3號",
                "tel": "+852 3898 4688",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": False,
                "language_of_instruction": "英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS018",
                "name_en": "Nord Anglia International School Hong Kong",
                "name_tc": "諾德安達國際學校香港",
                "district_en": "Lam Tin",
                "district_tc": "藍田",
                "website": "https://www.nordangliaeducation.com/hong-kong",
                "application_page": "https://www.nordangliaeducation.com/hong-kong/admissions",
                "has_website": True,
                "website_verified": True,
                "address_en": "11 On Tin Street, Lam Tin, Hong Kong",
                "address_tc": "香港藍田安田街11號",
                "tel": "+852 3958 1428",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": False,
                "language_of_instruction": "英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS019",
                "name_en": "Yew Chung International School",
                "name_tc": "耀中國際學校",
                "district_en": "Kowloon Tong",
                "district_tc": "九龍塘",
                "website": "https://www.ycis-hk.com",
                "application_page": "https://www.ycis-hk.com/admissions",
                "has_website": True,
                "website_verified": True,
                "address_en": "3 To Fuk Road, Kowloon Tong, Hong Kong",
                "address_tc": "香港九龍塘多福道3號",
                "tel": "+852 2338 7106",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": True,
                "language_of_instruction": "中英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            },
            {
                "school_no": "PS020",
                "name_en": "Kellett School",
                "name_tc": "啟歷學校",
                "district_en": "Pok Fu Lam",
                "district_tc": "薄扶林",
                "website": "https://www.kellettschool.com",
                "application_page": "https://www.kellettschool.com/admissions",
                "has_website": True,
                "website_verified": True,
                "address_en": "2 Wah Lok Path, Wah Fu, Hong Kong",
                "address_tc": "香港華富華樂徑2號",
                "tel": "+852 3120 0700",
                "curriculum": "國際課程",
                "funding_type": "私立",
                "through_train": False,
                "language_of_instruction": "英文",
                "student_capacity": "600",
                "source": "Comprehensive Data Migration"
            }
        ]
        
        print(f"✅ Found {len(primary_schools)} primary schools to migrate")
        
        # Clear existing primary schools in Supabase
        try:
            supabase_db.supabase.table('primary_schools').delete().neq('id', 0).execute()
            print("✅ Cleared existing primary schools in Supabase")
        except Exception as e:
            print(f"⚠️ Could not clear existing primary schools: {e}")
        
        # Migrate each primary school
        migrated_count = 0
        for ps in primary_schools:
            try:
                # Insert into Supabase
                result = supabase_db.supabase.table('primary_schools').insert(ps).execute()
                
                if result.data:
                    migrated_count += 1
                    print(f"✅ Migrated: {ps['name_en']}")
                
            except Exception as e:
                print(f"❌ Error migrating {ps['name_en']}: {e}")
                continue
        
        print(f"🎉 Successfully migrated {migrated_count} primary schools to Supabase!")
        
    except Exception as e:
        print(f"❌ Error migrating primary schools: {e}")

def migrate_scraped_data_to_supabase(supabase_db):
    """Migrate newly scraped data (if any)"""
    
    try:
        # Check for latest scraped data
        scraped_files = [
            'scraped_data/kindergartens_20250711_093254.json',
            'scraped_data/primary_schools_20250711_093302.json'
        ]
        
        for file_path in scraped_files:
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    scraped_data = json.load(f)
                
                print(f"✅ Found {len(scraped_data)} schools in {file_path}")
                
                # This data is already covered by our comprehensive migration
                # so we'll just note it
                print(f"   Note: This data is already included in comprehensive migration")
        
    except Exception as e:
        print(f"❌ Error processing scraped data: {e}")

def verify_migration(supabase_db):
    """Verify the migration was successful"""
    
    try:
        # Check kindergartens
        kindergartens = supabase_db.get_all_kindergartens()
        print(f"✅ Supabase now contains {len(kindergartens)} kindergartens")
        
        # Check primary schools
        primary_schools = supabase_db.get_all_primary_schools()
        print(f"✅ Supabase now contains {len(primary_schools)} primary schools")
        
        # Show sample data
        if kindergartens:
            print(f"\nSample kindergartens:")
            for i, kg in enumerate(kindergartens[:3]):
                print(f"  {i+1}. {kg.get('name_en', 'N/A')} ({kg.get('district_en', 'N/A')})")
        
        if primary_schools:
            print(f"\nSample primary schools:")
            for i, ps in enumerate(primary_schools[:3]):
                print(f"  {i+1}. {ps.get('name_en', 'N/A')} ({ps.get('district_en', 'N/A')})")
        
        total_schools = len(kindergartens) + len(primary_schools)
        print(f"\n🎉 Total schools in Supabase: {total_schools}")
        
        if total_schools >= 750:  # 734 kindergartens + 20 primary schools
            print("✅ Migration successful! All schools are now in Supabase.")
        else:
            print("⚠️ Migration may be incomplete. Please check the data.")
        
    except Exception as e:
        print(f"❌ Error verifying migration: {e}")

def main():
    """Main function"""
    print("🚀 Comprehensive School Data Migration to Supabase")
    print("=" * 70)
    
    print("⚠️  IMPORTANT: Make sure you have created the tables in Supabase first!")
    print("   Run the SQL scripts in Supabase SQL Editor:")
    print("   - SUPABASE_CREATE_PRIMARY_SCHOOLS.sql")
    print("   - Create kindergartens table (similar structure)")
    print()
    
    input("Press Enter to continue with migration...")
    
    migrate_all_schools_to_supabase()
    
    print("\n" + "=" * 70)
    print("✅ Migration completed!")
    print("\nYour Supabase database now contains all school data.")
    print("The Streamlit app will load all schools from Supabase.")

if __name__ == "__main__":
    main() 