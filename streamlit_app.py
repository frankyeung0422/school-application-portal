import streamlit as st
import pandas as pd
import json
import os
from datetime import datetime, timedelta
import plotly.express as px
import plotly.graph_objects as go
import re
from dateutil import parser

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
                    st.success(f"Successfully loaded {len(data)} kindergarten records")
                    return data
                else:
                    st.warning("Data file is empty or invalid format")
        else:
            st.warning("Kindergarten data file not found. Using sample data.")
        
        # Fallback to sample data
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
            }
        ]
        return data
    except json.JSONDecodeError as e:
        st.error(f"Error parsing JSON data: {e}")
        return []
    except Exception as e:
        st.error(f"Error loading data: {e}")
        return []

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
    """Add school to application tracker"""
    if school_no not in st.session_state.application_tracker:
        st.session_state.application_tracker[school_no] = {
            'school_name': school_name,
            'added_date': datetime.now(),
            'status': 'tracking',
            'last_checked': None,
            'application_info': None
        }
        st.success(f"Added {school_name} to application tracker!")

def remove_from_application_tracker(school_no):
    """Remove school from application tracker"""
    if school_no in st.session_state.application_tracker:
        school_name = st.session_state.application_tracker[school_no]['school_name']
        del st.session_state.application_tracker[school_no]
        st.success(f"Removed {school_name} from application tracker!")

def add_notification(title, message, priority='medium'):
    """Add notification to user's notification list"""
    notification = {
        'id': len(st.session_state.notifications) + 1,
        'title': title,
        'message': message,
        'priority': priority,
        'timestamp': datetime.now(),
        'read': False
    }
    st.session_state.notifications.append(notification)

# Authentication functions
def register_user(name, email, phone, password):
    """Register a new user"""
    # In a real app, this would connect to a database
    # For now, we'll use session state to simulate user storage
    user_id = f"user_{len(st.session_state.get('users', [])) + 1}"
    
    # Check if user already exists
    existing_users = st.session_state.get('users', [])
    if any(user['email'] == email for user in existing_users):
        return False, "User with this email already exists"
    
    # Create new user
    new_user = {
        'id': user_id,
        'name': name,
        'email': email,
        'phone': phone,
        'password': password,  # In real app, this would be hashed
        'created_at': datetime.now(),
        'is_active': True
    }
    
    if 'users' not in st.session_state:
        st.session_state.users = []
    
    st.session_state.users.append(new_user)
    return True, "Registration successful!"

def login_user(email, password):
    """Login a user"""
    users = st.session_state.get('users', [])
    
    for user in users:
        if user['email'] == email and user['password'] == password:
            st.session_state.user_logged_in = True
            st.session_state.current_user = user
            return True, "Login successful!"
    
    return False, "Invalid email or password"

def logout_user():
    """Logout the current user"""
    st.session_state.user_logged_in = False
    st.session_state.current_user = None

# Child profile functions
def add_child_profile(child_name, date_of_birth, gender):
    """Add a child profile"""
    child_id = f"child_{len(st.session_state.children_profiles) + 1}"
    
    new_child = {
        'id': child_id,
        'name': child_name,
        'date_of_birth': date_of_birth,
        'gender': gender,
        'created_at': datetime.now()
    }
    
    st.session_state.children_profiles.append(new_child)
    return True, "Child profile added successfully!"

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
    """Submit an application to a school"""
    application_id = f"app_{len(st.session_state.applications) + 1}"
    
    # Find child profile
    child_profile = next((child for child in st.session_state.children_profiles if child['id'] == child_id), None)
    if not child_profile:
        return False, "Child profile not found"
    
    new_application = {
        'id': application_id,
        'school_no': school_no,
        'school_name': school_name,
        'child_id': child_id,
        'child_name': child_profile['name'],
        'parent_name': parent_name,
        'parent_email': parent_email,
        'parent_phone': parent_phone,
        'preferred_start_date': preferred_start_date,
        'additional_notes': additional_notes,
        'submitted_at': datetime.now(),
        'status': 'pending'
    }
    
    st.session_state.applications.append(new_application)
    
    # Add notification
    add_notification(
        f"Application Submitted: {school_name}",
        f"Your application for {child_profile['name']} has been submitted successfully. We will contact you soon.",
        'high'
    )
    
    return True, "Application submitted successfully!"

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
if 'notifications' not in st.session_state:
    # Add some sample notifications
    st.session_state.notifications = [
        {
            'id': 1,
            'title': 'Welcome to School Portal!',
            'message': 'Thank you for joining our platform. Start tracking schools to get notified about application dates.',
            'priority': 'low',
            'timestamp': datetime.now() - timedelta(days=1),
            'read': True
        },
        {
            'id': 2,
            'title': 'New Feature Available',
            'message': 'Application tracking is now available! Monitor your preferred schools and get alerts.',
            'priority': 'medium',
            'timestamp': datetime.now() - timedelta(hours=6),
            'read': False
        }
    ]
if 'application_tracker' not in st.session_state:
    st.session_state.application_tracker = {}
if 'applications' not in st.session_state:
    st.session_state.applications = []
if 'children_profiles' not in st.session_state:
    st.session_state.children_profiles = []
if 'show_application_form' not in st.session_state:
    st.session_state.show_application_form = False
if 'selected_child' not in st.session_state:
    st.session_state.selected_child = None

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
        
        # Count unread notifications
        unread_count = len([n for n in st.session_state.notifications if not n['read']])
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
            st.markdown(f"**Welcome, {st.session_state.current_user['name']}!**")
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
                                st.success(message)
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
    
    col1, col2, col3 = st.columns([2, 1, 1])
    
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
        if st.button(get_text("clear_filters", lang)):
            search_term = ""
            selected_district = get_text("all_districts", lang)
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
                <p><strong>Website:</strong> {'Available' if school.get('has_website') else 'Not available'}</p>
                <p><strong>Website Verified:</strong> {'Yes' if school.get('website_verified') else 'No'}</p>
            </div>
            """, unsafe_allow_html=True)
        
        with col2:
            if st.button(get_text("back_to_list", lang)):
                st.session_state.selected_school = None
                st.rerun()
            
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
                    </div>
                    """, unsafe_allow_html=True)
                
                with col2:
                    if school.get('has_website', False) and school.get('website'):
                        st.link_button("🌐 Website", school.get('website', ''))
                    
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
        with st.form("login_form"):
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
    st.markdown(f"### Welcome, {st.session_state.current_user['name']}!")
    
    # Profile information
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Personal Information")
        st.text_input("Full Name", value=st.session_state.current_user.get('name', ''), key="profile_name")
        st.text_input("Email", value=st.session_state.current_user.get('email', ''), key="profile_email")
        st.text_input("Phone", value=st.session_state.current_user.get('phone', ''), key="profile_phone")
    
    with col2:
        st.markdown("#### Preferences")
        st.selectbox("Preferred Language", ["English", "中文"], key="profile_language")
        st.selectbox("Notification Settings", ["Email", "SMS", "Both", "None"], key="profile_notifications")
        st.checkbox("Receive updates about new schools", key="profile_updates")
    
    # Child profiles
    st.markdown("#### 👶 Child Profiles")
    
    if st.session_state.children_profiles:
        for child in st.session_state.children_profiles:
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
    
    if st.session_state.applications:
        for app in st.session_state.applications:
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
                        <p><strong>Submitted:</strong> {app['submitted_at'].strftime('%Y-%m-%d %H:%M')}</p>
                        <p><strong>Preferred Start:</strong> {app['preferred_start_date']}</p>
                    </div>
                    """, unsafe_allow_html=True)
                with col_b:
                    if st.button("View Details", key=f"view_app_{app['id']}"):
                        pass  # TODO: Add detailed view
    else:
        st.info("No applications submitted yet.")

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
    
    if not st.session_state.application_tracker:
        st.info("No schools are being tracked. Add schools above to start monitoring their application dates.")
    else:
        for school_no, tracker_info in st.session_state.application_tracker.items():
            with st.container():
                col1, col2, col3 = st.columns([3, 1, 1])
                
                with col1:
                    st.markdown(f"""
                    <div class="school-card">
                        <h3>{tracker_info['school_name']}</h3>
                        <p><strong>Added:</strong> {tracker_info['added_date'].strftime('%Y-%m-%d')}</p>
                        <p><strong>Status:</strong> {tracker_info['status'].title()}</p>
                        {f"<p><strong>Last Checked:</strong> {tracker_info['last_checked'].strftime('%Y-%m-%d %H:%M') if tracker_info['last_checked'] else 'Never'}</p>" if tracker_info['last_checked'] else ""}
                    </div>
                    """, unsafe_allow_html=True)
                
                with col2:
                    if st.button("🔍 Check Status", key=f"check_{school_no}"):
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
    
    if not st.session_state.children_profiles:
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
                    for child in st.session_state.children_profiles}
    
    selected_child_name = st.selectbox("Select Child", list(child_options.keys()))
    selected_child_id = child_options[selected_child_name]
    
    # Application form
    st.markdown("## 📋 Application Details")
    
    with st.form("application_form"):
        st.markdown("### Parent Information")
        parent_name = st.text_input("Parent/Guardian Full Name", value=st.session_state.current_user.get('name', ''))
        parent_email = st.text_input("Email Address", value=st.session_state.current_user.get('email', ''))
        parent_phone = st.text_input("Phone Number", value=st.session_state.current_user.get('phone', ''))
        
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
            if parent_name and parent_email and parent_phone:
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

# Notifications page
def notifications_page():
    """Notifications page"""
    st.markdown('<h1 class="main-header">🔔 Notifications</h1>', unsafe_allow_html=True)
    
    if not st.session_state.user_logged_in:
        st.warning("Please log in to view notifications.")
        return
    
    # Notification filters
    col1, col2 = st.columns([2, 1])
    with col1:
        show_read = st.checkbox("Show read notifications")
    with col2:
        if st.button("Mark All as Read"):
            for notification in st.session_state.notifications:
                notification['read'] = True
            st.rerun()
    
    # Display notifications
    filtered_notifications = st.session_state.notifications if show_read else [n for n in st.session_state.notifications if not n['read']]
    
    if not filtered_notifications:
        st.info("No notifications to display.")
    else:
        for notification in filtered_notifications:
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
                        <small>Priority: {notification['priority'].title()} | {notification['timestamp'].strftime('%Y-%m-%d %H:%M')}</small>
                    </div>
                    """, unsafe_allow_html=True)
                
                with col2:
                    if not notification['read']:
                        if st.button("✓ Read", key=f"read_{notification['id']}"):
                            notification['read'] = True
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
    if st.session_state.applications:
        for app in st.session_state.applications:
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
                        <p><strong>Submitted:</strong> {app['submitted_at'].strftime('%Y-%m-%d %H:%M')}</p>
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