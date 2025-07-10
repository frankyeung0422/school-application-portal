"""
Example Streamlit App with Cloud Storage SQLite
Demonstrates how to use the CloudDatabaseManager
"""

import streamlit as st
import hashlib
import os
from datetime import datetime

# Import our cloud database manager
try:
    from database_cloud import CloudDatabaseManager
    CLOUD_DB_AVAILABLE = True
except ImportError:
    CLOUD_DB_AVAILABLE = False
    st.error("Cloud database manager not available. Please install required dependencies.")

# Page configuration
st.set_page_config(
    page_title="Cloud Storage SQLite 示例",
    page_icon="☁️",
    layout="wide"
)

# Initialize session state
if 'user' not in st.session_state:
    st.session_state.user = None

if 'db_manager' not in st.session_state:
    st.session_state.db_manager = None

# Helper functions
def hash_password(password):
    """Simple password hashing"""
    return hashlib.sha256(password.encode()).hexdigest()

def get_text(key, lang="en"):
    """Get translated text"""
    translations = {
        "en": {
            "title": "Cloud Storage SQLite Example",
            "storage_type": "Storage Type",
            "local": "Local SQLite",
            "simple_cloud": "Simple Cloud (Upload/Download)",
            "google_drive": "Google Drive API",
            "initialize_db": "Initialize Database",
            "db_initialized": "Database initialized successfully!",
            "db_error": "Database initialization failed",
            "login": "Login",
            "register": "Register",
            "logout": "Logout",
            "email": "Email",
            "password": "Password",
            "username": "Username",
            "full_name": "Full Name",
            "phone": "Phone",
            "login_success": "Login successful!",
            "login_failed": "Login failed. Please check your credentials.",
            "register_success": "Registration successful!",
            "register_failed": "Registration failed. User may already exist.",
            "welcome": "Welcome",
            "database_backup": "Database Backup",
            "download_backup": "Download Database Backup",
            "upload_backup": "Upload Database Backup",
            "backup_success": "Backup uploaded successfully!",
            "backup_failed": "Backup upload failed.",
            "user_management": "User Management",
            "create_user": "Create User",
            "view_users": "View Users",
            "no_users": "No users found.",
            "user_id": "User ID",
            "created_at": "Created At",
            "actions": "Actions",
            "delete_user": "Delete User",
            "user_deleted": "User deleted successfully!",
            "debug_info": "Debug Information",
            "connection_status": "Database Connection Status",
            "storage_type_info": "Storage Type",
            "cloud_available": "Cloud Storage Available",
            "user_count": "User Count",
            "backup_restore": "Backup & Restore",
            "create_backup": "Create Backup",
            "restore_backup": "Restore from Backup",
            "backup_created": "Backup created successfully!",
            "restore_success": "Database restored successfully!",
            "restore_failed": "Database restore failed.",
        },
        "zh": {
            "title": "雲端儲存 SQLite 示例",
            "storage_type": "儲存類型",
            "local": "本地 SQLite",
            "simple_cloud": "簡單雲端 (上傳/下載)",
            "google_drive": "Google Drive API",
            "initialize_db": "初始化數據庫",
            "db_initialized": "數據庫初始化成功！",
            "db_error": "數據庫初始化失敗",
            "login": "登錄",
            "register": "註冊",
            "logout": "登出",
            "email": "郵箱",
            "password": "密碼",
            "username": "用戶名",
            "full_name": "全名",
            "phone": "電話",
            "login_success": "登錄成功！",
            "login_failed": "登錄失敗，請檢查憑證。",
            "register_success": "註冊成功！",
            "register_failed": "註冊失敗，用戶可能已存在。",
            "welcome": "歡迎",
            "database_backup": "數據庫備份",
            "download_backup": "下載數據庫備份",
            "upload_backup": "上傳數據庫備份",
            "backup_success": "備份上傳成功！",
            "backup_failed": "備份上傳失敗。",
            "user_management": "用戶管理",
            "create_user": "創建用戶",
            "view_users": "查看用戶",
            "no_users": "未找到用戶。",
            "user_id": "用戶 ID",
            "created_at": "創建時間",
            "actions": "操作",
            "delete_user": "刪除用戶",
            "user_deleted": "用戶刪除成功！",
            "debug_info": "調試信息",
            "connection_status": "數據庫連接狀態",
            "storage_type_info": "儲存類型",
            "cloud_available": "雲端儲存可用",
            "user_count": "用戶數量",
            "backup_restore": "備份與恢復",
            "create_backup": "創建備份",
            "restore_backup": "從備份恢復",
            "backup_created": "備份創建成功！",
            "restore_success": "數據庫恢復成功！",
            "restore_failed": "數據庫恢復失敗。",
        }
    }
    return translations.get(lang, translations["en"]).get(key, key)

# Language selection
lang = st.sidebar.selectbox("Language / 語言", ["en", "zh"])

# Main title
st.title(get_text("title", lang))

# Storage type selection
st.sidebar.header(get_text("storage_type", lang))
storage_type = st.sidebar.selectbox(
    get_text("storage_type", lang),
    ["local", "simple_cloud", "google_drive"],
    format_func=lambda x: get_text(x, lang)
)

# Initialize database
if st.sidebar.button(get_text("initialize_db", lang)):
    if CLOUD_DB_AVAILABLE:
        try:
            st.session_state.db_manager = CloudDatabaseManager(storage_type=storage_type)
            st.sidebar.success(get_text("db_initialized", lang))
        except Exception as e:
            st.sidebar.error(f"{get_text('db_error', lang)}: {str(e)}")
    else:
        st.sidebar.error("Cloud database manager not available")

# Check if database is initialized
if st.session_state.db_manager is None:
    st.warning("Please initialize the database first using the sidebar.")
    st.stop()

# Main content
if st.session_state.user is None:
    # Login/Register section
    tab1, tab2 = st.tabs([get_text("login", lang), get_text("register", lang)])
    
    with tab1:
        st.header(get_text("login", lang))
        with st.form("login_form"):
            email = st.text_input(get_text("email", lang))
            password = st.text_input(get_text("password", lang), type="password")
            submit_login = st.form_submit_button(get_text("login", lang))
            
            if submit_login:
                if email and password:
                    password_hash = hash_password(password)
                    user = st.session_state.db_manager.verify_user(email, password_hash)
                    if user:
                        st.session_state.user = user
                        st.success(get_text("login_success", lang))
                        st.rerun()
                    else:
                        st.error(get_text("login_failed", lang))
                else:
                    st.error("Please fill in all fields")
    
    with tab2:
        st.header(get_text("register", lang))
        with st.form("register_form"):
            username = st.text_input(get_text("username", lang))
            email = st.text_input(get_text("email", lang))
            password = st.text_input(get_text("password", lang), type="password")
            full_name = st.text_input(get_text("full_name", lang))
            phone = st.text_input(get_text("phone", lang))
            submit_register = st.form_submit_button(get_text("register", lang))
            
            if submit_register:
                if username and email and password:
                    password_hash = hash_password(password)
                    success = st.session_state.db_manager.create_user(
                        username, email, password_hash, full_name, phone
                    )
                    if success:
                        st.success(get_text("register_success", lang))
                    else:
                        st.error(get_text("register_failed", lang))
                else:
                    st.error("Please fill in required fields")

else:
    # User is logged in
    st.header(f"{get_text('welcome', lang)}, {st.session_state.user['username']}!")
    
    # Logout button
    if st.sidebar.button(get_text("logout", lang)):
        st.session_state.user = None
        st.rerun()
    
    # Main tabs
    tab1, tab2, tab3, tab4 = st.tabs([
        get_text("user_management", lang),
        get_text("database_backup", lang),
        get_text("backup_restore", lang),
        get_text("debug_info", lang)
    ])
    
    with tab1:
        st.header(get_text("user_management", lang))
        
        # Create user form
        with st.expander(get_text("create_user", lang)):
            with st.form("create_user_form"):
                new_username = st.text_input(get_text("username", lang))
                new_email = st.text_input(get_text("email", lang))
                new_password = st.text_input(get_text("password", lang), type="password")
                new_full_name = st.text_input(get_text("full_name", lang))
                new_phone = st.text_input(get_text("phone", lang))
                submit_create = st.form_submit_button(get_text("create_user", lang))
                
                if submit_create:
                    if new_username and new_email and new_password:
                        password_hash = hash_password(new_password)
                        success = st.session_state.db_manager.create_user(
                            new_username, new_email, password_hash, new_full_name, new_phone
                        )
                        if success:
                            st.success(get_text("register_success", lang))
                        else:
                            st.error(get_text("register_failed", lang))
                    else:
                        st.error("Please fill in required fields")
        
        # View users (simplified - in real app you'd want proper user management)
        st.subheader(get_text("view_users", lang))
        # Note: In a real application, you'd implement proper user listing
        st.info("User listing functionality would be implemented here")
    
    with tab2:
        st.header(get_text("database_backup", lang))
        
        # Download backup
        if st.button(get_text("download_backup", lang)):
            try:
                backup_data = st.session_state.db_manager.backup_database()
                if backup_data:
                    st.download_button(
                        label=get_text("download_backup", lang),
                        data=backup_data,
                        file_name=f"school_portal_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db",
                        mime="application/x-sqlite3"
                    )
                else:
                    st.error("Failed to create backup")
            except Exception as e:
                st.error(f"Backup error: {str(e)}")
        
        # Upload backup
        st.subheader(get_text("upload_backup", lang))
        uploaded_file = st.file_uploader(
            "Choose database backup file",
            type=['db', 'sqlite', 'sqlite3']
        )
        
        if uploaded_file and st.button(get_text("restore_backup", lang)):
            try:
                backup_data = uploaded_file.read()
                success = st.session_state.db_manager.restore_database(backup_data)
                if success:
                    st.success(get_text("backup_success", lang))
                else:
                    st.error(get_text("backup_failed", lang))
            except Exception as e:
                st.error(f"Restore error: {str(e)}")
    
    with tab3:
        st.header(get_text("backup_restore", lang))
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader(get_text("create_backup", lang))
            if st.button("Create Backup"):
                try:
                    backup_data = st.session_state.db_manager.backup_database()
                    if backup_data:
                        st.success(get_text("backup_created", lang))
                        st.download_button(
                            label="Download Backup",
                            data=backup_data,
                            file_name=f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db",
                            mime="application/x-sqlite3"
                        )
                    else:
                        st.error("Failed to create backup")
                except Exception as e:
                    st.error(f"Error: {str(e)}")
        
        with col2:
            st.subheader(get_text("restore_backup", lang))
            restore_file = st.file_uploader(
                "Upload backup file",
                type=['db', 'sqlite', 'sqlite3'],
                key="restore_uploader"
            )
            
            if restore_file and st.button("Restore"):
                try:
                    backup_data = restore_file.read()
                    success = st.session_state.db_manager.restore_database(backup_data)
                    if success:
                        st.success(get_text("restore_success", lang))
                    else:
                        st.error(get_text("restore_failed", lang))
                except Exception as e:
                    st.error(f"Error: {str(e)}")
    
    with tab4:
        st.header(get_text("debug_info", lang))
        
        # Database connection info
        st.subheader(get_text("connection_status", lang))
        st.write(f"Connected: {st.session_state.db_manager.conn is not None}")
        st.write(f"{get_text('storage_type_info', lang)}: {st.session_state.db_manager.storage_type}")
        st.write(f"{get_text('cloud_available', lang)}: {CLOUD_DB_AVAILABLE}")
        
        # Storage manager info
        if st.session_state.db_manager.storage_manager:
            st.write("Storage Manager: Available")
            st.write(f"Type: {type(st.session_state.db_manager.storage_manager).__name__}")
        else:
            st.write("Storage Manager: None (using local storage)")
        
        # User info
        st.subheader("Current User")
        st.json(st.session_state.user)
        
        # Database file info (if available)
        if hasattr(st.session_state.db_manager.conn, 'temp_path'):
            st.write(f"Database Path: {st.session_state.db_manager.conn.temp_path}")
        
        # Environment info
        st.subheader("Environment")
        st.write(f"Streamlit Cloud: {os.getenv('STREAMLIT_CLOUD', 'False')}")
        st.write(f"Working Directory: {os.getcwd()}")

# Footer
st.markdown("---")
st.markdown("""
<div style='text-align: center'>
    <p>Cloud Storage SQLite Example App</p>
    <p>This demonstrates how to use SQLite with cloud storage in Streamlit</p>
</div>
""", unsafe_allow_html=True) 