#!/usr/bin/env python3
"""
Import hard-coded kindergarten and primary school data from Streamlit app into database
"""

import sys
import os
from datetime import datetime

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def import_hardcoded_kindergartens():
    """Import hard-coded kindergarten data from Streamlit app into database"""
    
    print("Importing hard-coded kindergarten data...")
    
    # Hard-coded kindergarten data from streamlit_app.py
    hardcoded_kindergartens = [
        {
            "school_no": "0001",
            "name_tc": "迦南幼稚園（中環堅道）",
            "name_en": "CANNAN KINDERGARTEN (CENTRAL CAINE ROAD)",
            "district_tc": "中西區",
            "district_en": "Central & Western",
            "website": "https://www.cannan.edu.hk",
            "application_page": "https://www.cannan.edu.hk/admission",
            "has_website": True,
            "website_verified": True,
            "address_tc": "香港中環堅道50號",
            "address_en": "50 Caine Road, Central, Hong Kong",
            "tel": "+852 2525 1234",
            "curriculum": "本地課程",
            "funding_type": "資助",
            "through_train": True,
            "language_of_instruction": "中文",
            "student_capacity": "120",
            "source": "Hard-coded Data"
        },
        {
            "school_no": "0002",
            "name_tc": "維多利亞幼稚園（銅鑼灣）",
            "name_en": "VICTORIA KINDERGARTEN (CAUSEWAY BAY)",
            "district_tc": "灣仔區",
            "district_en": "Wan Chai",
            "website": "https://www.victoria.edu.hk",
            "application_page": "https://www.victoria.edu.hk/admission",
            "has_website": True,
            "website_verified": True,
            "address_tc": "香港銅鑼灣軒尼詩道456號",
            "address_en": "456 Hennessy Road, Causeway Bay, Hong Kong",
            "tel": "+852 2890 5678",
            "curriculum": "國際課程",
            "funding_type": "私立",
            "through_train": False,
            "language_of_instruction": "英文",
            "student_capacity": "80",
            "source": "Hard-coded Data"
        },
        {
            "school_no": "0003",
            "name_tc": "聖保羅男女中學附屬小學",
            "name_en": "ST. PAUL'S CO-EDUCATIONAL COLLEGE PRIMARY SCHOOL",
            "district_tc": "灣仔區",
            "district_en": "Wan Chai",
            "website": "https://www.spcc.edu.hk",
            "application_page": "https://www.spcc.edu.hk/admission",
            "has_website": True,
            "website_verified": True,
            "address_tc": "香港灣仔司徒拔道24號",
            "address_en": "24 Stubbs Road, Wan Chai, Hong Kong",
            "tel": "+852 2577 7838",
            "curriculum": "本地課程",
            "funding_type": "資助",
            "through_train": True,
            "language_of_instruction": "中英文",
            "student_capacity": "150",
            "source": "Hard-coded Data"
        },
        {
            "school_no": "0004",
            "name_tc": "香港國際學校",
            "name_en": "HONG KONG INTERNATIONAL SCHOOL",
            "district_tc": "南區",
            "district_en": "Southern",
            "website": "https://www.hkis.edu.hk",
            "application_page": "https://www.hkis.edu.hk/admissions",
            "has_website": True,
            "website_verified": True,
            "address_tc": "香港淺水灣南灣道1號",
            "address_en": "1 Red Hill Road, Repulse Bay, Hong Kong",
            "tel": "+852 3149 7000",
            "curriculum": "國際課程",
            "funding_type": "私立",
            "through_train": False,
            "language_of_instruction": "英文",
            "student_capacity": "100",
            "source": "Hard-coded Data"
        },
        {
            "school_no": "0005",
            "name_tc": "漢基國際學校",
            "name_en": "CHINESE INTERNATIONAL SCHOOL",
            "district_tc": "東區",
            "district_en": "Eastern",
            "website": "https://www.cis.edu.hk",
            "application_page": "https://www.cis.edu.hk/admissions",
            "has_website": True,
            "website_verified": True,
            "address_tc": "香港北角寶馬山道20號",
            "address_en": "20 Braemar Hill Road, North Point, Hong Kong",
            "tel": "+852 2510 7288",
            "curriculum": "國際課程",
            "funding_type": "私立",
            "through_train": True,
            "language_of_instruction": "中英文",
            "student_capacity": "90",
            "source": "Hard-coded Data"
        },
        {
            "school_no": "0006",
            "name_tc": "聖士提反書院附屬小學",
            "name_en": "ST. STEPHEN'S COLLEGE PREPARATORY SCHOOL",
            "district_tc": "南區",
            "district_en": "Southern",
            "website": "https://www.sscps.edu.hk",
            "application_page": "https://www.sscps.edu.hk/admission",
            "has_website": True,
            "website_verified": True,
            "address_tc": "香港赤柱東頭灣道22號",
            "address_en": "22 Tung Tau Wan Road, Stanley, Hong Kong",
            "tel": "+852 2813 0360",
            "curriculum": "本地課程",
            "funding_type": "資助",
            "through_train": True,
            "language_of_instruction": "中英文",
            "student_capacity": "110",
            "source": "Hard-coded Data"
        },
        {
            "school_no": "0007",
            "name_tc": "德瑞國際學校",
            "name_en": "GERMAN SWISS INTERNATIONAL SCHOOL",
            "district_tc": "中西區",
            "district_en": "Central & Western",
            "website": "https://www.gis.edu.hk",
            "application_page": "https://www.gis.edu.hk/admissions",
            "has_website": True,
            "website_verified": True,
            "address_tc": "香港山頂道11號",
            "address_en": "11 Peak Road, The Peak, Hong Kong",
            "tel": "+852 2849 6216",
            "curriculum": "國際課程",
            "funding_type": "私立",
            "through_train": False,
            "language_of_instruction": "德文",
            "student_capacity": "75",
            "source": "Hard-coded Data"
        },
        {
            "school_no": "0008",
            "name_tc": "法國國際學校",
            "name_en": "FRENCH INTERNATIONAL SCHOOL",
            "district_tc": "灣仔區",
            "district_en": "Wan Chai",
            "website": "https://www.lfis.edu.hk",
            "application_page": "https://www.lfis.edu.hk/admissions",
            "has_website": True,
            "website_verified": True,
            "address_tc": "香港跑馬地藍塘道165號",
            "address_en": "165 Blue Pool Road, Happy Valley, Hong Kong",
            "tel": "+852 2577 6217",
            "curriculum": "國際課程",
            "funding_type": "私立",
            "through_train": False,
            "language_of_instruction": "法文",
            "student_capacity": "85",
            "source": "Hard-coded Data"
        },
        {
            "school_no": "0009",
            "name_tc": "加拿大國際學校",
            "name_en": "CANADIAN INTERNATIONAL SCHOOL",
            "district_tc": "南區",
            "district_en": "Southern",
            "website": "https://www.cdnis.edu.hk",
            "application_page": "https://www.cdnis.edu.hk/admissions",
            "has_website": True,
            "website_verified": True,
            "address_tc": "香港南區黃竹坑南朗山道36號",
            "address_en": "36 Nam Long Shan Road, Aberdeen, Hong Kong",
            "tel": "+852 2525 7088",
            "curriculum": "國際課程",
            "funding_type": "私立",
            "through_train": True,
            "language_of_instruction": "英文",
            "student_capacity": "120",
            "source": "Hard-coded Data"
        },
        {
            "school_no": "0010",
            "name_tc": "澳洲國際學校",
            "name_en": "AUSTRALIAN INTERNATIONAL SCHOOL",
            "district_tc": "東區",
            "district_en": "Eastern",
            "website": "https://www.ais.edu.hk",
            "application_page": "https://www.ais.edu.hk/admissions",
            "has_website": True,
            "website_verified": True,
            "address_tc": "香港九龍灣宏光道4號",
            "address_en": "4 Lei King Road, Sai Wan Ho, Hong Kong",
            "tel": "+852 2304 6078",
            "curriculum": "國際課程",
            "funding_type": "私立",
            "through_train": False,
            "language_of_instruction": "英文",
            "student_capacity": "95",
            "source": "Hard-coded Data"
        }
    ]
    
    try:
        # Import database manager
        from database_cloud import CloudDatabaseManager
        
        # Initialize database manager
        db_manager = CloudDatabaseManager(storage_type="local")
        
        # Import each kindergarten
        imported_count = 0
        for kg in hardcoded_kindergartens:
            try:
                # Add timestamp
                kg["last_updated"] = datetime.now().isoformat()
                
                # Insert into database
                if db_manager.conn:
                    cursor = db_manager.conn.cursor()
                    cursor.execute('''
                        INSERT OR REPLACE INTO kindergartens (
                            school_no, name_en, name_tc, district_en, district_tc,
                            address_en, address_tc, tel, website, school_type,
                            curriculum, funding_type, through_train, language_of_instruction,
                            student_capacity, application_page, has_website, website_verified, 
                            last_updated, source
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        kg["school_no"], kg["name_en"], kg["name_tc"], kg["district_en"], kg["district_tc"],
                        kg["address_en"], kg["address_tc"], kg["tel"], kg["website"], "Kindergarten",
                        kg["curriculum"], kg["funding_type"], kg["through_train"], kg["language_of_instruction"],
                        kg["student_capacity"], kg["application_page"], kg["has_website"], kg["website_verified"], 
                        kg["last_updated"], kg["source"]
                    ))
                    db_manager.conn.commit()
                    imported_count += 1
                    print(f"✅ Imported: {kg['name_en']}")
                
            except Exception as e:
                print(f"❌ Error importing {kg['name_en']}: {e}")
        
        print(f"\n🎉 Successfully imported {imported_count} kindergartens")
        
    except Exception as e:
        print(f"❌ Error during import: {e}")
        import traceback
        traceback.print_exc()

def import_hardcoded_primary_schools():
    """Import hard-coded primary school data from Streamlit app into database"""
    
    print("\nImporting hard-coded primary school data...")
    
    # Hard-coded primary school data from streamlit_app.py
    hardcoded_primary_schools = [
        {
            "school_no": "P001",
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
            "source": "Hard-coded Data"
        },
        {
            "school_no": "P002",
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
            "source": "Hard-coded Data"
        },
        {
            "school_no": "P003",
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
            "source": "Hard-coded Data"
        },
        {
            "school_no": "P004",
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
            "source": "Hard-coded Data"
        },
        {
            "school_no": "P005",
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
            "source": "Hard-coded Data"
        },
        {
            "school_no": "P006",
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
            "source": "Hard-coded Data"
        },
        {
            "school_no": "P007",
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
            "source": "Hard-coded Data"
        },
        {
            "school_no": "P008",
            "name_en": "Australian International School",
            "name_tc": "澳洲國際學校",
            "district_en": "Eastern",
            "district_tc": "東區",
            "website": "https://www.ais.edu.hk",
            "application_page": "https://www.ais.edu.hk/admissions",
            "has_website": True,
            "website_verified": True,
            "address_en": "4 Lei King Road, Sai Wan Ho, Hong Kong",
            "address_tc": "香港九龍灣宏光道4號",
            "tel": "+852 2304 6078",
            "curriculum": "國際課程",
            "funding_type": "私立",
            "through_train": False,
            "language_of_instruction": "英文",
            "student_capacity": "600",
            "source": "Hard-coded Data"
        },
        {
            "school_no": "P009",
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
            "source": "Hard-coded Data"
        },
        {
            "school_no": "P010",
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
            "source": "Hard-coded Data"
        }
    ]
    
    try:
        # Import database manager
        from database_cloud import CloudDatabaseManager
        
        # Initialize database manager
        db_manager = CloudDatabaseManager(storage_type="local")
        
        # Import each primary school
        imported_count = 0
        for ps in hardcoded_primary_schools:
            try:
                # Add timestamp
                ps["last_updated"] = datetime.now().isoformat()
                
                # Insert into database
                if db_manager.conn:
                    cursor = db_manager.conn.cursor()
                    cursor.execute('''
                        INSERT OR REPLACE INTO primary_schools (
                            school_no, name_en, name_tc, district_en, district_tc,
                            address_en, address_tc, tel, website, school_type,
                            curriculum, funding_type, through_train, language_of_instruction,
                            student_capacity, application_page, has_website, website_verified, 
                            last_updated, source
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        ps["school_no"], ps["name_en"], ps["name_tc"], ps["district_en"], ps["district_tc"],
                        ps["address_en"], ps["address_tc"], ps["tel"], ps["website"], "Primary School",
                        ps["curriculum"], ps["funding_type"], ps["through_train"], ps["language_of_instruction"],
                        ps["student_capacity"], ps["application_page"], ps["has_website"], ps["website_verified"], 
                        ps["last_updated"], ps["source"]
                    ))
                    db_manager.conn.commit()
                    imported_count += 1
                    print(f"✅ Imported: {ps['name_en']}")
                
            except Exception as e:
                print(f"❌ Error importing {ps['name_en']}: {e}")
        
        print(f"\n🎉 Successfully imported {imported_count} primary schools")
        
    except Exception as e:
        print(f"❌ Error during import: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main function to import all hard-coded data"""
    print("🚀 Starting import of hard-coded school data...")
    print("=" * 60)
    
    # Import kindergartens
    import_hardcoded_kindergartens()
    
    # Import primary schools
    import_hardcoded_primary_schools()
    
    print("\n" + "=" * 60)
    print("✅ Import completed!")
    print("\nYou can now run the Streamlit app to see the imported data.")
    print("The app will load data from the database instead of hard-coded values.")

if __name__ == "__main__":
    main() 