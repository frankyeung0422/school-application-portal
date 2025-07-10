import streamlit as st
import pandas as pd
import json
import os
from datetime import datetime
import requests
from streamlit_option_menu import option_menu
import plotly.express as px
import plotly.graph_objects as go
from streamlit_autorefresh import st_autorefresh

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
        else:
            # Fallback to sample data if file doesn't exist
            st.warning("Kindergarten data file not found. Using sample data.")
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
                }
            ]
        return data
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

# Session state initialization
if 'user_logged_in' not in st.session_state:
    st.session_state.user_logged_in = False
if 'current_user' not in st.session_state:
    st.session_state.current_user = None
if 'selected_language' not in st.session_state:
    st.session_state.selected_language = 'en'
if 'current_page' not in st.session_state:
    st.session_state.current_page = 'home'

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
        selected = option_menu(
            menu_title=None,
            options=["🏠 Home", "🏫 Kindergartens", "📊 Analytics", "👤 Profile", "ℹ️ About"],
            icons=["house", "building", "graph-up", "person", "info-circle"],
            menu_icon="cast",
            default_index=0,
            styles={
                "container": {"padding": "0!important", "background-color": "#fafafa"},
                "icon": {"color": "orange", "font-size": "18px"},
                "nav-link": {
                    "font-size": "16px",
                    "text-align": "left",
                    "margin": "0px",
                    "--hover-color": "#eee",
                },
                "nav-link-selected": {"background-color": "#02ab21"},
            }
        )
        
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
    
    return selected

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
        """)
        
        if st.button("🚀 Browse Kindergartens", use_container_width=True):
            st.session_state.current_page = 'kindergartens'
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
        districts = ['All Districts'] + sorted(df['district_en'].unique().tolist()) if 'district_en' in df.columns else ['All Districts']
        selected_district = st.selectbox("District", districts)
    
    with col3:
        if st.button("Clear Filters"):
            search_term = ""
            selected_district = "All Districts"
            st.rerun()
    
    # Filter data
    filtered_df = df.copy()
    
    if search_term:
        mask = (
            filtered_df['name_en'].str.contains(search_term, case=False, na=False) |
            filtered_df['name_tc'].str.contains(search_term, na=False) |
            filtered_df['district_en'].str.contains(search_term, case=False, na=False)
        )
        filtered_df = filtered_df[mask]
    
    if selected_district and selected_district != "All Districts":
        filtered_df = filtered_df[filtered_df['district_en'] == selected_district]
    
    # Results info
    st.markdown(f"**Showing {len(filtered_df)} of {len(df)} kindergartens**")
    
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
                    if school.get('has_website', False):
                        if st.button(f"🌐 Website", key=f"website_{school['school_no']}"):
                            st.link_button("Visit Website", school.get('website', ''))
                    
                    if st.button(f"📋 Details", key=f"details_{school['school_no']}"):
                        st.session_state.selected_school = school
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
        districts_count = df['district_en'].nunique() if 'district_en' in df.columns else 0
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
        if 'district_en' in df.columns:
            district_counts = df['district_en'].value_counts()
            fig = px.bar(
                x=district_counts.values,
                y=district_counts.index,
                orientation='h',
                title="Number of Schools by District"
            )
            fig.update_layout(height=400)
            st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.markdown("### Website Availability")
        if 'has_website' in df.columns:
            website_stats = df['has_website'].value_counts()
            fig = px.pie(
                values=website_stats.values,
                names=['Has Website', 'No Website'],
                title="Website Availability"
            )
            st.plotly_chart(fig, use_container_width=True)
    
    # District map (simplified)
    st.markdown("### District Distribution")
    if 'district_en' in df.columns:
        district_data = df.groupby('district_en').size().reset_index(name='count')
        fig = px.treemap(
            district_data,
            path=['district_en'],
            values='count',
            title="School Distribution by District"
        )
        st.plotly_chart(fig, use_container_width=True)

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
    # Auto-refresh every 30 seconds
    st_autorefresh(interval=30000, limit=100, key="fizzbuzzcounter")
    
    # Navigation
    selected = main_navigation()
    
    # Route to appropriate page based on navigation selection
    if selected == "🏠 Home":
        st.session_state.current_page = 'home'
    elif selected == "🏫 Kindergartens":
        st.session_state.current_page = 'kindergartens'
    elif selected == "📊 Analytics":
        st.session_state.current_page = 'analytics'
    elif selected == "👤 Profile":
        st.session_state.current_page = 'profile'
    elif selected == "ℹ️ About":
        st.session_state.current_page = 'about'
    
    # Display the appropriate page
    if st.session_state.current_page == 'home':
        home_page()
    elif st.session_state.current_page == 'kindergartens':
        kindergartens_page()
    elif st.session_state.current_page == 'analytics':
        analytics_page()
    elif st.session_state.current_page == 'profile':
        profile_page()
    elif st.session_state.current_page == 'about':
        about_page()

if __name__ == "__main__":
    main() 