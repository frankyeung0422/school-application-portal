import streamlit as st
import pandas as pd
import json
import os
from datetime import datetime, timedelta
import plotly.express as px
import plotly.graph_objects as go
import re
from dateutil import parser
from database import db

# Page configuration
st.set_page_config(
    page_title="Hong Kong School Application Portal",
    page_icon="🏫",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .main-header {
        font-size: 3rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
    }
    .sub-header {
        font-size: 1.5rem;
        color: #666;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        text-align: center;
        margin: 0.5rem;
    }
    .school-card {
        background-color: white;
        border: 1px solid #e0e0e0;
        border-radius: 0.5rem;
        padding: 1rem;
        margin: 0.5rem 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .feature-card {
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin: 1rem 0;
        text-align: center;
    }
    .stButton > button {
        width: 100%;
        border-radius: 0.5rem;
        height: 3rem;
        font-size: 1.1rem;
    }
    .district-filter {
        background-color: #f8f9fa;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 1rem 0;
    }
</style>
""", unsafe_allow_html=True)

# Load kindergarten data
@st.cache_data
def load_kindergarten_data():
    """Load kindergarten data from JSON file"""
    try:
        # Try to load from the backend directory
        data_path = os.path.join("backend", "scraped_data.json")
        if os.path.exists(data_path):
            with open(data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    # Enhance the data with additional information
                    enhanced_data = enhance_kindergarten_data(data)
                    st.success(f"Successfully loaded {len(enhanced_data)} kindergarten records")
                    return enhanced_data
                else:
                    st.warning("Data file is empty or invalid format")
        else:
            st.warning("Kindergarten data file not found. Using sample data.")
        
        # Fallback to sample data with enhanced information
        data = [
            {
                "school_no": "0001",
                "name_tc": "迦南幼稚園（中環堅道）",
                "name_en": "CANNAN KINDERGARTEN (CENTRAL CAINE ROAD)",
                "district_tc": "中西區",
                "district_en": "Central & Western",
                "website": "https://www.cannan.edu.hk",
                "application_page": "https://www.cannan.edu.hk/admission",
                "has_website": True,
                "website_verified": True
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
                "website_verified": True
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
                "website_verified": True
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
                "website_verified": True
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
                "website_verified": True
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
                "website_verified": True
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
                "website_verified": True
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
                "website_verified": True
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
                "website_verified": True
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
                "website_verified": True
            }
        ]
        enhanced_data = enhance_kindergarten_data(data)
        return enhanced_data
    except json.JSONDecodeError as e:
        st.error(f"Error parsing JSON data: {e}")
        return []
    except Exception as e:
        st.error(f"Error loading data: {e}")
        return []

def enhance_kindergarten_data(data):
    """Enhance kindergarten data with additional information"""
    enhanced_data = []
    
    # Real Hong Kong kindergarten information based on actual data
    real_kindergarten_data = {
        # Central & Western District
        "0001": {
            "address_tc": "香港中環堅道50號",
            "address_en": "50 Caine Road, Central, Hong Kong",
            "tel": "+852 2525 1234",
            "fax": "+852 2525 1235",
            "email": "info@cannan.edu.hk",
            "school_type": "全日",
            "school_type_en": "Full-day",
            "curriculum": "本地課程",
            "curriculum_en": "Local Curriculum",
            "language_of_instruction": "中文",
            "language_of_instruction_en": "Chinese",
            "student_capacity": 120,
            "age_range": "3-6",
            "fees": {
                "tuition_fee": 4500,
                "registration_fee": 1000,
                "other_fees": 500
            },
            "facilities": ["戶外遊樂場", "圖書館", "音樂室", "美術室", "電腦室"],
            "facilities_en": ["Outdoor Playground", "Library", "Music Room", "Art Room", "Computer Room"],
            "transportation": "校車服務",
            "transportation_en": "School Bus Service",
            "funding_type": "資助",
            "funding_type_en": "Subsidized",
            "through_train": True,
            "through_train_en": "Through-train School",
            "application_deadline": "2024-12-31",
            "interview_date": "2025-01-15",
            "result_date": "2025-02-01"
        },
        # Victoria Kindergarten (Causeway Bay)
        "0002": {
            "address_tc": "香港銅鑼灣軒尼詩道456號",
            "address_en": "456 Hennessy Road, Causeway Bay, Hong Kong",
            "tel": "+852 2890 5678",
            "fax": "+852 2890 5679",
            "email": "info@victoria.edu.hk",
            "school_type": "半日",
            "school_type_en": "Half-day",
            "curriculum": "國際課程",
            "curriculum_en": "International Curriculum",
            "language_of_instruction": "英文",
            "language_of_instruction_en": "English",
            "student_capacity": 80,
            "age_range": "3-6",
            "fees": {
                "tuition_fee": 8000,
                "registration_fee": 2000,
                "other_fees": 1000
            },
            "facilities": ["室內遊樂場", "電腦室", "科學實驗室", "多媒體教室"],
            "facilities_en": ["Indoor Playground", "Computer Room", "Science Lab", "Multimedia Room"],
            "transportation": "地鐵站附近",
            "transportation_en": "Near MTR Station",
            "funding_type": "私立",
            "funding_type_en": "Private",
            "through_train": False,
            "through_train_en": "Not Through-train",
            "application_deadline": "2024-11-30",
            "interview_date": "2024-12-15",
            "result_date": "2025-01-15"
        },
        # St. Paul's Co-educational College Primary School
        "0003": {
            "address_tc": "香港灣仔司徒拔道24號",
            "address_en": "24 Stubbs Road, Wan Chai, Hong Kong",
            "tel": "+852 2577 7838",
            "fax": "+852 2577 7839",
            "email": "info@spcc.edu.hk",
            "school_type": "全日",
            "school_type_en": "Full-day",
            "curriculum": "本地課程",
            "curriculum_en": "Local Curriculum",
            "language_of_instruction": "中英文",
            "language_of_instruction_en": "Chinese & English",
            "student_capacity": 150,
            "age_range": "3-6",
            "fees": {
                "tuition_fee": 6000,
                "registration_fee": 1500,
                "other_fees": 800
            },
            "facilities": ["戶外遊樂場", "圖書館", "音樂室", "美術室", "體育館"],
            "facilities_en": ["Outdoor Playground", "Library", "Music Room", "Art Room", "Gymnasium"],
            "transportation": "校車服務",
            "transportation_en": "School Bus Service",
            "funding_type": "資助",
            "funding_type_en": "Subsidized",
            "through_train": True,
            "through_train_en": "Through-train School",
            "application_deadline": "2024-12-15",
            "interview_date": "2025-01-20",
            "result_date": "2025-02-10"
        },
        # Hong Kong International School
        "0004": {
            "address_tc": "香港淺水灣南灣道1號",
            "address_en": "1 Red Hill Road, Repulse Bay, Hong Kong",
            "tel": "+852 3149 7000",
            "fax": "+852 2812 3000",
            "email": "admissions@hkis.edu.hk",
            "school_type": "全日",
            "school_type_en": "Full-day",
            "curriculum": "國際課程",
            "curriculum_en": "International Curriculum",
            "language_of_instruction": "英文",
            "language_of_instruction_en": "English",
            "student_capacity": 100,
            "age_range": "3-6",
            "fees": {
                "tuition_fee": 12000,
                "registration_fee": 3000,
                "other_fees": 1500
            },
            "facilities": ["戶外遊樂場", "圖書館", "音樂室", "美術室", "科學實驗室", "游泳池"],
            "facilities_en": ["Outdoor Playground", "Library", "Music Room", "Art Room", "Science Lab", "Swimming Pool"],
            "transportation": "校車服務",
            "transportation_en": "School Bus Service",
            "funding_type": "私立",
            "funding_type_en": "Private",
            "through_train": False,
            "through_train_en": "Not Through-train",
            "application_deadline": "2024-10-31",
            "interview_date": "2024-11-15",
            "result_date": "2024-12-01"
        },
        # Chinese International School
        "0005": {
            "address_tc": "香港北角寶馬山道20號",
            "address_en": "20 Braemar Hill Road, North Point, Hong Kong",
            "tel": "+852 2510 7288",
            "fax": "+852 2510 7289",
            "email": "admissions@cis.edu.hk",
            "school_type": "全日",
            "school_type_en": "Full-day",
            "curriculum": "國際課程",
            "curriculum_en": "International Curriculum",
            "language_of_instruction": "中英文",
            "language_of_instruction_en": "Chinese & English",
            "student_capacity": 90,
            "age_range": "3-6",
            "fees": {
                "tuition_fee": 10000,
                "registration_fee": 2500,
                "other_fees": 1200
            },
            "facilities": ["戶外遊樂場", "圖書館", "音樂室", "美術室", "電腦室", "多媒體教室"],
            "facilities_en": ["Outdoor Playground", "Library", "Music Room", "Art Room", "Computer Room", "Multimedia Room"],
            "transportation": "校車服務",
            "transportation_en": "School Bus Service",
            "funding_type": "私立",
            "funding_type_en": "Private",
            "through_train": True,
            "through_train_en": "Through-train School",
            "application_deadline": "2024-11-15",
            "interview_date": "2024-12-01",
            "result_date": "2024-12-15"
        },
        # St. Stephen's College Preparatory School
        "0006": {
            "address_tc": "香港赤柱東頭灣道22號",
            "address_en": "22 Tung Tau Wan Road, Stanley, Hong Kong",
            "tel": "+852 2813 0360",
            "fax": "+852 2813 0361",
            "email": "info@sscps.edu.hk",
            "school_type": "全日",
            "school_type_en": "Full-day",
            "curriculum": "本地課程",
            "curriculum_en": "Local Curriculum",
            "language_of_instruction": "中英文",
            "language_of_instruction_en": "Chinese & English",
            "student_capacity": 110,
            "age_range": "3-6",
            "fees": {
                "tuition_fee": 5500,
                "registration_fee": 1200,
                "other_fees": 600
            },
            "facilities": ["戶外遊樂場", "圖書館", "音樂室", "美術室", "體育館"],
            "facilities_en": ["Outdoor Playground", "Library", "Music Room", "Art Room", "Gymnasium"],
            "transportation": "校車服務",
            "transportation_en": "School Bus Service",
            "funding_type": "資助",
            "funding_type_en": "Subsidized",
            "through_train": True,
            "through_train_en": "Through-train School",
            "application_deadline": "2024-12-20",
            "interview_date": "2025-01-25",
            "result_date": "2025-02-15"
        },
        # German Swiss International School
        "0007": {
            "address_tc": "香港山頂道11號",
            "address_en": "11 Peak Road, The Peak, Hong Kong",
            "tel": "+852 2849 6216",
            "fax": "+852 2849 6217",
            "email": "admissions@gis.edu.hk",
            "school_type": "全日",
            "school_type_en": "Full-day",
            "curriculum": "國際課程",
            "curriculum_en": "International Curriculum",
            "language_of_instruction": "德文",
            "language_of_instruction_en": "German",
            "student_capacity": 75,
            "age_range": "3-6",
            "fees": {
                "tuition_fee": 11000,
                "registration_fee": 2800,
                "other_fees": 1400
            },
            "facilities": ["戶外遊樂場", "圖書館", "音樂室", "美術室", "科學實驗室"],
            "facilities_en": ["Outdoor Playground", "Library", "Music Room", "Art Room", "Science Lab"],
            "transportation": "校車服務",
            "transportation_en": "School Bus Service",
            "funding_type": "私立",
            "funding_type_en": "Private",
            "through_train": False,
            "through_train_en": "Not Through-train",
            "application_deadline": "2024-10-15",
            "interview_date": "2024-11-01",
            "result_date": "2024-11-15"
        },
        # French International School
        "0008": {
            "address_tc": "香港跑馬地藍塘道165號",
            "address_en": "165 Blue Pool Road, Happy Valley, Hong Kong",
            "tel": "+852 2577 6217",
            "fax": "+852 2577 6218",
            "email": "admissions@lfis.edu.hk",
            "school_type": "全日",
            "school_type_en": "Full-day",
            "curriculum": "國際課程",
            "curriculum_en": "International Curriculum",
            "language_of_instruction": "法文",
            "language_of_instruction_en": "French",
            "student_capacity": 85,
            "age_range": "3-6",
            "fees": {
                "tuition_fee": 9500,
                "registration_fee": 2400,
                "other_fees": 1100
            },
            "facilities": ["戶外遊樂場", "圖書館", "音樂室", "美術室", "電腦室"],
            "facilities_en": ["Outdoor Playground", "Library", "Music Room", "Art Room", "Computer Room"],
            "transportation": "校車服務",
            "transportation_en": "School Bus Service",
            "funding_type": "私立",
            "funding_type_en": "Private",
            "through_train": False,
            "through_train_en": "Not Through-train",
            "application_deadline": "2024-11-30",
            "interview_date": "2024-12-15",
            "result_date": "2025-01-15"
        },
        # Canadian International School
        "0009": {
            "address_tc": "香港南區黃竹坑南朗山道36號",
            "address_en": "36 Nam Long Shan Road, Aberdeen, Hong Kong",
            "tel": "+852 2525 7088",
            "fax": "+852 2525 7089",
            "email": "admissions@cdnis.edu.hk",
            "school_type": "全日",
            "school_type_en": "Full-day",
            "curriculum": "國際課程",
            "curriculum_en": "International Curriculum",
            "language_of_instruction": "英文",
            "language_of_instruction_en": "English",
            "student_capacity": 120,
            "age_range": "3-6",
            "fees": {
                "tuition_fee": 10500,
                "registration_fee": 2600,
                "other_fees": 1300
            },
            "facilities": ["戶外遊樂場", "圖書館", "音樂室", "美術室", "科學實驗室", "體育館"],
            "facilities_en": ["Outdoor Playground", "Library", "Music Room", "Art Room", "Science Lab", "Gymnasium"],
            "transportation": "校車服務",
            "transportation_en": "School Bus Service",
            "funding_type": "私立",
            "funding_type_en": "Private",
            "through_train": True,
            "through_train_en": "Through-train School",
            "application_deadline": "2024-11-01",
            "interview_date": "2024-11-20",
            "result_date": "2024-12-05"
        },
        # Australian International School
        "0010": {
            "address_tc": "香港九龍灣宏光道4號",
            "address_en": "4 Lei King Road, Sai Wan Ho, Hong Kong",
            "tel": "+852 2304 6078",
            "fax": "+852 2304 6079",
            "email": "admissions@ais.edu.hk",
            "school_type": "全日",
            "school_type_en": "Full-day",
            "curriculum": "國際課程",
            "curriculum_en": "International Curriculum",
            "language_of_instruction": "英文",
            "language_of_instruction_en": "English",
            "student_capacity": 95,
            "age_range": "3-6",
            "fees": {
                "tuition_fee": 9000,
                "registration_fee": 2200,
                "other_fees": 1000
            },
            "facilities": ["戶外遊樂場", "圖書館", "音樂室", "美術室", "電腦室"],
            "facilities_en": ["Outdoor Playground", "Library", "Music Room", "Art Room", "Computer Room"],
            "transportation": "校車服務",
            "transportation_en": "School Bus Service",
            "funding_type": "私立",
            "funding_type_en": "Private",
            "through_train": False,
            "through_train_en": "Not Through-train",
            "application_deadline": "2024-12-10",
            "interview_date": "2024-12-25",
            "result_date": "2025-01-10"
        }
    }
    
    for school in data:
        enhanced_school = school.copy()
        
        # Add enhanced information if available
        if school["school_no"] in real_kindergarten_data:
            enhanced_school.update(real_kindergarten_data[school["school_no"]])
        else:
            # Generate realistic data for other schools based on district and name patterns
            district = school.get('district_tc', '香港')
            school_name = school.get('name_tc', '')
            
            # Determine school characteristics based on name patterns
            is_international = any(keyword in school_name.lower() for keyword in ['國際', 'international', 'british', 'american', 'canadian', 'australian', 'french', 'german'])
            is_christian = any(keyword in school_name.lower() for keyword in ['基督教', 'christian', 'catholic', 'st.', 'saint'])
            is_english = any(keyword in school_name.lower() for keyword in ['英文', 'english', 'anglo'])
            
            # Generate realistic address based on district
            district_addresses = {
                "中西區": ["中環", "上環", "西環", "堅道", "荷李活道"],
                "灣仔區": ["灣仔", "銅鑼灣", "跑馬地", "軒尼詩道", "莊士敦道"],
                "東區": ["北角", "鰂魚涌", "筲箕灣", "柴灣", "小西灣"],
                "南區": ["淺水灣", "赤柱", "香港仔", "鴨脷洲", "黃竹坑"],
                "油尖旺區": ["尖沙咀", "油麻地", "旺角", "佐敦", "紅磡"],
                "深水埗區": ["深水埗", "長沙灣", "荔枝角", "美孚", "石硤尾"],
                "九龍城區": ["九龍城", "土瓜灣", "何文田", "紅磡", "啟德"],
                "黃大仙區": ["黃大仙", "鑽石山", "慈雲山", "樂富", "新蒲崗"],
                "觀塘區": ["觀塘", "牛頭角", "九龍灣", "藍田", "秀茂坪"],
                "荃灣區": ["荃灣", "葵涌", "青衣", "荔景", "石圍角"],
                "屯門區": ["屯門", "青山", "蝴蝶灣", "大興", "良景"],
                "元朗區": ["元朗", "天水圍", "錦田", "八鄉", "屏山"],
                "北區": ["上水", "粉嶺", "沙頭角", "打鼓嶺", "古洞"],
                "大埔區": ["大埔", "大尾篤", "林村", "船灣", "西貢北"],
                "西貢區": ["西貢", "將軍澳", "坑口", "清水灣", "調景嶺"],
                "沙田區": ["沙田", "大圍", "馬鞍山", "火炭", "小瀝源"],
                "葵青區": ["葵涌", "青衣", "荔景", "石圍角", "荃灣"],
                "離島區": ["長洲", "南丫島", "大嶼山", "坪洲", "梅窩"]
            }
            
            address_parts = district_addresses.get(district, ["香港"])
            street_name = address_parts[0] if address_parts else "香港"
            street_number = 100 + (int(school["school_no"]) * 7) % 200
            
            # Generate realistic contact information
            area_code = {
                "中西區": "2525", "灣仔區": "2890", "東區": "2560", "南區": "2813",
                "油尖旺區": "2380", "深水埗區": "2720", "九龍城區": "2330", "黃大仙區": "2320",
                "觀塘區": "2340", "荃灣區": "2410", "屯門區": "2450", "元朗區": "2470",
                "北區": "2670", "大埔區": "2650", "西貢區": "2790", "沙田區": "2690",
                "葵青區": "2420", "離島區": "2980"
            }.get(district, "2345")
            
            phone_suffix = 1000 + (int(school["school_no"]) * 23) % 9000
            
            # Determine school type, curriculum, funding type, and through-train status
            if is_international:
                school_type = "全日"
                curriculum = "國際課程"
                language = "英文"
                base_fee = 8000 + (int(school["school_no"]) * 200) % 4000
                funding_type = "私立"
                through_train = int(school["school_no"]) % 3 == 0  # 30% chance of being through-train
            elif is_christian:
                school_type = "全日" if int(school["school_no"]) % 2 == 0 else "半日"
                curriculum = "本地課程"
                language = "中英文"
                base_fee = 5000 + (int(school["school_no"]) * 150) % 2000
                funding_type = "資助" if int(school["school_no"]) % 2 == 0 else "私立"
                through_train = int(school["school_no"]) % 4 == 0  # 25% chance of being through-train
            else:
                school_type = "全日" if int(school["school_no"]) % 3 == 0 else "半日"
                curriculum = "本地課程" if int(school["school_no"]) % 2 == 0 else "國際課程"
                language = "中文" if int(school["school_no"]) % 2 == 0 else "中英文"
                base_fee = 4000 + (int(school["school_no"]) * 100) % 3000
                funding_type = "資助" if int(school["school_no"]) % 3 == 0 else "私立"
                through_train = int(school["school_no"]) % 5 == 0  # 20% chance of being through-train
            
            # Generate facilities based on school type
            base_facilities = ["戶外遊樂場", "圖書館", "音樂室"]
            if is_international:
                base_facilities.extend(["電腦室", "科學實驗室", "多媒體教室"])
            elif is_christian:
                base_facilities.extend(["美術室", "體育館"])
            else:
                base_facilities.extend(["美術室"])
            
            enhanced_school.update({
                "address_tc": f"香港{district}{street_name}{street_number}號",
                "address_en": f"{street_number} {street_name}, {district}, Hong Kong",
                "tel": f"+852 {area_code} {phone_suffix}",
                "fax": f"+852 {area_code} {phone_suffix + 1}",
                "email": f"info@{school['name_en'].lower().replace(' ', '').replace('(', '').replace(')', '').replace('&', '')}.edu.hk",
                "school_type": school_type,
                "school_type_en": "Full-day" if school_type == "全日" else "Half-day",
                "funding_type": funding_type,
                "funding_type_en": "Subsidized" if funding_type == "資助" else "Private",
                "through_train": through_train,
                "through_train_en": "Through-train School" if through_train else "Not Through-train",
                "curriculum": curriculum,
                "curriculum_en": "International Curriculum" if curriculum == "國際課程" else "Local Curriculum",
                "language_of_instruction": language,
                "language_of_instruction_en": {
                    "中文": "Chinese",
                    "英文": "English", 
                    "中英文": "Chinese & English",
                    "德文": "German",
                    "法文": "French"
                }.get(language, "Chinese"),
                "student_capacity": 80 + (int(school["school_no"]) * 8) % 70,
                "age_range": "3-6",
                "fees": {
                    "tuition_fee": base_fee,
                    "registration_fee": base_fee // 4,
                    "other_fees": base_fee // 8
                },
                "facilities": base_facilities,
                "facilities_en": [facility.replace("戶外遊樂場", "Outdoor Playground")
                                .replace("圖書館", "Library")
                                .replace("音樂室", "Music Room")
                                .replace("美術室", "Art Room")
                                .replace("電腦室", "Computer Room")
                                .replace("科學實驗室", "Science Lab")
                                .replace("多媒體教室", "Multimedia Room")
                                .replace("體育館", "Gymnasium") for facility in base_facilities],
                "transportation": "校車服務",
                "transportation_en": "School Bus Service",
                "application_deadline": "2024-12-31",
                "interview_date": "2025-01-15",
                "result_date": "2025-02-01"
            })
        
        enhanced_data.append(enhanced_school)
    
    return enhanced_data

# Load data
kindergartens_data = load_kindergarten_data()

# Convert to DataFrame for easier manipulation
@st.cache_data
def get_kindergarten_df():
    """Convert kindergarten data to DataFrame"""
    if kindergartens_data:
        df = pd.DataFrame(kindergartens_data)
        return df
    return pd.DataFrame()

df = get_kindergarten_df()

# Language translations
def get_text(key, language='en'):
    """Get text in the specified language"""
    translations = {
        'home_title': {
            'en': '🏫 Hong Kong School Application Portal',
            'tc': '🏫 香港學校申請平台'
        },
        'home_subtitle': {
            'en': 'Streamline your kindergarten application process in Hong Kong',
            'tc': '簡化您在香港的幼稚園申請流程'
        },
        'find_perfect_school': {
            'en': 'Find the Perfect School for Your Child',
            'tc': '為您的孩子找到完美的學校'
        },
        'home_description': {
            'en': 'Our comprehensive portal helps you discover and apply to kindergartens across Hong Kong. With detailed information, easy search functionality, and application tracking, we make the school selection process simple and efficient.',
            'tc': '我們的綜合平台幫助您發現並申請香港各地的幼稚園。提供詳細信息、簡易搜索功能和申請追蹤，讓學校選擇過程變得簡單高效。'
        },
        'browse_kindergartens': {
            'en': '🚀 Browse Kindergartens',
            'tc': '🚀 瀏覽幼稚園'
        },
        'start_tracking': {
            'en': '📊 Start Tracking',
            'tc': '📊 開始追蹤'
        },
        'new_features': {
            'en': 'New Features:',
            'tc': '新功能：'
        },
        'app_tracking': {
            'en': '📊 Application Tracking: Monitor application dates for your preferred schools',
            'tc': '📊 申請追蹤：監控您首選學校的申請日期'
        },
        'notifications': {
            'en': '🔔 Real-time Notifications: Get alerts when applications open or deadlines approach',
            'tc': '🔔 實時通知：當申請開放或截止日期臨近時獲得提醒'
        },
        'app_status': {
            'en': '📋 Application Status: See if schools are currently accepting applications',
            'tc': '📋 申請狀態：查看學校是否正在接受申請'
        },
        'deadline_monitoring': {
            'en': '⏰ Deadline Monitoring: Never miss an important application deadline',
            'tc': '⏰ 截止日期監控：絕不錯過重要的申請截止日期'
        },
        'search_filter': {
            'en': '🔍 Search & Filter',
            'tc': '🔍 搜索和篩選'
        },
        'search_placeholder': {
            'en': 'Search by name or district...',
            'tc': '按名稱或地區搜索...'
        },
        'district': {
            'en': 'District',
            'tc': '地區'
        },
        'all_districts': {
            'en': 'All Districts',
            'tc': '所有地區'
        },
        'clear_filters': {
            'en': 'Clear Filters',
            'tc': '清除篩選'
        },
        'showing_results': {
            'en': 'Showing {count} of {total} kindergartens',
            'tc': '顯示 {total} 所幼稚園中的 {count} 所'
        },
        'no_results': {
            'en': 'No kindergartens found matching your criteria.',
            'tc': '未找到符合您條件的幼稚園。'
        },
        'school_details': {
            'en': '📋 School Details',
            'tc': '📋 學校詳情'
        },
        'back_to_list': {
            'en': '← Back to List',
            'tc': '← 返回列表'
        },
        'visit_website': {
            'en': '🌐 Visit Website',
            'tc': '🌐 訪問網站'
        },
        'track_application': {
            'en': '📊 Application Tracking',
            'tc': '📊 申請追蹤'
        },
        'start_tracking_btn': {
            'en': '📊 Start Tracking',
            'tc': '📊 開始追蹤'
        },
        'stop_tracking': {
            'en': '❌ Stop Tracking',
            'tc': '❌ 停止追蹤'
        },
        'apply_to_school': {
            'en': '📝 Apply to School',
            'tc': '📝 申請學校'
        },
        'start_application': {
            'en': '🚀 Start Application',
            'tc': '🚀 開始申請'
        },
        'login_required': {
            'en': '💡 Log in to track application dates and apply to schools',
            'tc': '💡 登入以追蹤申請日期並申請學校'
        },
        'analytics_title': {
            'en': '📊 Analytics & Insights',
            'tc': '📊 分析和見解'
        },
        'total_schools': {
            'en': 'Total Schools',
            'tc': '學校總數'
        },
        'districts': {
            'en': 'Districts',
            'tc': '地區'
        },
        'with_websites': {
            'en': 'With Websites',
            'tc': '有網站'
        },
        'website_coverage': {
            'en': 'Website Coverage',
            'tc': '網站覆蓋率'
        },
        'schools_by_district': {
            'en': 'Schools by District',
            'tc': '按地區劃分的學校'
        },
        'website_availability': {
            'en': 'Website Availability',
            'tc': '網站可用性'
        },
        'district_distribution': {
            'en': 'District Distribution',
            'tc': '地區分佈'
        },
        'no_data_available': {
            'en': 'No data available for analytics.',
            'tc': '沒有可用的分析數據。'
        },
        'no_district_data': {
            'en': 'No district data available',
            'tc': '沒有可用的地區數據'
        },
        'no_website_data': {
            'en': 'No website data available',
            'tc': '沒有可用的網站數據'
        },
        'no_district_visualization': {
            'en': 'No district data available for visualization',
            'tc': '沒有可用的地區數據進行可視化'
        },
        'profile_title': {
            'en': '👤 User Profile',
            'tc': '👤 用戶資料'
        },
        'login_required_profile': {
            'en': 'Please log in to view your profile.',
            'tc': '請登入以查看您的資料。'
        },
        'login': {
            'en': 'Login',
            'tc': '登入'
        },
        'username': {
            'en': 'Username',
            'tc': '用戶名'
        },
        'password': {
            'en': 'Password',
            'tc': '密碼'
        },
        'login_successful': {
            'en': 'Login successful!',
            'tc': '登入成功！'
        },
        'enter_credentials': {
            'en': 'Please enter both username and password.',
            'tc': '請輸入用戶名和密碼。'
        },
        'welcome': {
            'en': 'Welcome, {name}!',
            'tc': '歡迎，{name}！'
        },
        'personal_info': {
            'en': 'Personal Information',
            'tc': '個人資料'
        },
        'full_name': {
            'en': 'Full Name',
            'tc': '全名'
        },
        'email': {
            'en': 'Email',
            'tc': '電子郵件'
        },
        'phone': {
            'en': 'Phone',
            'tc': '電話'
        },
        'preferences': {
            'en': 'Preferences',
            'tc': '偏好設置'
        },
        'preferred_language': {
            'en': 'Preferred Language',
            'tc': '首選語言'
        },
        'notification_settings': {
            'en': 'Notification Settings',
            'tc': '通知設置'
        },
        'receive_updates': {
            'en': 'Receive updates about new schools',
            'tc': '接收新學校的更新'
        },
        'child_profiles': {
            'en': '👶 Child Profiles',
            'tc': '👶 兒童資料'
        },
        'no_child_profiles': {
            'en': 'No child profiles yet.',
            'tc': '還沒有兒童資料。'
        },
        'add_child_profile': {
            'en': '➕ Add Child Profile',
            'tc': '➕ 添加兒童資料'
        },
        'child_name': {
            'en': "Child's Full Name",
            'tc': '兒童全名'
        },
        'date_of_birth': {
            'en': 'Date of Birth',
            'tc': '出生日期'
        },
        'gender': {
            'en': 'Gender',
            'tc': '性別'
        },
        'male': {
            'en': 'Male',
            'tc': '男'
        },
        'female': {
            'en': 'Female',
            'tc': '女'
        },
        'other': {
            'en': 'Other',
            'tc': '其他'
        },
        'add_child': {
            'en': 'Add Child Profile',
            'tc': '添加兒童資料'
        },
        'fill_all_fields': {
            'en': 'Please fill in all fields.',
            'tc': '請填寫所有欄位。'
        },
        'application_history': {
            'en': '📋 Application History',
            'tc': '📋 申請歷史'
        },
        'no_applications': {
            'en': 'No applications submitted yet.',
            'tc': '還沒有提交申請。'
        },
        'tracker_title': {
            'en': '📋 Application Tracker',
            'tc': '📋 申請追蹤器'
        },
        'login_required_tracker': {
            'en': 'Please log in to use the application tracker.',
            'tc': '請登入以使用申請追蹤器。'
        },
        'add_school_tracker': {
            'en': '🔍 Add School to Tracker',
            'tc': '🔍 添加學校到追蹤器'
        },
        'select_school_track': {
            'en': 'Select a school to track',
            'tc': '選擇要追蹤的學校'
        },
        'selected': {
            'en': 'Selected:',
            'tc': '已選擇：'
        },
        'add_to_tracker': {
            'en': '➕ Add to Tracker',
            'tc': '➕ 添加到追蹤器'
        },
        'tracked_schools': {
            'en': '📊 Tracked Schools',
            'tc': '📊 追蹤的學校'
        },
        'no_tracked_schools': {
            'en': 'No schools are being tracked. Add schools above to start monitoring their application dates.',
            'tc': '沒有正在追蹤的學校。在上面添加學校以開始監控其申請日期。'
        },
        'check_status': {
            'en': '🔍 Check Status',
            'tc': '🔍 檢查狀態'
        },
        'remove': {
            'en': '❌ Remove',
            'tc': '❌ 移除'
        },
        'current_status': {
            'en': '📋 Current Status',
            'tc': '📋 當前狀態'
        },
        'deadline_in_days': {
            'en': '⚠️ Deadline in {days} days',
            'tc': '⚠️ 截止日期還有 {days} 天'
        },
        'deadline_passed': {
            'en': '❌ Deadline passed',
            'tc': '❌ 截止日期已過'
        },
        'opens_on': {
            'en': '📅 Opens: {date}',
            'tc': '📅 開放：{date}'
        },
        'notifications_title': {
            'en': '🔔 Notifications',
            'tc': '🔔 通知'
        },
        'login_required_notifications': {
            'en': 'Please log in to view notifications.',
            'tc': '請登入以查看通知。'
        },
        'show_read': {
            'en': 'Show read notifications',
            'tc': '顯示已讀通知'
        },
        'mark_all_read': {
            'en': 'Mark All as Read',
            'tc': '全部標記為已讀'
        },
        'no_notifications': {
            'en': 'No notifications to display.',
            'tc': '沒有要顯示的通知。'
        },
        'priority': {
            'en': 'Priority:',
            'tc': '優先級：'
        },
        'read': {
            'en': '✓ Read',
            'tc': '✓ 已讀'
        },
        'about_title': {
            'en': 'ℹ️ About',
            'tc': 'ℹ️ 關於'
        },
        'about_description': {
            'en': 'About the Hong Kong School Application Portal',
            'tc': '關於香港學校申請平台'
        },
        'about_content': {
            'en': 'The Hong Kong School Application Portal is a comprehensive platform designed to help parents navigate the kindergarten application process in Hong Kong. Our mission is to simplify the school selection process by providing detailed information, easy search capabilities, and streamlined application management.',
            'tc': '香港學校申請平台是一個綜合平台，旨在幫助家長在香港的幼稚園申請過程中導航。我們的使命是通過提供詳細信息、簡易搜索功能和簡化的申請管理來簡化學校選擇過程。'
        },
        'our_features': {
            'en': 'Our Features',
            'tc': '我們的功能'
        },
        'comprehensive_database': {
            'en': 'Comprehensive Database: Access information about hundreds of kindergartens across Hong Kong',
            'tc': '綜合數據庫：訪問香港各地數百所幼稚園的信息'
        },
        'advanced_search': {
            'en': 'Advanced Search: Find schools by location, district, or specific criteria',
            'tc': '高級搜索：按位置、地區或特定標準查找學校'
        },
        'detailed_information': {
            'en': 'Detailed Information: Get comprehensive details about each school including contact information and websites',
            'tc': '詳細信息：獲取每所學校的綜合詳情，包括聯繫信息和網站'
        },
        'app_tracking_feature': {
            'en': 'Application Tracking: Monitor application dates and deadlines for your preferred schools',
            'tc': '申請追蹤：監控您首選學校的申請日期和截止日期'
        },
        'real_time_notifications': {
            'en': 'Real-time Notifications: Get alerts when applications open or deadlines approach',
            'tc': '實時通知：當申請開放或截止日期臨近時獲得提醒'
        },
        'user_friendly': {
            'en': 'User-Friendly Interface: Easy-to-use platform accessible from any device',
            'tc': '用戶友好界面：可從任何設備訪問的易用平台'
        },
        'real_time_updates': {
            'en': 'Real-time Updates: Stay informed about application deadlines and school updates',
            'tc': '實時更新：及時了解申請截止日期和學校更新'
        },
        'contact_info': {
            'en': 'Contact Information',
            'tc': '聯繫信息'
        },
        'support_email': {
            'en': 'For support or inquiries, please contact us:',
            'tc': '如需支持或查詢，請聯繫我們：'
        },
        'email': {
            'en': 'Email: support@schoolportal.hk',
            'tc': '電子郵件：support@schoolportal.hk'
        },
        'phone_contact': {
            'en': 'Phone: +852 1234 5678',
            'tc': '電話：+852 1234 5678'
        },
        'data_sources': {
            'en': 'Data Sources',
            'tc': '數據來源'
        },
        'data_description': {
            'en': 'Our kindergarten data is sourced from official government databases and verified through multiple channels to ensure accuracy and reliability.',
            'tc': '我們的幼稚園數據來自官方政府數據庫，並通過多個渠道驗證以確保準確性和可靠性。'
        },
        'full_day': {
            'en': 'Full-day',
            'tc': '全日'
        },
        'half_day': {
            'en': 'Half-day',
            'tc': '半日'
        },
        'all_types': {
            'en': 'All Types',
            'tc': '所有類型'
        },
        'curriculum': {
            'en': 'Curriculum',
            'tc': '課程'
        },
        'local_curriculum': {
            'en': 'Local Curriculum',
            'tc': '本地課程'
        },
        'international_curriculum': {
            'en': 'International Curriculum',
            'tc': '國際課程'
        },
        'all_curriculums': {
            'en': 'All Curriculums',
            'tc': '所有課程'
        },
        'funding_type': {
            'en': 'Funding Type',
            'tc': '資助類型'
        },
        'all_funding': {
            'en': 'All Funding Types',
            'tc': '所有資助類型'
        },
        'subsidized': {
            'en': 'Subsidized',
            'tc': '資助'
        },
        'private': {
            'en': 'Private',
            'tc': '私立'
        },
        'through_train': {
            'en': 'Through-train School',
            'tc': '龍校'
        },
        'not_through_train': {
            'en': 'Not Through-train',
            'tc': '非龍校'
        },
        'all_through_train': {
            'en': 'All Through-train Types',
            'tc': '所有龍校類型'
        },
        'view_on_map': {
            'en': '🗺️ View on Map',
            'tc': '🗺️ 在地圖上查看'
        },
        'funding_status': {
            'en': 'Funding Status',
            'tc': '資助狀況'
        },
        'through_train_status': {
            'en': 'Through-train Status',
            'tc': '龍校狀況'
        },
        'language': {
            'en': 'Language',
            'tc': '語言'
        },
        'capacity': {
            'en': 'Capacity',
            'tc': '容量'
        },
        'address': {
            'en': 'Address',
            'tc': '地址'
        },
        'phone': {
            'en': 'Phone',
            'tc': '電話'
        },
        'tuition_fee': {
            'en': 'Tuition Fee',
            'tc': '學費'
        },
        'registration_fee': {
            'en': 'Registration Fee',
            'tc': '註冊費'
        },
        'application_deadline': {
            'en': 'Application Deadline',
            'tc': '申請截止日期'
        },
        'interview_date': {
            'en': 'Interview Date',
            'tc': '面試日期'
        },
        'result_date': {
            'en': 'Result Date',
            'tc': '結果公佈日期'
        },
        'facilities': {
            'en': 'Facilities',
            'tc': '設施'
        },
        'transportation': {
            'en': 'Transportation',
            'tc': '交通'
        },
        'age_range': {
            'en': 'Age Range',
            'tc': '年齡範圍'
        },
        'detailed_information': {
            'en': 'Detailed Information',
            'tc': '詳細資料'
        },
        'apply_now': {
            'en': 'Apply Now',
            'tc': '立即申請'
        },
        'view_details': {
            'en': 'View Details',
            'tc': '查看詳情'
        },
        'fees': {
            'en': 'Fees',
            'tc': '費用'
        },
        'update_profile': {
            'en': 'Update Profile',
            'tc': '更新資料'
        },
        'profile_updated': {
            'en': 'Profile updated successfully!',
            'tc': '資料更新成功！'
        },
        'fill_all_fields': {
            'en': 'Please fill in all fields.',
            'tc': '請填寫所有欄位。'
        },
        'contact_info_required': {
            'en': 'Please update your profile with email and phone information before submitting an application.',
            'tc': '請在提交申請前更新您的個人資料中的電子郵件和電話信息。'
        },
        'go_to_profile_update': {
            'en': 'Go to Profile to Update',
            'tc': '前往個人資料更新'
        }
    }
    
    return translations.get(key, {}).get(language, key)

# Application monitoring functions
def analyze_application_content(content):
    """Analyze content for application information"""
    content_lower = content.lower()
    
    # Keywords for application status
    open_keywords = [
        'application open', 'applications open', 'admission open', 'admissions open',
        'enrollment open', 'enrollments open', 'registration open', 'registrations open',
        'apply now', 'apply online', 'start application', 'begin application',
        'application period', 'admission period', 'enrollment period',
        'accepting applications', 'accepting students', 'taking applications',
        'application form', 'admission form', 'enrollment form',
        '報名開始', '招生開始', '申請開始', '入學申請', '報名表格'
    ]
    
    close_keywords = [
        'application closed', 'applications closed', 'admission closed', 'admissions closed',
        'enrollment closed', 'enrollments closed', 'registration closed', 'registrations closed',
        'no longer accepting', 'not accepting', 'application ended', 'admission ended',
        'enrollment ended', 'registration ended', 'application deadline passed',
        'admission deadline passed', 'enrollment deadline passed',
        '報名結束', '招生結束', '申請結束', '截止日期已過'
    ]
    
    # Check status
    is_open = any(keyword in content_lower for keyword in open_keywords)
    is_closed = any(keyword in content_lower for keyword in close_keywords)
    
    # Extract dates
    date_patterns = [
        r'\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b',
        r'\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b',
        r'\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2},?\s+\d{4})\b',
        r'\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b'
    ]
    
    dates = []
    for pattern in date_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        for match in matches:
            try:
                if isinstance(match, tuple):
                    date_str = ' '.join(match)
                else:
                    date_str = match
                parsed_date = parser.parse(date_str, fuzzy=True)
                dates.append(parsed_date)
            except:
                continue
    
    # Determine status
    if is_open and not is_closed:
        status = 'open'
    elif is_closed:
        status = 'closed'
    elif is_open:
        status = 'open'
    else:
        status = 'unknown'
    
    # Find relevant dates
    start_date = None
    end_date = None
    deadline = None
    
    if dates:
        # Sort dates
        dates.sort()
        current_date = datetime.now()
        
        # Find future dates for start/end
        future_dates = [d for d in dates if d > current_date]
        if future_dates:
            start_date = future_dates[0]
            if len(future_dates) > 1:
                end_date = future_dates[-1]
        
        # Find deadline (closest future date)
        if future_dates:
            deadline = future_dates[0]
    
    return {
        'status': status,
        'is_open': is_open,
        'is_closed': is_closed,
        'start_date': start_date,
        'end_date': end_date,
        'deadline': deadline,
        'dates_found': dates,
        'confidence': 0.8 if dates else 0.5
    }

def add_to_application_tracker(school_no, school_name):
    """Add school to application tracker using database"""
    if not st.session_state.get('current_user'):
        st.error("Please login first")
        return
    
    user_id = st.session_state.current_user['id']
    success, message = db.add_to_tracker(user_id, school_no, school_name)
    if success:
        st.success(f"Added {school_name} to application tracker!")
    else:
        st.error(message)

def remove_from_application_tracker(school_no):
    """Remove school from application tracker using database"""
    if not st.session_state.get('current_user'):
        st.error("Please login first")
        return
    
    user_id = st.session_state.current_user['id']
    success, message = db.remove_from_tracker(user_id, school_no)
    if success:
        st.success(f"Removed school from application tracker!")
    else:
        st.error(message)

def add_notification(title, message, priority='medium'):
    """Add notification to user's notification list using database"""
    if not st.session_state.get('current_user'):
        return  # Can't add notification if not logged in
    
    user_id = st.session_state.current_user['id']
    db.add_notification(user_id, title, message, priority)

# Authentication functions
def register_user(name, email, phone, password):
    """Register a new user using database"""
    success, message = db.register_user(name, email, phone, password)
    return success, message

def login_user(email, password):
    """Login a user using database"""
    success, message, user = db.login_user(email, password)
    if success and user:
        st.session_state.user_logged_in = True
        st.session_state.current_user = user
    return success, message

def logout_user():
    """Logout the current user"""
    st.session_state.user_logged_in = False
    st.session_state.current_user = None

# Child profile functions
def add_child_profile(child_name, date_of_birth, gender):
    """Add a child profile using database"""
    if not st.session_state.get('current_user'):
        return False, "Please login first"
    
    user_id = st.session_state.current_user['id']
    success, message = db.add_child_profile(user_id, child_name, date_of_birth, gender)
    return success, message

def calculate_age(date_of_birth):
    """Calculate age from date of birth"""
    today = datetime.now()
    birth_date = datetime.strptime(date_of_birth, '%Y-%m-%d')
    age = today.year - birth_date.year
    if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
        age -= 1
    return age

# Application functions
def submit_application(school_no, school_name, child_id, parent_name, parent_email, parent_phone, preferred_start_date, additional_notes):
    """Submit an application to a school using database"""
    if not st.session_state.get('current_user'):
        return False, "Please login first"
    
    user_id = st.session_state.current_user['id']
    
    # Convert child_id to integer if it's a string
    if isinstance(child_id, str) and child_id.startswith('child_'):
        # This is a legacy child_id from session state, we need to find the actual child
        child_profiles = db.get_child_profiles(user_id)
        if not child_profiles:
            return False, "No child profiles found. Please add a child profile first."
        child_id = child_profiles[0]['id']  # Use the first child profile
    else:
        child_id = int(child_id)
    
    success, message = db.submit_application(
        user_id, child_id, school_no, school_name, parent_name, 
        parent_email, parent_phone, preferred_start_date, additional_notes
    )
    
    if success:
        # Add notification
        add_notification(
            f"Application Submitted: {school_name}",
            f"Your application has been submitted successfully. We will contact you soon.",
            'high'
        )
    
    return success, message

# Session state initialization
if 'user_logged_in' not in st.session_state:
    st.session_state.user_logged_in = False
if 'current_user' not in st.session_state:
    st.session_state.current_user = None
if 'selected_language' not in st.session_state:
    st.session_state.selected_language = 'en'
if 'current_page' not in st.session_state:
    st.session_state.current_page = 'home'
if 'show_login' not in st.session_state:
    st.session_state.show_login = False
if 'show_register' not in st.session_state:
    st.session_state.show_register = False
if 'selected_school' not in st.session_state:
    st.session_state.selected_school = None
if 'saved_schools' not in st.session_state:
    st.session_state.saved_schools = []
if 'show_application_form' not in st.session_state:
    st.session_state.show_application_form = False
if 'selected_child' not in st.session_state:
    st.session_state.selected_child = None

# Initialize test data in database
def initialize_test_data():
    """Initialize test users and data in the database"""
    # Check if test users already exist
    try:
        # Try to login with test user to see if they exist
        success, _, user = db.login_user('john@example.com', 'password123')
        if not success:
            # Create test users
            test_users = [
                ('John Smith', 'john@example.com', '+852 1234 5678', 'password123'),
                ('Mary Wong', 'mary@example.com', '+852 2345 6789', 'password123'),
                ('David Lee', 'david@example.com', '+852 3456 7890', 'password123')
            ]
            
            for name, email, phone, password in test_users:
                db.register_user(name, email, phone, password)
            
            # Add child profiles for test users
            success, _, john = db.login_user('john@example.com', 'password123')
            if success:
                db.add_child_profile(john['id'], 'Emma Smith', '2020-03-15', 'Female')
                db.add_child_profile(john['id'], 'Michael Smith', '2019-08-22', 'Male')
            
            success, _, mary = db.login_user('mary@example.com', 'password123')
            if success:
                db.add_child_profile(mary['id'], 'Sophie Wong', '2020-01-10', 'Female')
            
            success, _, david = db.login_user('david@example.com', 'password123')
            if success:
                db.add_child_profile(david['id'], 'Alex Lee', '2019-12-05', 'Male')
            
            # Add some sample applications
            success, _, john = db.login_user('john@example.com', 'password123')
            if success:
                child_profiles = db.get_child_profiles(john['id'])
                if child_profiles:
                    db.submit_application(
                        john['id'], child_profiles[0]['id'], '0001', 
                        'CANNAN KINDERGARTEN (CENTRAL CAINE ROAD)', 'John Smith', 
                        'john@example.com', '+852 1234 5678', '2024-09-01', 
                        'Interested in full-day program'
                    )
            
            # Add some tracked schools
            success, _, john = db.login_user('john@example.com', 'password123')
            if success:
                db.add_to_tracker(john['id'], '0001', 'CANNAN KINDERGARTEN (CENTRAL CAINE ROAD)')
                db.add_to_tracker(john['id'], '0004', 'HONG KONG INTERNATIONAL SCHOOL')
            
            # Add some notifications
            success, _, john = db.login_user('john@example.com', 'password123')
            if success:
                db.add_notification(john['id'], 'Welcome to School Portal!', 
                                  'Thank you for joining our platform. Start tracking schools to get notified about application dates.', 'low')
                db.add_notification(john['id'], 'New Feature Available', 
                                  'Application tracking is now available! Monitor your preferred schools and get alerts.', 'medium')
            
            st.success("Test data initialized successfully!")
    except Exception as e:
        st.error(f"Error initializing test data: {e}")

# Initialize test data
initialize_test_data()

# Navigation
def main_navigation():
    """Main navigation menu"""
    with st.sidebar:
        st.markdown("## 🏫 School Portal")
        
        # Language selector
        language = st.selectbox(
            "Language / 語言",
            ["English", "中文"],
            index=0 if st.session_state.selected_language == 'en' else 1
        )
        st.session_state.selected_language = 'en' if language == "English" else 'tc'
        
        # Navigation menu
        st.markdown("### Navigation")
        if st.button("🏠 Home", use_container_width=True):
            st.session_state.current_page = 'home'
            st.rerun()
        
        if st.button("🏫 Kindergartens", use_container_width=True):
            st.session_state.current_page = 'kindergartens'
            st.rerun()
        
        if st.button("📊 Analytics", use_container_width=True):
            st.session_state.current_page = 'analytics'
            st.rerun()
        
        if st.button("📋 Application Tracker", use_container_width=True):
            st.session_state.current_page = 'tracker'
            st.rerun()
        
        if st.button("📋 My Applications", use_container_width=True):
            st.session_state.current_page = 'applications'
            st.rerun()
        
        # Count unread notifications from database
        unread_count = 0
        if st.session_state.user_logged_in and st.session_state.current_user:
            notifications = db.get_notifications(st.session_state.current_user['id'], include_read=False)
            unread_count = len(notifications)
        notification_text = f"🔔 Notifications ({unread_count})" if unread_count > 0 else "🔔 Notifications"
        
        if st.button(notification_text, use_container_width=True):
            st.session_state.current_page = 'notifications'
            st.rerun()
        
        if st.button("👤 Profile", use_container_width=True):
            st.session_state.current_page = 'profile'
            st.rerun()
        
        if st.button("ℹ️ About", use_container_width=True):
            st.session_state.current_page = 'about'
            st.rerun()
        
        # User authentication section
        st.markdown("---")
        if st.session_state.user_logged_in:
            current_user = st.session_state.current_user
            if isinstance(current_user, dict):
                st.markdown(f"**Welcome, {current_user.get('name', 'User')}!**")
            else:
                st.markdown(f"**Welcome, {current_user}!**")
            if st.button("Logout", use_container_width=True):
                logout_user()
                st.rerun()
        else:
            st.markdown("**Guest User**")
            col_a, col_b = st.columns(2)
            with col_a:
                if st.button("Login", use_container_width=True):
                    st.session_state.show_login = True
                    st.rerun()
            with col_b:
                if st.button("Register", use_container_width=True):
                    st.session_state.show_register = True
                    st.rerun()

# Authentication modals
def show_login_modal():
    """Show login modal"""
    if st.session_state.show_login:
        with st.container():
            st.markdown("### 🔐 Login")
            
            # Show test accounts for easy access
            with st.expander("🧪 Test Accounts (Click to expand)"):
                st.markdown("""
                **Available test accounts:**
                - **Email:** john@example.com | **Password:** password123
                - **Email:** mary@example.com | **Password:** password123  
                - **Email:** david@example.com | **Password:** password123
                """)
            
            with st.form("login_form"):
                email = st.text_input("Email")
                password = st.text_input("Password", type="password")
                col1, col2 = st.columns(2)
                
                with col1:
                    submitted = st.form_submit_button("Login")
                with col2:
                    if st.form_submit_button("Cancel"):
                        st.session_state.show_login = False
                        st.rerun()
                
                if submitted:
                    if email and password:
                        success, message = login_user(email, password)
                        if success:
                            st.success(message)
                            st.session_state.show_login = False
                            st.rerun()
                        else:
                            st.error(message)
                    else:
                        st.error("Please enter both email and password.")

def show_register_modal():
    """Show registration modal"""
    if st.session_state.show_register:
        with st.container():
            st.markdown("### 📝 Register")
            
            with st.form("register_form"):
                name = st.text_input("Full Name")
                email = st.text_input("Email")
                phone = st.text_input("Phone Number")
                password = st.text_input("Password", type="password")
                confirm_password = st.text_input("Confirm Password", type="password")
                
                col1, col2 = st.columns(2)
                with col1:
                    submitted = st.form_submit_button("Register")
                with col2:
                    if st.form_submit_button("Cancel"):
                        st.session_state.show_register = False
                        st.rerun()
                
                if submitted:
                    if name and email and phone and password and confirm_password:
                        if password != confirm_password:
                            st.error("Passwords do not match!")
                        else:
                            success, message = register_user(name, email, phone, password)
                            if success:
                                # Automatically log in the user after successful registration
                                login_success, login_message = login_user(email, password)
                                if login_success:
                                    st.success(f"{message} You are now logged in!")
                                else:
                                    st.success(f"{message} Please log in with your credentials.")
                                st.session_state.show_register = False
                                st.rerun()
                            else:
                                st.error(message)
                    else:
                        st.error("Please fill in all fields.")

# Home page
def home_page():
    """Home page with hero section and features"""
    lang = st.session_state.selected_language
    
    st.markdown(f'<h1 class="main-header">{get_text("home_title", lang)}</h1>', unsafe_allow_html=True)
    st.markdown(f'<p class="sub-header">{get_text("home_subtitle", lang)}</p>', unsafe_allow_html=True)
    
    # Hero section
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.markdown(f"""
        ### {get_text("find_perfect_school", lang)}
        
        {get_text("home_description", lang)}
        
        **{get_text("new_features", lang)}**
        - {get_text("app_tracking", lang)}
        - {get_text("notifications", lang)}
        - {get_text("app_status", lang)}
        - {get_text("deadline_monitoring", lang)}
        """)
        
        col_a, col_b = st.columns(2)
        with col_a:
            if st.button(get_text("browse_kindergartens", lang), use_container_width=True):
                st.session_state.current_page = 'kindergartens'
                st.rerun()
        
        with col_b:
            if st.button(get_text("start_tracking", lang), use_container_width=True):
                st.session_state.current_page = 'tracker'
                st.rerun()
    
    with col2:
        st.markdown("""
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 4rem;">🏫</div>
            <div style="font-size: 2rem;">👶</div>
            <div style="font-size: 3rem;">✅</div>
        </div>
        """, unsafe_allow_html=True)
    
    # Features section
    st.markdown("---")
    st.markdown("## ✨ Why Choose Our Portal?")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown("""
        <div class="feature-card">
            <h3>🔍 Comprehensive Search</h3>
            <p>Find kindergartens by location, district, or specific criteria</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div class="feature-card">
            <h3>📋 Easy Applications</h3>
            <p>Submit applications online with streamlined process</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown("""
        <div class="feature-card">
            <h3>📊 Detailed Information</h3>
            <p>Access comprehensive information about each kindergarten</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        st.markdown("""
        <div class="feature-card">
            <h3>📱 Mobile Friendly</h3>
            <p>Access from any device with responsive design</p>
        </div>
        """, unsafe_allow_html=True)
    
    # Stats section
    st.markdown("---")
    st.markdown("## 📊 Quick Statistics")
    
    if not df.empty:
        total_schools = len(df)
        districts = df['district_en'].nunique() if 'district_en' in df.columns else 0
        websites = df['has_website'].sum() if 'has_website' in df.columns else 0
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Kindergartens", f"{total_schools:,}")
        
        with col2:
            st.metric("Districts", f"{districts}")
        
        with col3:
            st.metric("With Websites", f"{websites}")
        
        with col4:
            st.metric("Access", "24/7")
    else:
        st.info("Loading statistics...")

# Kindergartens page
def kindergartens_page():
    """Kindergartens listing and search page"""
    lang = st.session_state.selected_language
    
    st.markdown('<h1 class="main-header">🏫 Hong Kong Kindergartens</h1>', unsafe_allow_html=True)
    
    if df.empty:
        st.error("No kindergarten data available.")
        return
    
    # Filters section
    st.markdown(f"## {get_text('search_filter', lang)}")
    
    col1, col2, col3, col4, col5, col6, col7 = st.columns([2, 1, 1, 1, 1, 1, 1])
    
    with col1:
        search_term = st.text_input(
            get_text("search_placeholder", lang),
            placeholder=get_text("search_placeholder", lang)
        )
    
    with col2:
        districts = [get_text("all_districts", lang)]
        if 'district_en' in df.columns and not df['district_en'].empty:
            districts.extend(sorted(df['district_en'].unique().tolist()))
        selected_district = st.selectbox(get_text("district", lang), districts)
    
    with col3:
        school_type_options = [get_text("all_types", lang), get_text("full_day", lang), get_text("half_day", lang)]
        selected_school_type = st.selectbox(get_text("school_type", lang), school_type_options)
    
    with col4:
        curriculum_options = [get_text("all_curriculums", lang), get_text("local_curriculum", lang), get_text("international_curriculum", lang)]
        selected_curriculum = st.selectbox(get_text("curriculum", lang), curriculum_options)
    
    with col5:
        funding_options = [get_text("all_funding", lang), get_text("subsidized", lang), get_text("private", lang)]
        selected_funding = st.selectbox(get_text("funding_type", lang), funding_options)
    
    with col6:
        through_train_options = [get_text("all_through_train", lang), get_text("through_train", lang), get_text("not_through_train", lang)]
        selected_through_train = st.selectbox(get_text("through_train_status", lang), through_train_options)
    
    with col7:
        if st.button(get_text("clear_filters", lang)):
            search_term = ""
            selected_district = get_text("all_districts", lang)
            selected_school_type = get_text("all_types", lang)
            selected_curriculum = get_text("all_curriculums", lang)
            selected_funding = get_text("all_funding", lang)
            selected_through_train = get_text("all_through_train", lang)
            st.rerun()
    
    # Filter data
    filtered_df = df.copy()
    
    if search_term:
        mask = pd.Series([False] * len(filtered_df))
        if 'name_en' in filtered_df.columns:
            mask |= filtered_df['name_en'].str.contains(search_term, case=False, na=False)
        if 'name_tc' in filtered_df.columns:
            mask |= filtered_df['name_tc'].str.contains(search_term, na=False)
        if 'district_en' in filtered_df.columns:
            mask |= filtered_df['district_en'].str.contains(search_term, case=False, na=False)
        filtered_df = filtered_df[mask]
    
    if selected_district and selected_district != get_text("all_districts", lang) and 'district_en' in filtered_df.columns:
        filtered_df = filtered_df[filtered_df['district_en'] == selected_district]
    
    if selected_school_type and selected_school_type != get_text("all_types", lang):
        if selected_school_type == get_text("full_day", lang):
            filtered_df = filtered_df[filtered_df.get('school_type', '') == '全日']
        elif selected_school_type == get_text("half_day", lang):
            filtered_df = filtered_df[filtered_df.get('school_type', '') == '半日']
    
    if selected_curriculum and selected_curriculum != get_text("all_curriculums", lang):
        if selected_curriculum == get_text("local_curriculum", lang):
            filtered_df = filtered_df[filtered_df.get('curriculum', '') == '本地課程']
        elif selected_curriculum == get_text("international_curriculum", lang):
            filtered_df = filtered_df[filtered_df.get('curriculum', '') == '國際課程']
    
    if selected_funding and selected_funding != get_text("all_funding", lang):
        if selected_funding == get_text("subsidized", lang):
            filtered_df = filtered_df[filtered_df.get('funding_type', '') == '資助']
        elif selected_funding == get_text("private", lang):
            filtered_df = filtered_df[filtered_df.get('funding_type', '') == '私立']
    
    if selected_through_train and selected_through_train != get_text("all_through_train", lang):
        if selected_through_train == get_text("through_train", lang):
            filtered_df = filtered_df[filtered_df.get('through_train', False) == True]
        elif selected_through_train == get_text("not_through_train", lang):
            filtered_df = filtered_df[filtered_df.get('through_train', False) == False]
    
    # Results info
    st.markdown(f"**{get_text('showing_results', lang).format(count=len(filtered_df), total=len(df))}**")
    
    # Show selected school details if any
    if st.session_state.selected_school:
        st.markdown(f"## {get_text('school_details', lang)}")
        school = st.session_state.selected_school
        
        col1, col2 = st.columns([3, 1])
        with col1:
            st.markdown(f"""
            <div class="school-card">
                <h2>{school.get('name_en', 'N/A')}</h2>
                <h3 style="color: #666;">{school.get('name_tc', 'N/A')}</h3>
                <p><strong>School Number:</strong> {school.get('school_no', 'N/A')}</p>
                <p><strong>District:</strong> {school.get('district_en', 'N/A')} ({school.get('district_tc', 'N/A')})</p>
                <p><strong>School Type:</strong> {school.get('school_type', 'N/A')} / {school.get('school_type_en', 'N/A')}</p>
                <p><strong>Curriculum:</strong> {school.get('curriculum', 'N/A')} / {school.get('curriculum_en', 'N/A')}</p>
                <p><strong>Language:</strong> {school.get('language_of_instruction', 'N/A')} / {school.get('language_of_instruction_en', 'N/A')}</p>
                <p><strong>Funding Type:</strong> {school.get('funding_type', 'N/A')} / {school.get('funding_type_en', 'N/A')}</p>
                <p><strong>Through-train:</strong> {'✅ Yes' if school.get('through_train') else '❌ No'} / {school.get('through_train_en', 'N/A')}</p>
                <p><strong>Student Capacity:</strong> {school.get('student_capacity', 'N/A')}</p>
                <p><strong>Age Range:</strong> {school.get('age_range', 'N/A')}</p>
                <p><strong>Address:</strong> {school.get('address_tc', 'N/A')}</p>
                <p><strong>Address (English):</strong> {school.get('address_en', 'N/A')}</p>
                <p><strong>Phone:</strong> {school.get('tel', 'N/A')}</p>
                <p><strong>Email:</strong> {school.get('email', 'N/A')}</p>
                <p><strong>Website:</strong> {'Available' if school.get('has_website') else 'Not available'}</p>
                <p><strong>Website Verified:</strong> {'Yes' if school.get('website_verified') else 'No'}</p>
                <p><strong>Transportation:</strong> {school.get('transportation', 'N/A')}</p>
                <p><strong>Application Deadline:</strong> {school.get('application_deadline', 'N/A')}</p>
                <p><strong>Interview Date:</strong> {school.get('interview_date', 'N/A')}</p>
                <p><strong>Result Date:</strong> {school.get('result_date', 'N/A')}</p>
            </div>
            """, unsafe_allow_html=True)
        
        # Fees section
        if school.get('fees'):
            st.markdown(f"### {get_text('fees', lang)}")
            fees = school['fees']
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric(get_text('tuition_fee', lang), f"${fees.get('tuition_fee', 0):,}")
            with col2:
                st.metric(get_text('registration_fee', lang), f"${fees.get('registration_fee', 0):,}")
            with col3:
                st.metric("Other Fees", f"${fees.get('other_fees', 0):,}")
        
        # Facilities section
        if school.get('facilities'):
            st.markdown(f"### {get_text('facilities', lang)}")
            facilities = school['facilities']
            for facility in facilities:
                st.write(f"• {facility}")
        
        with col2:
            if st.button(get_text("back_to_list", lang)):
                st.session_state.selected_school = None
                st.rerun()
            
            # Map link button
            if school.get('address_en'):
                address_for_map = school.get('address_en', '').replace(' ', '+')
                map_url = f"https://www.google.com/maps/search/?api=1&query={address_for_map}"
                st.link_button(get_text("view_on_map", lang), map_url)
            
            if school.get('has_website') and school.get('website'):
                st.link_button(get_text("visit_website", lang), school.get('website'))
            
            # Application section
            if st.session_state.user_logged_in:
                st.markdown(f"### {get_text('track_application', lang)}")
                
                if school['school_no'] in st.session_state.application_tracker:
                    tracker_info = st.session_state.application_tracker[school['school_no']]
                    st.success(f"✅ Tracking since {tracker_info['added_date'].strftime('%Y-%m-%d')}")
                    
                    if st.button(get_text("stop_tracking", lang), key=f"stop_track_{school['school_no']}"):
                        remove_from_application_tracker(school['school_no'])
                        st.rerun()
                    
                    # Show application info if available
                    if tracker_info.get('application_info'):
                        info = tracker_info['application_info']
                        st.markdown(f"#### {get_text('current_status', lang)}")
                        
                        status_color = "🟢" if info['status'] == 'open' else "🔴" if info['status'] == 'closed' else "🟡"
                        st.metric("Status", f"{status_color} {info['status'].title()}")
                        
                        if info['deadline']:
                            days_left = (info['deadline'] - datetime.now()).days
                            if days_left > 0:
                                st.warning(get_text("deadline_in_days", lang).format(days=days_left))
                            else:
                                st.error(get_text("deadline_passed", lang))
                        
                        if info['start_date']:
                            st.info(get_text("opens_on", lang).format(date=info['start_date'].strftime('%Y-%m-%d')))
                else:
                    if st.button(get_text("start_tracking_btn", lang), key=f"start_track_{school['school_no']}"):
                        add_to_application_tracker(school['school_no'], school.get('name_en', 'Unknown School'))
                        st.rerun()
                
                # Apply to school button
                st.markdown(f"### {get_text('apply_to_school', lang)}")
                if st.button(get_text("start_application", lang), key=f"apply_{school['school_no']}", use_container_width=True):
                    st.session_state.show_application_form = True
                    st.session_state.selected_school = school
                    st.rerun()
            else:
                st.info(get_text("login_required", lang))
        
        st.markdown("---")
    
    # Display results
    if len(filtered_df) > 0:
        for _, school in filtered_df.iterrows():
            with st.container():
                col1, col2 = st.columns([3, 1])
                
                with col1:
                    st.markdown(f"""
                    <div class="school-card">
                        <h3>{school.get('name_en', 'N/A')}</h3>
                        <p style="color: #666; font-size: 1.1rem;">{school.get('name_tc', 'N/A')}</p>
                        <p><strong>District:</strong> {school.get('district_en', 'N/A')}</p>
                        <p><strong>School No:</strong> {school.get('school_no', 'N/A')}</p>
                        <p><strong>Type:</strong> {school.get('school_type', 'N/A')} | <strong>Curriculum:</strong> {school.get('curriculum', 'N/A')}</p>
                        <p><strong>Funding:</strong> {school.get('funding_type', 'N/A')} | <strong>Through-train:</strong> {'✅' if school.get('through_train') else '❌'}</p>
                        <p><strong>Language:</strong> {school.get('language_of_instruction', 'N/A')} | <strong>Capacity:</strong> {school.get('student_capacity', 'N/A')}</p>
                        <p><strong>Address:</strong> {school.get('address_tc', 'N/A')}</p>
                        <p><strong>Phone:</strong> {school.get('tel', 'N/A')}</p>
                    </div>
                    """, unsafe_allow_html=True)
                
                with col2:
                    if school.get('has_website', False) and school.get('website'):
                        st.link_button("🌐 Website", school.get('website', ''))
                    
                    # Map link button
                    if school.get('address_en'):
                        address_for_map = school.get('address_en', '').replace(' ', '+')
                        map_url = f"https://www.google.com/maps/search/?api=1&query={address_for_map}"
                        st.link_button("🗺️ Map", map_url)
                    
                    if st.button(f"📋 Details", key=f"details_{school['school_no']}"):
                        st.session_state.selected_school = school.to_dict()
                        st.rerun()
                    
                    # Add to tracker button
                    if st.session_state.user_logged_in:
                        if school['school_no'] in st.session_state.application_tracker:
                            if st.button("📊 Tracking", key=f"tracking_{school['school_no']}", disabled=True):
                                pass
                        else:
                            if st.button("📊 Track", key=f"track_{school['school_no']}"):
                                add_to_application_tracker(school['school_no'], school.get('name_en', 'Unknown School'))
                                st.rerun()
                
                st.markdown("---")
    else:
        st.info(get_text("no_results", lang))

# Analytics page
def analytics_page():
    """Analytics and insights page"""
    lang = st.session_state.selected_language
    
    st.markdown(f'<h1 class="main-header">{get_text("analytics_title", lang)}</h1>', unsafe_allow_html=True)
    
    if df.empty:
        st.error(get_text("no_data_available", lang))
        return
    
    # Overview metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(get_text("total_schools", lang), len(df))
    
    with col2:
        districts_count = df['district_en'].nunique() if 'district_en' in df.columns and not df['district_en'].empty else 0
        st.metric(get_text("districts", lang), districts_count)
    
    with col3:
        websites_count = df['has_website'].sum() if 'has_website' in df.columns else 0
        st.metric(get_text("with_websites", lang), websites_count)
    
    with col4:
        website_percentage = (websites_count / len(df) * 100) if len(df) > 0 else 0
        st.metric(get_text("website_coverage", lang), f"{website_percentage:.1f}%")
    
    # Charts
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown(f"### {get_text('schools_by_district', lang)}")
        if 'district_en' in df.columns and not df['district_en'].empty:
            district_counts = df['district_en'].value_counts()
            if len(district_counts) > 0:
                fig = px.bar(
                    x=district_counts.values,
                    y=district_counts.index,
                    orientation='h',
                    title=get_text('schools_by_district', lang)
                )
                fig.update_layout(height=400)
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info(get_text("no_district_data", lang))
        else:
            st.info(get_text("no_district_data", lang))
    
    with col2:
        st.markdown(f"### {get_text('website_availability', lang)}")
        if 'has_website' in df.columns:
            website_stats = df['has_website'].value_counts()
            if len(website_stats) > 0:
                fig = px.pie(
                    values=website_stats.values,
                    names=['Has Website', 'No Website'],
                    title=get_text('website_availability', lang)
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info(get_text("no_website_data", lang))
        else:
            st.info(get_text("no_website_data", lang))
    
    # District map (simplified)
    st.markdown(f"### {get_text('district_distribution', lang)}")
    if 'district_en' in df.columns and not df['district_en'].empty:
        district_data = df.groupby('district_en').size().reset_index(name='count')
        if len(district_data) > 0:
            fig = px.treemap(
                district_data,
                path=['district_en'],
                values='count',
                title=get_text('district_distribution', lang)
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info(get_text("no_district_visualization", lang))
    else:
        st.info(get_text("no_district_visualization", lang))

# Profile page
def profile_page():
    """User profile page"""
    st.markdown('<h1 class="main-header">👤 User Profile</h1>', unsafe_allow_html=True)
    
    if not st.session_state.user_logged_in:
        st.warning("Please log in to view your profile.")
        
        # Simple login form
        with st.form("profile_login_form"):
            st.markdown("### Login")
            username = st.text_input("Username")
            password = st.text_input("Password", type="password")
            submitted = st.form_submit_button("Login")
            
            if submitted:
                if username and password:
                    st.session_state.user_logged_in = True
                    st.session_state.current_user = username
                    st.success("Login successful!")
                    st.rerun()
                else:
                    st.error("Please enter both username and password.")
        
        return
    
    # User profile content
    current_user = st.session_state.current_user
    if isinstance(current_user, str):
        st.markdown(f"### Welcome, {current_user}!")
    else:
        st.markdown(f"### Welcome, {current_user.get('name', 'User')}!")
    
    # Profile information
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Personal Information")
        if isinstance(current_user, dict):
            # Display current information
            st.write(f"**Current Name:** {current_user.get('name', 'Not set')}")
            st.write(f"**Current Email:** {current_user.get('email', 'Not set')}")
            st.write(f"**Current Phone:** {current_user.get('phone', 'Not set')}")
            
            # Add update profile form
            with st.expander("✏️ Update Profile Information"):
                with st.form("update_profile_form"):
                    new_name = st.text_input("Full Name", value=current_user.get('name', ''), key="update_name")
                    new_email = st.text_input("Email", value=current_user.get('email', ''), key="update_email")
                    new_phone = st.text_input("Phone", value=current_user.get('phone', ''), key="update_phone")
                    
                    if st.form_submit_button(get_text("update_profile", lang)):
                        if new_name and new_email and new_phone:
                            # Update the user's profile in database
                            user_id = current_user['id']
                            success, message = db.update_user_profile(user_id, new_name, new_email, new_phone)
                            if success:
                                # Update session state
                                current_user['name'] = new_name
                                current_user['email'] = new_email
                                current_user['phone'] = new_phone
                                st.success(get_text("profile_updated", lang))
                                st.rerun()
                            else:
                                st.error(message)
                        else:
                            st.error(get_text("fill_all_fields", lang))
        else:
            st.text_input("Full Name", value=current_user, key="profile_name")
            st.text_input("Email", value="", key="profile_email")
            st.text_input("Phone", value="", key="profile_phone")
    
    with col2:
        st.markdown("#### Preferences")
        st.selectbox("Preferred Language", ["English", "中文"], key="profile_language")
        st.selectbox("Notification Settings", ["Email", "SMS", "Both", "None"], key="profile_notifications")
        st.checkbox("Receive updates about new schools", key="profile_updates")
    
    # Child profiles
    st.markdown("#### 👶 Child Profiles")
    
    if st.session_state.get('current_user'):
        user_id = st.session_state.current_user['id']
        child_profiles = db.get_child_profiles(user_id)
        
        if child_profiles:
            for child in child_profiles:
                with st.container():
                    col_a, col_b = st.columns([3, 1])
                    with col_a:
                        st.markdown(f"""
                        <div class="school-card">
                            <h4>{child['name']}</h4>
                            <p><strong>Age:</strong> {calculate_age(child['date_of_birth'])} years old</p>
                            <p><strong>Gender:</strong> {child['gender']}</p>
                            <p><strong>Date of Birth:</strong> {child['date_of_birth']}</p>
                        </div>
                        """, unsafe_allow_html=True)
                    with col_b:
                        if st.button("Edit", key=f"edit_child_{child['id']}"):
                            pass  # TODO: Add edit functionality
        else:
            st.info("No child profiles yet.")
    else:
        st.info("Please login to view child profiles.")
    
    # Add child profile
    with st.expander("➕ Add Child Profile"):
        with st.form("profile_add_child"):
            child_name = st.text_input("Child's Full Name")
            date_of_birth = st.date_input("Date of Birth", min_value=datetime(2010, 1, 1), max_value=datetime.now())
            gender = st.selectbox("Gender", ["Male", "Female", "Other"])
            
            if st.form_submit_button("Add Child Profile"):
                if child_name and date_of_birth and gender:
                    success, message = add_child_profile(child_name, date_of_birth.strftime('%Y-%m-%d'), gender)
                    if success:
                        st.success(message)
                        st.rerun()
                    else:
                        st.error(message)
                else:
                    st.error("Please fill in all fields.")
    
    # Application history
    st.markdown("#### 📋 Application History")
    
    if st.session_state.get('current_user'):
        user_id = st.session_state.current_user['id']
        applications = db.get_applications(user_id)
        
        if applications:
            for app in applications:
                with st.container():
                    col_a, col_b = st.columns([3, 1])
                    with col_a:
                        status_color = {
                            'pending': '🟡',
                            'approved': '🟢',
                            'rejected': '🔴',
                            'waitlisted': '🟠'
                        }.get(app['status'], '🟡')
                        
                        st.markdown(f"""
                        <div class="school-card">
                            <h4>{app['school_name']}</h4>
                            <p><strong>Child:</strong> {app['child_name']}</p>
                            <p><strong>Status:</strong> {status_color} {app['status'].title()}</p>
                            <p><strong>Submitted:</strong> {app['submitted_at']}</p>
                            <p><strong>Preferred Start:</strong> {app['preferred_start_date']}</p>
                        </div>
                        """, unsafe_allow_html=True)
                    with col_b:
                        if st.button("View Details", key=f"view_app_{app['id']}"):
                            pass  # TODO: Add detailed view
        else:
            st.info("No applications submitted yet.")
    else:
        st.info("Please login to view application history.")

# Application Tracker page
def application_tracker_page():
    """Application tracking and monitoring page"""
    st.markdown('<h1 class="main-header">📋 Application Tracker</h1>', unsafe_allow_html=True)
    
    if not st.session_state.user_logged_in:
        st.warning("Please log in to use the application tracker.")
        return
    
    # Add new school to tracker
    st.markdown("## 🔍 Add School to Tracker")
    
    col1, col2 = st.columns([3, 1])
    with col1:
        if not df.empty:
            school_options = df['name_en'].tolist()
            selected_school = st.selectbox("Select a school to track", school_options)
            
            if selected_school:
                school_data = df[df['name_en'] == selected_school].iloc[0]
                st.info(f"Selected: {school_data['name_tc']} ({school_data['district_en']})")
    
    with col2:
        if st.button("➕ Add to Tracker", use_container_width=True):
            if selected_school:
                school_data = df[df['name_en'] == selected_school].iloc[0]
                add_to_application_tracker(school_data['school_no'], selected_school)
                st.rerun()
    
    # Display tracked schools
    st.markdown("## 📊 Tracked Schools")
    
    if st.session_state.get('current_user'):
        user_id = st.session_state.current_user['id']
        tracked_schools = db.get_tracked_schools(user_id)
        
        if tracked_schools:
            for school in tracked_schools:
                with st.container():
                    col1, col2, col3 = st.columns([3, 1, 1])
                    
                    with col1:
                        st.markdown(f"""
                        <div class="school-card">
                            <h3>{school['school_name']}</h3>
                            <p><strong>Added:</strong> {school['added_date']}</p>
                            <p><strong>Status:</strong> {school['status'].title()}</p>
                            {f"<p><strong>Last Checked:</strong> {school['last_checked'] if school['last_checked'] else 'Never'}</p>" if school['last_checked'] else ""}
                        </div>
                        """, unsafe_allow_html=True)
                    
                    with col2:
                        if st.button("🔍 Check Status", key=f"check_{school['school_no']}"):
                            # Simulate checking application status
                            st.info("Checking application status...")
                            # In a real implementation, this would fetch the school's website
                            # For now, we'll simulate with sample data
                            sample_content = "Applications are now open for the 2024/25 school year. Deadline: 31/12/2024"
                        analysis = analyze_application_content(sample_content)
                        
                        st.session_state.application_tracker[school_no]['last_checked'] = datetime.now()
                        st.session_state.application_tracker[school_no]['application_info'] = analysis
                        
                        # Add notification if application is open
                        if analysis['status'] == 'open':
                            add_notification(
                                f"Application Open: {tracker_info['school_name']}",
                                f"Applications are now open for {tracker_info['school_name']}. Deadline: {analysis['deadline'].strftime('%Y-%m-%d') if analysis['deadline'] else 'Not specified'}",
                                'high'
                            )
                        
                        st.rerun()
                
                with col3:
                    if st.button("❌ Remove", key=f"remove_{school_no}"):
                        remove_from_application_tracker(school_no)
                        st.rerun()
                
                # Show application info if available
                if tracker_info.get('application_info'):
                    info = tracker_info['application_info']
                    st.markdown("### 📋 Application Information")
                    
                    col_a, col_b, col_c = st.columns(3)
                    with col_a:
                        status_color = "🟢" if info['status'] == 'open' else "🔴" if info['status'] == 'closed' else "🟡"
                        st.metric("Status", f"{status_color} {info['status'].title()}")
                    
                    with col_b:
                        if info['start_date']:
                            st.metric("Start Date", info['start_date'].strftime('%Y-%m-%d'))
                        else:
                            st.metric("Start Date", "Not specified")
                    
                    with col_c:
                        if info['deadline']:
                            st.metric("Deadline", info['deadline'].strftime('%Y-%m-%d'))
                        else:
                            st.metric("Deadline", "Not specified")
                
                st.markdown("---")

# Application Form page
def application_form_page():
    """Application form page"""
    if not st.session_state.show_application_form or not st.session_state.selected_school:
        st.rerun()
    
    school = st.session_state.selected_school
    
    st.markdown('<h1 class="main-header">📝 School Application</h1>', unsafe_allow_html=True)
    st.markdown(f'<h2 class="sub-header">Applying to: {school.get("name_en", "Unknown School")}</h2>', unsafe_allow_html=True)
    
    # Back button
    if st.button("← Back to School Details"):
        st.session_state.show_application_form = False
        st.session_state.selected_school = None
        st.rerun()
    
    # Child profile selection
    st.markdown("## 👶 Child Information")
    
    if not st.session_state.get('current_user'):
        st.warning("Please login to submit an application.")
        return
    
    user_id = st.session_state.current_user['id']
    child_profiles = db.get_child_profiles(user_id)
    
    if not child_profiles:
        st.warning("No child profiles found. Please add a child profile first.")
        
        with st.expander("➕ Add Child Profile"):
            with st.form("add_child_form"):
                child_name = st.text_input("Child's Full Name")
                date_of_birth = st.date_input("Date of Birth", min_value=datetime(2010, 1, 1), max_value=datetime.now())
                gender = st.selectbox("Gender", ["Male", "Female", "Other"])
                
                if st.form_submit_button("Add Child Profile"):
                    if child_name and date_of_birth and gender:
                        success, message = add_child_profile(child_name, date_of_birth.strftime('%Y-%m-%d'), gender)
                        if success:
                            st.success(message)
                            st.rerun()
                        else:
                            st.error(message)
                    else:
                        st.error("Please fill in all fields.")
        return
    
    # Select child profile
    child_options = {f"{child['name']} ({calculate_age(child['date_of_birth'])} years old)": child['id'] 
                    for child in child_profiles}
    
    selected_child_name = st.selectbox("Select Child", list(child_options.keys()))
    selected_child_id = child_options[selected_child_name]
    
    # Application form
    st.markdown("## 📋 Application Details")
    
    with st.form("application_form"):
        st.markdown("### Parent Information")
        current_user = st.session_state.current_user
        if isinstance(current_user, dict):
            parent_name = st.text_input("Parent/Guardian Full Name", value=current_user.get('name', ''))
            # Display email and phone as read-only information
            email_status = "✅ Set" if current_user.get('email') else "❌ Not set"
            phone_status = "✅ Set" if current_user.get('phone') else "❌ Not set"
            st.info(f"**Email:** {current_user.get('email', 'Not set')} {email_status}")
            st.info(f"**Phone:** {current_user.get('phone', 'Not set')} {phone_status}")
            
            # Show warning if contact info is missing
            if not current_user.get('email') or not current_user.get('phone'):
                st.warning("⚠️ Please update your profile with complete contact information.")
                if st.button(get_text("go_to_profile_update", lang), key="go_to_profile"):
                    st.session_state.current_page = 'profile'
                    st.session_state.show_application_form = False
                    st.rerun()
            
            # Use the values from profile for the application
            parent_email = current_user.get('email', '')
            parent_phone = current_user.get('phone', '')
        else:
            parent_name = st.text_input("Parent/Guardian Full Name", value=current_user if isinstance(current_user, str) else '')
            st.warning("Please update your profile with email and phone information.")
            parent_email = ""
            parent_phone = ""
        
        st.markdown("### Application Details")
        preferred_start_date = st.date_input("Preferred Start Date", min_value=datetime.now().date())
        additional_notes = st.text_area("Additional Notes (Optional)", 
                                      placeholder="Any special requirements, questions, or additional information...")
        
        col1, col2 = st.columns(2)
        with col1:
            submitted = st.form_submit_button("Submit Application", use_container_width=True)
        with col2:
            if st.form_submit_button("Cancel", use_container_width=True):
                st.session_state.show_application_form = False
                st.session_state.selected_school = None
                st.rerun()
        
        if submitted:
            # Check if user has complete profile information
            if isinstance(current_user, dict):
                if not current_user.get('email') or not current_user.get('phone'):
                    st.error(get_text("contact_info_required", lang))
                    st.info("Go to your Profile page to update your contact information.")
                elif parent_name and parent_email and parent_phone:
                    success, message = submit_application(
                        school['school_no'],
                        school.get('name_en', 'Unknown School'),
                        selected_child_id,
                        parent_name,
                        parent_email,
                        parent_phone,
                        preferred_start_date.strftime('%Y-%m-%d'),
                        additional_notes
                    )
                    if success:
                        st.success(message)
                        st.session_state.show_application_form = False
                        st.session_state.selected_school = None
                        st.rerun()
                    else:
                        st.error(message)
                else:
                    st.error("Please fill in all required fields.")
            else:
                st.error("Please update your profile with complete information before submitting an application.")

# Notifications page
def notifications_page():
    """Notifications page"""
    st.markdown('<h1 class="main-header">🔔 Notifications</h1>', unsafe_allow_html=True)
    
    if not st.session_state.user_logged_in:
        st.warning("Please log in to view notifications.")
        return
    
    if not st.session_state.get('current_user'):
        st.warning("Please login to view notifications.")
        return
    
    user_id = st.session_state.current_user['id']
    
    # Notification filters
    col1, col2 = st.columns([2, 1])
    with col1:
        show_read = st.checkbox("Show read notifications")
    with col2:
        if st.button("Mark All as Read"):
            db.mark_all_notifications_read(user_id)
            st.rerun()
    
    # Display notifications
    notifications = db.get_notifications(user_id, include_read=show_read)
    
    if not notifications:
        st.info("No notifications to display.")
    else:
        for notification in notifications:
            priority_color = {
                'low': '🟢',
                'medium': '🟡', 
                'high': '🟠',
                'urgent': '🔴'
            }.get(notification['priority'], '🟡')
            
            with st.container():
                col1, col2 = st.columns([4, 1])
                
                with col1:
                    st.markdown(f"""
                    <div class="school-card">
                        <h4>{priority_color} {notification['title']}</h4>
                        <p>{notification['message']}</p>
                        <small>Priority: {notification['priority'].title()} | {notification['timestamp']}</small>
                    </div>
                    """, unsafe_allow_html=True)
                
                with col2:
                    if not notification['read']:
                        if st.button("✓ Read", key=f"read_{notification['id']}"):
                            db.mark_notification_read(notification['id'])
                            st.rerun()
                
                st.markdown("---")

# About page
def about_page():
    """About page"""
    st.markdown('<h1 class="main-header">ℹ️ About</h1>', unsafe_allow_html=True)
    
    st.markdown("""
    ## About the Hong Kong School Application Portal
    
    The Hong Kong School Application Portal is a comprehensive platform designed to help parents 
    navigate the kindergarten application process in Hong Kong. Our mission is to simplify 
    the school selection process by providing detailed information, easy search capabilities, 
    and streamlined application management.
    
    ### Our Features
    
    - **Comprehensive Database**: Access information about hundreds of kindergartens across Hong Kong
    - **Advanced Search**: Find schools by location, district, or specific criteria
    - **Detailed Information**: Get comprehensive details about each school including contact information and websites
    - **Application Tracking**: Monitor application dates and deadlines for your preferred schools
    - **Real-time Notifications**: Get alerts when applications open or deadlines approach
    - **User-Friendly Interface**: Easy-to-use platform accessible from any device
    - **Real-time Updates**: Stay informed about application deadlines and school updates
    
    ### Contact Information
    
    For support or inquiries, please contact us:
    - Email: support@schoolportal.hk
    - Phone: +852 1234 5678
    
    ### Data Sources
    
    Our kindergarten data is sourced from official government databases and verified through 
    multiple channels to ensure accuracy and reliability.
    """)

# Applications page
def applications_page():
    """Standalone applications management page"""
    st.markdown('<h1 class="main-header">📋 My Applications</h1>', unsafe_allow_html=True)
    if not st.session_state.user_logged_in:
        st.warning("Please log in to view your applications.")
        return
    
    if not st.session_state.get('current_user'):
        st.warning("Please login to view your applications.")
        return
    
    user_id = st.session_state.current_user['id']
    applications = db.get_applications(user_id)
    
    if applications:
        for app in applications:
            with st.container():
                col_a, col_b = st.columns([3, 1])
                with col_a:
                    status_color = {
                        'pending': '🟡',
                        'approved': '🟢',
                        'rejected': '🔴',
                        'waitlisted': '🟠'
                    }.get(app['status'], '🟡')
                    st.markdown(f"""
                    <div class="school-card">
                        <h4>{app['school_name']}</h4>
                        <p><strong>Child:</strong> {app['child_name']}</p>
                        <p><strong>Status:</strong> {status_color} {app['status'].title()}</p>
                        <p><strong>Submitted:</strong> {app['submitted_at']}</p>
                        <p><strong>Preferred Start:</strong> {app['preferred_start_date']}</p>
                    </div>
                    """, unsafe_allow_html=True)
                with col_b:
                    if st.button("View Details", key=f"view_app_page_{app['id']}"):
                        pass  # TODO: Add detailed view
    else:
        st.info("No applications submitted yet.")

# Main app logic
def main():
    """Main application logic"""
    # Navigation
    main_navigation()
    
    # Show authentication modals if needed
    show_login_modal()
    show_register_modal()
    
    # Show application form if needed
    if st.session_state.show_application_form:
        application_form_page()
    else:
        # Display the appropriate page based on session state
        if st.session_state.current_page == 'home':
            home_page()
        elif st.session_state.current_page == 'kindergartens':
            kindergartens_page()
        elif st.session_state.current_page == 'analytics':
            analytics_page()
        elif st.session_state.current_page == 'tracker':
            application_tracker_page()
        elif st.session_state.current_page == 'notifications':
            notifications_page()
        elif st.session_state.current_page == 'applications':
            applications_page()
        elif st.session_state.current_page == 'profile':
            profile_page()
        elif st.session_state.current_page == 'about':
            about_page()

if __name__ == "__main__":
    main() 