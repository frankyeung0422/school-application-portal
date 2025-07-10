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
            st.markdown(f"**Welcome, {st.session_state.current_user}!**")
            if st.button("Logout"):
                st.session_state.user_logged_in = False
                st.session_state.current_user = None
                st.rerun()
        else:
            st.markdown("**Guest User**")
            if st.button("Login"):
                st.session_state.show_login = True
                st.rerun()

# Home page
def home_page():
    """Home page with hero section and features"""
    st.markdown('<h1 class="main-header">🏫 Hong Kong School Application Portal</h1>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Streamline your kindergarten application process in Hong Kong</p>', unsafe_allow_html=True)
    
    # Hero section
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.markdown("""
        ### Find the Perfect School for Your Child
        
        Our comprehensive portal helps you discover and apply to kindergartens across Hong Kong. 
        With detailed information, easy search functionality, and application tracking, 
        we make the school selection process simple and efficient.
        
        **New Features:**
        - 📊 **Application Tracking**: Monitor application dates for your preferred schools
        - 🔔 **Real-time Notifications**: Get alerts when applications open or deadlines approach
        - 📋 **Application Status**: See if schools are currently accepting applications
        - ⏰ **Deadline Monitoring**: Never miss an important application deadline
        """)
        
        col_a, col_b = st.columns(2)
        with col_a:
            if st.button("🚀 Browse Kindergartens", use_container_width=True):
                st.session_state.current_page = 'kindergartens'
                st.rerun()
        
        with col_b:
            if st.button("📊 Start Tracking", use_container_width=True):
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
    st.markdown('<h1 class="main-header">🏫 Hong Kong Kindergartens</h1>', unsafe_allow_html=True)
    
    if df.empty:
        st.error("No kindergarten data available.")
        return
    
    # Filters section
    st.markdown("## 🔍 Search & Filter")
    
    col1, col2, col3 = st.columns([2, 1, 1])
    
    with col1:
        search_term = st.text_input(
            "Search by name or district...",
            placeholder="Enter school name or district..."
        )
    
    with col2:
        districts = ['All Districts']
        if 'district_en' in df.columns and not df['district_en'].empty:
            districts.extend(sorted(df['district_en'].unique().tolist()))
        selected_district = st.selectbox("District", districts)
    
    with col3:
        if st.button("Clear Filters"):
            search_term = ""
            selected_district = "All Districts"
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
    
    if selected_district and selected_district != "All Districts" and 'district_en' in filtered_df.columns:
        filtered_df = filtered_df[filtered_df['district_en'] == selected_district]
    
    # Results info
    st.markdown(f"**Showing {len(filtered_df)} of {len(df)} kindergartens**")
    
    # Show selected school details if any
    if st.session_state.selected_school:
        st.markdown("## 📋 School Details")
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
            if st.button("← Back to List"):
                st.session_state.selected_school = None
                st.rerun()
            
            if school.get('has_website') and school.get('website'):
                st.link_button("🌐 Visit Website", school.get('website'))
            
            # Application tracking section
            if st.session_state.user_logged_in:
                st.markdown("### 📊 Application Tracking")
                
                if school['school_no'] in st.session_state.application_tracker:
                    tracker_info = st.session_state.application_tracker[school['school_no']]
                    st.success(f"✅ Tracking since {tracker_info['added_date'].strftime('%Y-%m-%d')}")
                    
                    if st.button("❌ Stop Tracking", key=f"stop_track_{school['school_no']}"):
                        remove_from_application_tracker(school['school_no'])
                        st.rerun()
                    
                    # Show application info if available
                    if tracker_info.get('application_info'):
                        info = tracker_info['application_info']
                        st.markdown("#### 📋 Current Status")
                        
                        status_color = "🟢" if info['status'] == 'open' else "🔴" if info['status'] == 'closed' else "🟡"
                        st.metric("Status", f"{status_color} {info['status'].title()}")
                        
                        if info['deadline']:
                            days_left = (info['deadline'] - datetime.now()).days
                            if days_left > 0:
                                st.warning(f"⚠️ Deadline in {days_left} days")
                            else:
                                st.error("❌ Deadline passed")
                        
                        if info['start_date']:
                            st.info(f"📅 Opens: {info['start_date'].strftime('%Y-%m-%d')}")
                else:
                    if st.button("📊 Start Tracking", key=f"start_track_{school['school_no']}"):
                        add_to_application_tracker(school['school_no'], school.get('name_en', 'Unknown School'))
                        st.rerun()
            else:
                st.info("💡 Log in to track application dates")
        
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
        st.info("No kindergartens found matching your criteria.")

# Analytics page
def analytics_page():
    """Analytics and insights page"""
    st.markdown('<h1 class="main-header">📊 Analytics & Insights</h1>', unsafe_allow_html=True)
    
    if df.empty:
        st.error("No data available for analytics.")
        return
    
    # Overview metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Schools", len(df))
    
    with col2:
        districts_count = df['district_en'].nunique() if 'district_en' in df.columns and not df['district_en'].empty else 0
        st.metric("Districts", districts_count)
    
    with col3:
        websites_count = df['has_website'].sum() if 'has_website' in df.columns else 0
        st.metric("With Websites", websites_count)
    
    with col4:
        website_percentage = (websites_count / len(df) * 100) if len(df) > 0 else 0
        st.metric("Website Coverage", f"{website_percentage:.1f}%")
    
    # Charts
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### Schools by District")
        if 'district_en' in df.columns and not df['district_en'].empty:
            district_counts = df['district_en'].value_counts()
            if len(district_counts) > 0:
                fig = px.bar(
                    x=district_counts.values,
                    y=district_counts.index,
                    orientation='h',
                    title="Number of Schools by District"
                )
                fig.update_layout(height=400)
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No district data available")
        else:
            st.info("No district data available")
    
    with col2:
        st.markdown("### Website Availability")
        if 'has_website' in df.columns:
            website_stats = df['has_website'].value_counts()
            if len(website_stats) > 0:
                fig = px.pie(
                    values=website_stats.values,
                    names=['Has Website', 'No Website'],
                    title="Website Availability"
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No website data available")
        else:
            st.info("No website data available")
    
    # District map (simplified)
    st.markdown("### District Distribution")
    if 'district_en' in df.columns and not df['district_en'].empty:
        district_data = df.groupby('district_en').size().reset_index(name='count')
        if len(district_data) > 0:
            fig = px.treemap(
                district_data,
                path=['district_en'],
                values='count',
                title="School Distribution by District"
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No district data available for visualization")
    else:
        st.info("No district data available for visualization")

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
    st.markdown(f"### Welcome, {st.session_state.current_user}!")
    
    # Profile information
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Personal Information")
        st.text_input("Full Name", value="John Doe")
        st.text_input("Email", value="john.doe@example.com")
        st.text_input("Phone", value="+852 1234 5678")
    
    with col2:
        st.markdown("#### Preferences")
        st.selectbox("Preferred Language", ["English", "中文"])
        st.selectbox("Notification Settings", ["Email", "SMS", "Both", "None"])
        st.checkbox("Receive updates about new schools")
    
    # Saved schools
    st.markdown("#### Saved Schools")
    st.info("No saved schools yet. Browse kindergartens to save your favorites!")
    
    # Application history
    st.markdown("#### Application History")
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

# Main app logic
def main():
    """Main application logic"""
    # Navigation
    main_navigation()
    
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
    elif st.session_state.current_page == 'profile':
        profile_page()
    elif st.session_state.current_page == 'about':
        about_page()

if __name__ == "__main__":
    main() 