"""
Fixed Cloud Database Manager
Properly handles Supabase and SQLite databases
"""

import sqlite3
import os
import tempfile
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
import streamlit as st

# Import cloud storage options
try:
    from cloud_storage_sqlite import CloudSQLiteManager, SimpleCloudSQLite
    CLOUD_STORAGE_AVAILABLE = True
except ImportError:
    CLOUD_STORAGE_AVAILABLE = False

class CloudDatabaseManager:
    def __init__(self, storage_type: str = "local"):
        """
        Initialize database manager with cloud storage
        
        Args:
            storage_type: "local", "google_drive", "supabase", or "simple_cloud"
        """
        self.storage_type = storage_type
        self.conn = None
        self.storage_manager = None
        
        # Initialize storage based on type
        if storage_type == "supabase":
            try:
                from database_supabase import SupabaseDatabaseManager
                self.storage_manager = SupabaseDatabaseManager()
                if self.storage_manager.supabase:
                    print("🔗 Using Supabase cloud database.")
                else:
                    st.warning("⚠️ Supabase not available, falling back to local storage")
                    self.storage_type = "local"
            except Exception as e:
                st.error(f"❌ Supabase initialization failed: {str(e)}")
                st.info("Falling back to local storage")
                self.storage_type = "local"
        elif storage_type == "google_drive" and CLOUD_STORAGE_AVAILABLE:
            try:
                self.storage_manager = CloudSQLiteManager()
                if self.storage_manager.drive_service:
                    pass
                else:
                    st.warning("⚠️ Google Drive not available, falling back to local storage")
                    self.storage_type = "local"
            except Exception as e:
                st.error(f"❌ Google Drive initialization failed: {str(e)}")
                st.info("Falling back to local storage")
                self.storage_type = "local"
        elif storage_type == "simple_cloud" and CLOUD_STORAGE_AVAILABLE:
            self.storage_manager = SimpleCloudSQLite()
        else:
            self.storage_manager = None
        
        # Initialize database
        self._init_database()
    
    def _init_database(self):
        """Initialize database connection and create tables"""
        try:
            if self.storage_manager:
                # Handle Supabase storage manager
                if hasattr(self.storage_manager, 'supabase') and self.storage_manager.supabase:
                    # Supabase doesn't need traditional database connection
                    self.conn = None
                    print("🔗 Using Supabase cloud database.")
                elif hasattr(self.storage_manager, 'handle_file_upload'):
                    # Handle file upload for simple cloud storage
                    self.storage_manager.handle_file_upload()
                    self.conn = self.storage_manager.get_database_connection()
                elif hasattr(self.storage_manager, 'get_database_connection'):
                    # Use cloud storage with database connection
                    self.conn = self.storage_manager.get_database_connection()
                else:
                    # Fallback to local storage
                    db_path = "school_portal.db"
                    self.conn = sqlite3.connect(db_path)
            else:
                # Use local storage (fallback)
                db_path = "school_portal.db"
                self.conn = sqlite3.connect(db_path)
            
            # Only create tables if we have a SQLite connection
            if self.conn:
                self._create_tables()
                self._initialize_test_data()
            elif hasattr(self.storage_manager, 'supabase') and self.storage_manager.supabase:
                # For Supabase, tables are created via SQL migrations
                print("📋 Supabase tables managed via SQL migrations")
                self._initialize_test_data()
            else:
                st.error("❌ Failed to initialize database connection")
                
        except Exception as e:
            st.error(f"❌ Database initialization error: {str(e)}")
    
    def _create_tables(self):
        """Create all necessary tables (SQLite only)"""
        if not self.conn:
            return
            
        cursor = self.conn.cursor()
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT,
                phone TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Child profiles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS child_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                child_name TEXT NOT NULL,
                date_of_birth DATE,
                gender TEXT,
                nationality TEXT,
                address TEXT,
                parent_name TEXT,
                parent_phone TEXT,
                parent_email TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Applications table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                child_id INTEGER,
                school_name TEXT NOT NULL,
                school_type TEXT NOT NULL,
                application_date DATE NOT NULL,
                status TEXT DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (child_id) REFERENCES child_profiles (id)
            )
        ''')
        
        # Application tracking table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS application_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                school_no TEXT NOT NULL,
                school_name TEXT NOT NULL,
                status TEXT DEFAULT 'tracking',
                notes TEXT,
                date_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Notifications table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Portfolio items table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS portfolio_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                child_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT,
                item_date DATE,
                attachment_path TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (child_id) REFERENCES child_profiles (id)
            )
        ''')
        
        # Personal statements table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS personal_statements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                child_id INTEGER,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                target_school TEXT,
                version TEXT DEFAULT '1.0',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (child_id) REFERENCES child_profiles (id)
            )
        ''')
        
        self.conn.commit()
    
    def _initialize_test_data(self):
        """Initialize test data"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'supabase') and self.storage_manager.supabase:
                # For Supabase, test data is managed separately
                print("📋 Test data managed via Supabase")
                return
            
            # For SQLite, check if test data already exists
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM users")
                user_count = cursor.fetchone()[0]
                
                if user_count == 0:
                    # Create test users
                    test_users = [
                        ('John Smith', 'john@example.com', '+852 1234 5678', 'password123'),
                        ('Mary Wong', 'mary@example.com', '+852 2345 6789', 'password123'),
                        ('David Lee', 'david@example.com', '+852 3456 7890', 'password123')
                    ]
                    
                    for name, email, phone, password in test_users:
                        self.register_user(name, email, phone, password)
                    
                    print("✅ Test data initialized successfully!")
                else:
                    print(f"📊 Found {user_count} existing users")
                    
        except Exception as e:
            st.error(f"Error initializing test data: {str(e)}")
    
    def close_connection(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
    
    def sync_to_cloud(self):
        """Sync database to cloud storage"""
        if self.storage_manager and hasattr(self.storage_manager, 'upload_database'):
            try:
                success = self.storage_manager.upload_database()
                if success:
                    st.success("✅ Database synced to cloud successfully!")
                else:
                    pass
            except Exception as e:
                if "storageQuotaExceeded" not in str(e) and "Service Accounts do not have storage quota" not in str(e):
                    st.error(f"❌ Sync error: {str(e)}")
    
    # User management methods
    def create_user(self, username: str, email: str, password_hash: str, full_name: str = None, phone: str = None) -> bool:
        """Create a new user"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'create_user'):
                return self.storage_manager.create_user(username, email, password_hash, full_name, phone)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    INSERT INTO users (username, email, password_hash, full_name, phone)
                    VALUES (?, ?, ?, ?, ?)
                ''', (username, email, password_hash, full_name, phone))
                self.conn.commit()
                
                # Sync to cloud if available
                if self.storage_type == "google_drive":
                    self.sync_to_cloud()
                
                return True
            else:
                st.error("No database connection available")
                return False
        except sqlite3.IntegrityError:
            return False
        except Exception as e:
            st.error(f"Error creating user: {str(e)}")
            return False
    
    def verify_user(self, email: str, password_hash: str) -> Optional[Dict]:
        """Verify user login"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'verify_user'):
                return self.storage_manager.verify_user(email, password_hash)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    SELECT id, username, email, full_name, phone
                    FROM users WHERE email = ? AND password_hash = ?
                ''', (email, password_hash))
                user = cursor.fetchone()
                
                if user:
                    return {
                        'id': user[0],
                        'username': user[1],
                        'email': user[2],
                        'full_name': user[3],
                        'phone': user[4]
                    }
            return None
        except Exception as e:
            st.error(f"Error verifying user: {str(e)}")
            return None
    
    def update_user_profile(self, user_id: int, full_name: str = None, phone: str = None) -> bool:
        """Update user profile"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'update_user_profile'):
                return self.storage_manager.update_user_profile(user_id, full_name, phone)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                updates = []
                params = []
                
                if full_name is not None:
                    updates.append("full_name = ?")
                    params.append(full_name)
                if phone is not None:
                    updates.append("phone = ?")
                    params.append(phone)
                
                if updates:
                    params.append(user_id)
                    cursor.execute(f'''
                        UPDATE users SET {', '.join(updates)}
                        WHERE id = ?
                    ''', params)
                    self.conn.commit()
                    
                    # Sync to cloud if available
                    if self.storage_type == "google_drive":
                        self.sync_to_cloud()
                    
                    return True
            return False
        except Exception as e:
            st.error(f"Error updating profile: {str(e)}")
            return False
    
    # Child profile methods
    def create_child_profile(self, user_id: int, child_name: str, date_of_birth: str = None,
                           gender: str = None, nationality: str = None, address: str = None,
                           parent_name: str = None, parent_phone: str = None, parent_email: str = None) -> int:
        """Create a new child profile"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'create_child_profile'):
                return self.storage_manager.create_child_profile(user_id, child_name, date_of_birth, gender, nationality, address, parent_name, parent_phone, parent_email)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    INSERT INTO child_profiles 
                    (user_id, child_name, date_of_birth, gender, nationality, address, parent_name, parent_phone, parent_email)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (user_id, child_name, date_of_birth, gender, nationality, address, parent_name, parent_phone, parent_email))
                self.conn.commit()
                
                # Sync to cloud if available
                if self.storage_type == "google_drive":
                    self.sync_to_cloud()
                
                return cursor.lastrowid
            return None
        except Exception as e:
            st.error(f"Error creating child profile: {str(e)}")
            return None
    
    def get_child_profiles(self, user_id: int) -> List[Dict]:
        """Get all child profiles for a user"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'get_child_profiles'):
                return self.storage_manager.get_child_profiles(user_id)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    SELECT id, child_name, date_of_birth, gender, nationality, address, 
                           parent_name, parent_phone, parent_email, created_at
                    FROM child_profiles WHERE user_id = ?
                    ORDER BY created_at DESC
                ''', (user_id,))
                
                profiles = []
                for row in cursor.fetchall():
                    profiles.append({
                        'id': row[0],
                        'child_name': row[1],
                        'date_of_birth': row[2],
                        'gender': row[3],
                        'nationality': row[4],
                        'address': row[5],
                        'parent_name': row[6],
                        'parent_phone': row[7],
                        'parent_email': row[8],
                        'created_at': row[9]
                    })
                return profiles
            return []
        except Exception as e:
            st.error(f"Error getting child profiles: {str(e)}")
            return []
    
    # Application methods
    def create_application(self, user_id: int, child_id: int, school_name: str, school_type: str,
                          application_date: str, notes: str = None) -> int:
        """Create a new application"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'create_application'):
                return self.storage_manager.create_application(user_id, child_id, school_name, school_type, application_date, notes)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    INSERT INTO applications 
                    (user_id, child_id, school_name, school_type, application_date, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (user_id, child_id, school_name, school_type, application_date, notes))
                self.conn.commit()
                
                # Sync to cloud if available
                if self.storage_type == "google_drive":
                    self.sync_to_cloud()
                
                return cursor.lastrowid
            return None
        except Exception as e:
            st.error(f"Error creating application: {str(e)}")
            return None
    
    def get_applications(self, user_id: int) -> List[Dict]:
        """Get all applications for a user"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'get_applications'):
                return self.storage_manager.get_applications(user_id)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    SELECT a.id, a.school_name, a.school_type, a.application_date, a.status, a.notes,
                           c.child_name, a.created_at
                    FROM applications a
                    JOIN child_profiles c ON a.child_id = c.id
                    WHERE a.user_id = ?
                    ORDER BY a.created_at DESC
                ''', (user_id,))
                
                applications = []
                for row in cursor.fetchall():
                    applications.append({
                        'id': row[0],
                        'school_name': row[1],
                        'school_type': row[2],
                        'application_date': row[3],
                        'status': row[4],
                        'notes': row[5],
                        'child_name': row[6],
                        'created_at': row[7]
                    })
                return applications
            return []
        except Exception as e:
            st.error(f"Error getting applications: {str(e)}")
            return []
    
    # Portfolio methods
    def create_portfolio_item(self, user_id: int, child_id: int, title: str, description: str = None,
                            category: str = None, attachment_path: str = None, item_date: str = None, notes: str = None) -> int:
        """Create a new portfolio item"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'create_portfolio_item'):
                return self.storage_manager.create_portfolio_item(user_id, child_id, title, description, category, attachment_path, item_date, notes)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    INSERT INTO portfolio_items 
                    (user_id, child_id, title, description, category, attachment_path, item_date, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (user_id, child_id, title, description, category, attachment_path, item_date, notes))
                self.conn.commit()
                
                # Sync to cloud if available
                if self.storage_type == "google_drive":
                    self.sync_to_cloud()
                
                return cursor.lastrowid
            return None
        except Exception as e:
            st.error(f"Error creating portfolio item: {str(e)}")
            return None
    
    def get_portfolio_items(self, user_id: int, child_id: int = None) -> List[Dict]:
        """Get all portfolio items for a user"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'get_portfolio_items'):
                return self.storage_manager.get_portfolio_items(user_id, child_id)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                if child_id:
                    cursor.execute('''
                        SELECT id, title, description, category, attachment_path, item_date, notes, created_at
                        FROM portfolio_items WHERE user_id = ? AND child_id = ?
                        ORDER BY created_at DESC
                    ''', (user_id, child_id))
                else:
                    cursor.execute('''
                        SELECT id, title, description, category, attachment_path, item_date, notes, created_at
                        FROM portfolio_items WHERE user_id = ?
                        ORDER BY created_at DESC
                    ''', (user_id,))
                
                items = []
                for row in cursor.fetchall():
                    items.append({
                        'id': row[0],
                        'title': row[1],
                        'description': row[2],
                        'category': row[3],
                        'attachment_path': row[4],
                        'item_date': row[5],
                        'notes': row[6],
                        'created_at': row[7]
                    })
                return items
            return []
        except Exception as e:
            st.error(f"Error getting portfolio items: {str(e)}")
            return []
    
    # Personal statements methods
    def create_personal_statement(self, user_id: int, child_id: int, title: str, content: str, 
                                 target_school: str = None, version: str = "1.0", notes: str = None) -> int:
        """Create a new personal statement"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'create_personal_statement'):
                return self.storage_manager.create_personal_statement(user_id, child_id, title, content, target_school, version, notes)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    INSERT INTO personal_statements 
                    (user_id, child_id, title, content, target_school, version, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (user_id, child_id, title, content, target_school, version, notes))
                self.conn.commit()
                
                # Sync to cloud if available
                if self.storage_type == "google_drive":
                    self.sync_to_cloud()
                
                return cursor.lastrowid
            return None
        except Exception as e:
            st.error(f"Error creating personal statement: {str(e)}")
            return None
    
    def get_personal_statements(self, user_id: int, child_id: int = None) -> List[Dict]:
        """Get all personal statements for a user"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'get_personal_statements'):
                return self.storage_manager.get_personal_statements(user_id, child_id)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                if child_id:
                    cursor.execute('''
                        SELECT id, title, content, target_school, version, notes, created_at
                        FROM personal_statements WHERE user_id = ? AND child_id = ?
                        ORDER BY created_at DESC
                    ''', (user_id, child_id))
                else:
                    cursor.execute('''
                        SELECT id, title, content, target_school, version, notes, created_at
                        FROM personal_statements WHERE user_id = ?
                        ORDER BY created_at DESC
                    ''', (user_id,))
                
                statements = []
                for row in cursor.fetchall():
                    statements.append({
                        'id': row[0],
                        'title': row[1],
                        'content': row[2],
                        'target_school': row[3],
                        'version': row[4],
                        'notes': row[5],
                        'created_at': row[6]
                    })
                return statements
            return []
        except Exception as e:
            st.error(f"Error getting personal statements: {str(e)}")
            return []
    
    # Notification methods
    def create_notification(self, user_id: int, title: str, message: str) -> int:
        """Create a new notification"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'create_notification'):
                return self.storage_manager.create_notification(user_id, title, message)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    INSERT INTO notifications (user_id, title, message)
                    VALUES (?, ?, ?)
                ''', (user_id, title, message))
                self.conn.commit()
                
                # Sync to cloud if available
                if self.storage_type == "google_drive":
                    self.sync_to_cloud()
                
                return cursor.lastrowid
            return None
        except Exception as e:
            st.error(f"Error creating notification: {str(e)}")
            return None
    
    def get_notifications(self, user_id: int, unread_only: bool = False) -> List[Dict]:
        """Get all notifications for a user"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'get_notifications'):
                return self.storage_manager.get_notifications(user_id, unread_only)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                if unread_only:
                    cursor.execute('''
                        SELECT id, title, message, is_read, created_at
                        FROM notifications WHERE user_id = ? AND is_read = FALSE
                        ORDER BY created_at DESC
                    ''', (user_id,))
                else:
                    cursor.execute('''
                        SELECT id, title, message, is_read, created_at
                        FROM notifications WHERE user_id = ?
                        ORDER BY created_at DESC
                    ''', (user_id,))
                
                notifications = []
                for row in cursor.fetchall():
                    notifications.append({
                        'id': row[0],
                        'title': row[1],
                        'message': row[2],
                        'is_read': bool(row[3]),
                        'created_at': row[4]
                    })
                return notifications
            return []
        except Exception as e:
            st.error(f"Error getting notifications: {str(e)}")
            return []
    
    def mark_notification_read(self, notification_id: int) -> bool:
        """Mark a notification as read"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'mark_notification_read'):
                return self.storage_manager.mark_notification_read(notification_id)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    UPDATE notifications SET is_read = TRUE
                    WHERE id = ?
                ''', (notification_id,))
                self.conn.commit()
                
                # Sync to cloud if available
                if self.storage_type == "google_drive":
                    self.sync_to_cloud()
                
                return True
            return False
        except Exception as e:
            st.error(f"Error marking notification read: {str(e)}")
            return False
    
    # High-level methods for backward compatibility
    def register_user(self, name: str, email: str, phone: str, password: str) -> tuple[bool, str]:
        """Register a new user"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'register_user'):
                return self.storage_manager.register_user(name, email, phone, password)
            
            # Use SQLite
            import hashlib
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            success = self.create_user(name, email, password_hash, name, phone)
            if success:
                return True, "User registered successfully"
            else:
                return False, "Failed to create user"
        except Exception as e:
            return False, f"Registration error: {str(e)}"
    
    def login_user(self, email: str, password: str) -> tuple[bool, str, dict]:
        """Login user"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'login_user'):
                return self.storage_manager.login_user(email, password)
            
            # Use SQLite
            import hashlib
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            user = self.verify_user(email, password_hash)
            if user:
                return True, "Login successful", user
            else:
                return False, "Invalid email or password", {}
        except Exception as e:
            return False, f"Login error: {str(e)}", {}
    
    def add_child_profile(self, user_id: int, child_name: str, date_of_birth: str, gender: str) -> tuple[bool, str]:
        """Add a child profile"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'add_child_profile'):
                return self.storage_manager.add_child_profile(user_id, child_name, date_of_birth, gender)
            
            # Use SQLite
            profile_id = self.create_child_profile(user_id, child_name, date_of_birth, gender)
            if profile_id:
                return True, f"Child profile created with ID: {profile_id}"
            else:
                return False, "Failed to create child profile"
        except Exception as e:
            return False, f"Error creating child profile: {str(e)}"
    
    def add_portfolio_item(self, user_id: int, child_id: int, title: str, description: str, 
                          category: str, item_date: str, attachment_path: str = None, notes: str = None) -> tuple[bool, str]:
        """Add a portfolio item"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'add_portfolio_item'):
                return self.storage_manager.add_portfolio_item(user_id, child_id, title, description, category, item_date, attachment_path, notes)
            
            # Use SQLite
            item_id = self.create_portfolio_item(user_id, child_id, title, description, category, attachment_path, item_date, notes)
            if item_id:
                return True, f"Portfolio item created with ID: {item_id}"
            else:
                return False, "Failed to create portfolio item"
        except Exception as e:
            return False, f"Error creating portfolio item: {str(e)}"
    
    def add_personal_statement(self, user_id: int, child_id: int, title: str, content: str,
                              target_school: str = None, version: str = "1.0", notes: str = None) -> tuple[bool, str]:
        """Add a personal statement"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'add_personal_statement'):
                return self.storage_manager.add_personal_statement(user_id, child_id, title, content, target_school, version, notes)
            
            # Use SQLite
            statement_id = self.create_personal_statement(user_id, child_id, title, content, target_school, version, notes)
            if statement_id:
                return True, f"Personal statement created with ID: {statement_id}"
            else:
                return False, "Failed to create personal statement"
        except Exception as e:
            return False, f"Error creating personal statement: {str(e)}"
    
    def add_notification(self, user_id: int, title: str, message: str, priority: str = 'medium') -> tuple[bool, str]:
        """Add a notification"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'add_notification'):
                return self.storage_manager.add_notification(user_id, title, message, priority)
            
            # Use SQLite
            notification_id = self.create_notification(user_id, title, message)
            if notification_id:
                return True, f"Notification created with ID: {notification_id}"
            else:
                return False, "Failed to create notification"
        except Exception as e:
            return False, f"Error creating notification: {str(e)}"
    
    def submit_application(self, user_id: int, child_id: int, school_no: str, school_name: str,
                          parent_name: str, parent_email: str, parent_phone: str,
                          preferred_start_date: str, notes: str = None) -> tuple[bool, str]:
        """Submit an application"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'submit_application'):
                return self.storage_manager.submit_application(user_id, child_id, school_no, school_name, parent_name, parent_email, parent_phone, preferred_start_date, notes)
            
            # Use SQLite
            application_id = self.create_application(user_id, child_id, school_name, "kindergarten", preferred_start_date, notes)
            if application_id:
                return True, f"Application submitted with ID: {application_id}"
            else:
                return False, "Failed to submit application"
        except Exception as e:
            return False, f"Error submitting application: {str(e)}"
    
    def add_to_tracker(self, user_id: int, school_no: str, school_name: str) -> tuple[bool, str]:
        """Add school to application tracker"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'add_to_tracker'):
                return self.storage_manager.add_to_tracker(user_id, school_no, school_name)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO application_tracking (user_id, school_no, school_name)
                    VALUES (?, ?, ?)
                ''', (user_id, school_no, school_name))
                self.conn.commit()
                
                # Sync to cloud if available
                if self.storage_type == "google_drive":
                    self.sync_to_cloud()
                
                return True, "School added to tracker"
            return False, "No database connection"
        except Exception as e:
            return False, f"Error adding to tracker: {str(e)}"
    
    def remove_from_tracker(self, user_id: int, school_no: str) -> tuple[bool, str]:
        """Remove school from application tracker"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'remove_from_tracker'):
                return self.storage_manager.remove_from_tracker(user_id, school_no)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    DELETE FROM application_tracking WHERE user_id = ? AND school_no = ?
                ''', (user_id, school_no))
                self.conn.commit()
                
                # Sync to cloud if available
                if self.storage_type == "google_drive":
                    self.sync_to_cloud()
                
                return True, "School removed from tracker"
            return False, "No database connection"
        except Exception as e:
            return False, f"Error removing from tracker: {str(e)}"
    
    def get_tracked_schools(self, user_id: int) -> List[Dict]:
        """Get tracked schools for a user"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'get_tracked_schools'):
                return self.storage_manager.get_tracked_schools(user_id)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    SELECT school_no, school_name, status, notes, date_updated
                    FROM application_tracking WHERE user_id = ?
                    ORDER BY date_updated DESC
                ''', (user_id,))
                
                schools = []
                for row in cursor.fetchall():
                    schools.append({
                        'school_no': row[0],
                        'school_name': row[1],
                        'status': row[2],
                        'notes': row[3],
                        'date_updated': row[4]
                    })
                return schools
            return []
        except Exception as e:
            st.error(f"Error getting tracked schools: {str(e)}")
            return []
    
    def mark_all_notifications_read(self, user_id: int) -> bool:
        """Mark all notifications as read for a user"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'mark_all_notifications_read'):
                return self.storage_manager.mark_all_notifications_read(user_id)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    UPDATE notifications SET is_read = TRUE
                    WHERE user_id = ?
                ''', (user_id,))
                self.conn.commit()
                
                # Sync to cloud if available
                if self.storage_type == "google_drive":
                    self.sync_to_cloud()
                
                return True
            return False
        except Exception as e:
            st.error(f"Error marking notifications read: {str(e)}")
            return False
    
    def delete_portfolio_item(self, item_id: int) -> tuple[bool, str]:
        """Delete a portfolio item"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'delete_portfolio_item'):
                return self.storage_manager.delete_portfolio_item(item_id)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('DELETE FROM portfolio_items WHERE id = ?', (item_id,))
                self.conn.commit()
                
                # Sync to cloud if available
                if self.storage_type == "google_drive":
                    self.sync_to_cloud()
                
                return True, "Portfolio item deleted"
            return False, "No database connection"
        except Exception as e:
            return False, f"Error deleting portfolio item: {str(e)}"
    
    def delete_personal_statement(self, statement_id: int) -> tuple[bool, str]:
        """Delete a personal statement"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'delete_personal_statement'):
                return self.storage_manager.delete_personal_statement(statement_id)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('DELETE FROM personal_statements WHERE id = ?', (statement_id,))
                self.conn.commit()
                
                # Sync to cloud if available
                if self.storage_type == "google_drive":
                    self.sync_to_cloud()
                
                return True, "Personal statement deleted"
            return False, "No database connection"
        except Exception as e:
            return False, f"Error deleting personal statement: {str(e)}"
    
    def reset_user_by_email(self, email: str) -> bool:
        """Reset user data by email (for testing)"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'reset_user_by_email'):
                return self.storage_manager.reset_user_by_email(email)
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                # Get user ID first
                cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
                user = cursor.fetchone()
                if user:
                    user_id = user[0]
                    # Delete related data
                    cursor.execute('DELETE FROM notifications WHERE user_id = ?', (user_id,))
                    cursor.execute('DELETE FROM portfolio_items WHERE user_id = ?', (user_id,))
                    cursor.execute('DELETE FROM personal_statements WHERE user_id = ?', (user_id,))
                    cursor.execute('DELETE FROM applications WHERE user_id = ?', (user_id,))
                    cursor.execute('DELETE FROM child_profiles WHERE user_id = ?', (user_id,))
                    cursor.execute('DELETE FROM application_tracking WHERE user_id = ?', (user_id,))
                    cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
                    self.conn.commit()
                    
                    # Sync to cloud if available
                    if self.storage_type == "google_drive":
                        self.sync_to_cloud()
                    
                    return True
            return False
        except Exception as e:
            st.error(f"Error resetting user: {str(e)}")
            return False
    
    def set_user_password(self, email: str, new_password: str) -> bool:
        """Set user password"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'set_user_password'):
                return self.storage_manager.set_user_password(email, new_password)
            
            # Use SQLite
            import hashlib
            password_hash = hashlib.sha256(new_password.encode()).hexdigest()
            
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    UPDATE users SET password_hash = ? WHERE email = ?
                ''', (password_hash, email))
                self.conn.commit()
                
                # Sync to cloud if available
                if self.storage_type == "google_drive":
                    self.sync_to_cloud()
                
                return True
            return False
        except Exception as e:
            st.error(f"Error setting password: {str(e)}")
            return False
    
    def get_all_users(self) -> List[Dict]:
        """Get all users (for admin purposes)"""
        try:
            # Check if using Supabase
            if self.storage_manager and hasattr(self.storage_manager, 'get_all_users'):
                return self.storage_manager.get_all_users()
            
            # Use SQLite
            if self.conn:
                cursor = self.conn.cursor()
                cursor.execute('''
                    SELECT id, username, email, full_name, phone, created_at
                    FROM users ORDER BY created_at DESC
                ''')
                
                users = []
                for row in cursor.fetchall():
                    users.append({
                        'id': row[0],
                        'username': row[1],
                        'email': row[2],
                        'full_name': row[3],
                        'phone': row[4],
                        'created_at': row[5]
                    })
                return users
            return []
        except Exception as e:
            st.error(f"Error getting users: {str(e)}")
            return []
    
    @property
    def db_path(self) -> str:
        """Get database path"""
        if self.conn:
            return self.conn.execute("PRAGMA database_list").fetchone()[2]
        return "No database connection"
    
    @property
    def is_streamlit_cloud(self) -> bool:
        """Check if running on Streamlit Cloud"""
        return os.environ.get('STREAMLIT_SERVER_HEADLESS') == 'true' 