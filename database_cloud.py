"""
Cloud Database Manager
Integrates SQLite with cloud storage options
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
            storage_type: "local", "google_drive", or "simple_cloud"
        """
        self.storage_type = storage_type
        self.conn = None
        self.storage_manager = None
        
        # Add debug information
        st.write(f"🔧 Debug: Initializing with storage_type = {storage_type}")
        st.write(f"🔧 Debug: CLOUD_STORAGE_AVAILABLE = {CLOUD_STORAGE_AVAILABLE}")
        
        # Initialize storage based on type
        if storage_type == "google_drive" and CLOUD_STORAGE_AVAILABLE:
            st.write("🔧 Debug: Attempting Google Drive initialization...")
            try:
                self.storage_manager = CloudSQLiteManager()
                if self.storage_manager.drive_service:
                    st.success("✅ Google Drive cloud storage initialized!")
                    st.write(f"🔧 Debug: Google Drive service created successfully")
                else:
                    st.warning("⚠️ Google Drive not available, falling back to local storage")
                    st.write("🔧 Debug: drive_service is None, falling back")
                    self.storage_type = "local"
            except Exception as e:
                st.error(f"❌ Google Drive initialization failed: {str(e)}")
                st.write(f"🔧 Debug: Exception during Google Drive init: {type(e).__name__}: {e}")
                st.info("Falling back to local storage")
                self.storage_type = "local"
        elif storage_type == "simple_cloud" and CLOUD_STORAGE_AVAILABLE:
            st.write("🔧 Debug: Using SimpleCloudSQLite...")
            self.storage_manager = SimpleCloudSQLite()
        else:
            st.write("🔧 Debug: No cloud storage manager (using local)")
            self.storage_manager = None
        
        # Initialize database
        self._init_database()
    
    def _init_database(self):
        """Initialize database connection and create tables"""
        try:
            if self.storage_manager:
                # Handle file upload for simple cloud storage
                if hasattr(self.storage_manager, 'handle_file_upload'):
                    self.storage_manager.handle_file_upload()
                
                # Use cloud storage
                self.conn = self.storage_manager.get_database_connection()
            else:
                # Use local storage (fallback)
                db_path = "school_portal.db"
                self.conn = sqlite3.connect(db_path)
            
            if self.conn:
                self._create_tables()
                self._initialize_test_data()
                st.success(f"✅ Database initialized successfully! (Storage: {self.storage_type})")
            else:
                st.error("❌ Failed to initialize database connection")
                
        except Exception as e:
            st.error(f"❌ Database initialization error: {str(e)}")
    
    def _create_tables(self):
        """Create all necessary tables"""
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (child_id) REFERENCES child_profiles (id)
            )
        ''')
        
        self.conn.commit()
    
    def _initialize_test_data(self):
        """Initialize test data if database is empty"""
        try:
            cursor = self.conn.cursor()
            
            # Check if any users exist
            cursor.execute('SELECT COUNT(*) FROM users')
            user_count = cursor.fetchone()[0]
            
            if user_count == 0:
                # Create test users
                test_users = [
                    ('john', 'john@example.com', 'password123', 'John Smith', '+852 1234 5678'),
                    ('mary', 'mary@example.com', 'password123', 'Mary Wong', '+852 2345 6789'),
                    ('david', 'david@example.com', 'password123', 'David Lee', '+852 3456 7890')
                ]
                
                for username, email, password, full_name, phone in test_users:
                    import hashlib
                    password_hash = hashlib.sha256(password.encode()).hexdigest()
                    self.create_user(username, email, password_hash, full_name, phone)
                
                st.info("✅ Test users created successfully!")
        except Exception as e:
            st.error(f"Error initializing test data: {str(e)}")
    
    def close_connection(self):
        """Close database connection and sync with cloud storage"""
        if self.conn:
            if self.storage_manager and hasattr(self.storage_manager, 'close_connection'):
                self.storage_manager.close_connection(self.conn)
            else:
                self.conn.close()
    
    def sync_to_cloud(self):
        """Manually sync database to cloud storage"""
        if self.storage_manager and hasattr(self.storage_manager, 'upload_database'):
            try:
                success = self.storage_manager.upload_database()
                if success:
                    st.success("✅ Database synced to cloud successfully!")
                else:
                    st.error("❌ Failed to sync database to cloud")
            except Exception as e:
                st.error(f"❌ Sync error: {str(e)}")
    
    # User management methods
    def create_user(self, username: str, email: str, password_hash: str, full_name: str = None, phone: str = None) -> bool:
        """Create a new user"""
        try:
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
        except sqlite3.IntegrityError:
            return False
        except Exception as e:
            st.error(f"Error creating user: {str(e)}")
            return False
    
    def verify_user(self, email: str, password_hash: str) -> Optional[Dict]:
        """Verify user login"""
        try:
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
        except Exception as e:
            st.error(f"Error creating child profile: {str(e)}")
            return None
    
    def get_child_profiles(self, user_id: int) -> List[Dict]:
        """Get all child profiles for a user"""
        try:
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
        except Exception as e:
            st.error(f"Error getting child profiles: {str(e)}")
            return []
    
    # Application methods
    def create_application(self, user_id: int, child_id: int, school_name: str, school_type: str,
                          application_date: str, notes: str = None) -> int:
        """Create a new application"""
        try:
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
        except Exception as e:
            st.error(f"Error creating application: {str(e)}")
            return None
    
    def get_applications(self, user_id: int) -> List[Dict]:
        """Get all applications for a user"""
        try:
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
        except Exception as e:
            st.error(f"Error getting applications: {str(e)}")
            return []
    
    # Portfolio methods
    def create_portfolio_item(self, user_id: int, child_id: int, title: str, description: str = None,
                            category: str = None, attachment_path: str = None, item_date: str = None, notes: str = None) -> int:
        """Create a new portfolio item"""
        try:
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
        except Exception as e:
            st.error(f"Error creating portfolio item: {str(e)}")
            return None
    
    def get_portfolio_items(self, user_id: int, child_id: int = None) -> List[Dict]:
        """Get portfolio items for a user/child"""
        try:
            cursor = self.conn.cursor()
            if child_id:
                cursor.execute('''
                    SELECT id, title, description, category, item_date, attachment_path, notes, created_at
                    FROM portfolio_items 
                    WHERE user_id = ? AND child_id = ?
                    ORDER BY created_at DESC
                ''', (user_id, child_id))
            else:
                cursor.execute('''
                    SELECT id, title, description, category, item_date, attachment_path, notes, created_at
                    FROM portfolio_items 
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                ''', (user_id,))
            
            items = []
            for row in cursor.fetchall():
                items.append({
                    'id': row[0],
                    'title': row[1],
                    'description': row[2],
                    'category': row[3],
                    'item_date': row[4],
                    'attachment_path': row[5],
                    'notes': row[6],
                    'created_at': row[7]
                })
            return items
        except Exception as e:
            st.error(f"Error getting portfolio items: {str(e)}")
            return []
    
    # Personal statement methods
    def create_personal_statement(self, user_id: int, child_id: int, title: str, content: str, 
                                 target_school: str = None, version: str = "1.0", notes: str = None) -> int:
        """Create a new personal statement"""
        try:
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
        except Exception as e:
            st.error(f"Error creating personal statement: {str(e)}")
            return None
    
    def get_personal_statements(self, user_id: int, child_id: int = None) -> List[Dict]:
        """Get personal statements for a user/child"""
        try:
            cursor = self.conn.cursor()
            if child_id:
                cursor.execute('''
                    SELECT id, title, content, target_school, version, notes, created_at, updated_at
                    FROM personal_statements 
                    WHERE user_id = ? AND child_id = ?
                    ORDER BY created_at DESC
                ''', (user_id, child_id))
            else:
                cursor.execute('''
                    SELECT id, title, content, target_school, version, notes, created_at, updated_at
                    FROM personal_statements 
                    WHERE user_id = ?
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
                    'created_at': row[6],
                    'updated_at': row[7]
                })
            return statements
        except Exception as e:
            st.error(f"Error getting personal statements: {str(e)}")
            return []
    
    # Notification methods
    def create_notification(self, user_id: int, title: str, message: str) -> int:
        """Create a new notification"""
        try:
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
        except Exception as e:
            st.error(f"Error creating notification: {str(e)}")
            return None
    
    def get_notifications(self, user_id: int, unread_only: bool = False) -> List[Dict]:
        """Get notifications for a user"""
        try:
            cursor = self.conn.cursor()
            if unread_only:
                cursor.execute('''
                    SELECT id, title, message, is_read, created_at
                    FROM notifications 
                    WHERE user_id = ? AND is_read = FALSE
                    ORDER BY created_at DESC
                ''', (user_id,))
            else:
                cursor.execute('''
                    SELECT id, title, message, is_read, created_at
                    FROM notifications 
                    WHERE user_id = ?
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
        except Exception as e:
            st.error(f"Error getting notifications: {str(e)}")
            return []
    
    def mark_notification_read(self, notification_id: int) -> bool:
        """Mark a notification as read"""
        try:
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
        except Exception as e:
            st.error(f"Error marking notification read: {str(e)}")
            return False
    
    # Database backup/restore methods
    def backup_database(self) -> bytes:
        """Create a backup of the database"""
        try:
            if self.storage_manager and hasattr(self.storage_manager, 'download_database'):
                # For cloud storage, get the current database file
                return self.storage_manager.download_database()
            else:
                # For local storage, read the file directly
                if hasattr(self.conn, 'temp_path'):
                    with open(self.conn.temp_path, 'rb') as f:
                        return f.read()
                else:
                    # Create a backup from the current connection
                    backup_conn = sqlite3.connect(':memory:')
                    self.conn.backup(backup_conn)
                    return backup_conn.execute("SELECT * FROM sqlite_master").fetchall()
        except Exception as e:
            st.error(f"Error creating backup: {str(e)}")
            return None
    
    def restore_database(self, backup_data: bytes) -> bool:
        """Restore database from backup"""
        try:
            if self.storage_manager and hasattr(self.storage_manager, 'upload_database'):
                # For cloud storage, upload the backup
                with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
                    tmp_file.write(backup_data)
                    tmp_file_path = tmp_file.name
                
                # Update the storage manager with the backup
                self.storage_manager.temp_db_path = tmp_file_path
                return self.storage_manager.upload_database()
            else:
                # For local storage, write the backup directly
                with open("school_portal_backup.db", 'wb') as f:
                    f.write(backup_data)
                return True
        except Exception as e:
            st.error(f"Error restoring backup: {str(e)}")
            return False
    
    # Additional methods needed by the app
    
    def register_user(self, name: str, email: str, phone: str, password: str) -> tuple[bool, str]:
        """Register a new user with simplified interface"""
        try:
            import hashlib
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            username = email.split('@')[0]  # Use email prefix as username
            
            success = self.create_user(username, email, password_hash, name, phone)
            if success:
                return True, "User registered successfully"
            else:
                return False, "User already exists or registration failed"
        except Exception as e:
            return False, f"Registration error: {str(e)}"
    
    def login_user(self, email: str, password: str) -> tuple[bool, str, dict]:
        """Login user with simplified interface"""
        try:
            import hashlib
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            user = self.verify_user(email, password_hash)
            if user:
                return True, "Login successful", {
                    'id': user['id'],
                    'name': user['full_name'],
                    'email': user['email'],
                    'phone': user['phone']
                }
            else:
                return False, "Invalid email or password", None
        except Exception as e:
            return False, f"Login error: {str(e)}", None
    
    def add_child_profile(self, user_id: int, child_name: str, date_of_birth: str, gender: str) -> tuple[bool, str]:
        """Add child profile with simplified interface"""
        try:
            child_id = self.create_child_profile(user_id, child_name, date_of_birth, gender)
            if child_id:
                return True, "Child profile added successfully"
            else:
                return False, "Failed to add child profile"
        except Exception as e:
            return False, f"Error adding child profile: {str(e)}"
    
    def add_portfolio_item(self, user_id: int, child_id: int, title: str, description: str, 
                          category: str, item_date: str, attachment_path: str = None, notes: str = None) -> tuple[bool, str]:
        """Add portfolio item with simplified interface"""
        try:
            item_id = self.create_portfolio_item(user_id, child_id, title, description, category, attachment_path, item_date, notes)
            if item_id:
                return True, "Portfolio item added successfully"
            else:
                return False, "Failed to add portfolio item"
        except Exception as e:
            return False, f"Error adding portfolio item: {str(e)}"
    
    def add_personal_statement(self, user_id: int, child_id: int, title: str, content: str,
                              target_school: str = None, version: str = "1.0", notes: str = None) -> tuple[bool, str]:
        """Add personal statement with simplified interface"""
        try:
            statement_id = self.create_personal_statement(user_id, child_id, title, content, target_school, version, notes)
            if statement_id:
                return True, "Personal statement added successfully"
            else:
                return False, "Failed to add personal statement"
        except Exception as e:
            return False, f"Error adding personal statement: {str(e)}"
    
    def add_notification(self, user_id: int, title: str, message: str, priority: str = 'medium') -> tuple[bool, str]:
        """Add notification with simplified interface"""
        try:
            notification_id = self.create_notification(user_id, title, message)
            if notification_id:
                return True, "Notification added successfully"
            else:
                return False, "Failed to add notification"
        except Exception as e:
            return False, f"Error adding notification: {str(e)}"
    
    def submit_application(self, user_id: int, child_id: int, school_no: str, school_name: str,
                          parent_name: str, parent_email: str, parent_phone: str,
                          preferred_start_date: str, notes: str = None) -> tuple[bool, str]:
        """Submit application with simplified interface"""
        try:
            application_id = self.create_application(user_id, child_id, school_name, "kindergarten", preferred_start_date, notes)
            if application_id:
                return True, "Application submitted successfully"
            else:
                return False, "Failed to submit application"
        except Exception as e:
            return False, f"Error submitting application: {str(e)}"
    
    def add_to_tracker(self, user_id: int, school_no: str, school_name: str) -> tuple[bool, str]:
        """Add school to application tracker"""
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO application_tracking 
                (user_id, school_no, school_name, status, date_updated)
                VALUES (?, ?, ?, 'tracking', CURRENT_TIMESTAMP)
            ''', (user_id, school_no, school_name))
            self.conn.commit()
            return True, f"Added {school_name} to tracker"
        except Exception as e:
            return False, f"Error adding to tracker: {str(e)}"
    
    def remove_from_tracker(self, user_id: int, school_no: str) -> tuple[bool, str]:
        """Remove school from application tracker"""
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                DELETE FROM application_tracking 
                WHERE user_id = ? AND school_no = ?
            ''', (user_id, school_no))
            self.conn.commit()
            return True, "Removed from tracker"
        except Exception as e:
            return False, f"Error removing from tracker: {str(e)}"
    
    def get_tracked_schools(self, user_id: int) -> List[Dict]:
        """Get tracked schools for a user"""
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                SELECT school_no, school_name, status, date_updated
                FROM application_tracking 
                WHERE user_id = ?
                ORDER BY date_updated DESC
            ''', (user_id,))
            
            schools = []
            for row in cursor.fetchall():
                schools.append({
                    'school_no': row[0],
                    'school_name': row[1],
                    'status': row[2],
                    'added_date': row[3],
                    'last_checked': row[3]
                })
            return schools
        except Exception as e:
            st.error(f"Error getting tracked schools: {str(e)}")
            return []
    
    def mark_all_notifications_read(self, user_id: int) -> bool:
        """Mark all notifications as read for a user"""
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                UPDATE notifications SET is_read = TRUE
                WHERE user_id = ?
            ''', (user_id,))
            self.conn.commit()
            return True
        except Exception as e:
            st.error(f"Error marking all notifications read: {str(e)}")
            return False
    
    def delete_portfolio_item(self, item_id: int) -> tuple[bool, str]:
        """Delete a portfolio item"""
        try:
            cursor = self.conn.cursor()
            cursor.execute('DELETE FROM portfolio_items WHERE id = ?', (item_id,))
            self.conn.commit()
            return True, "Portfolio item deleted successfully"
        except Exception as e:
            return False, f"Error deleting portfolio item: {str(e)}"
    
    def delete_personal_statement(self, statement_id: int) -> tuple[bool, str]:
        """Delete a personal statement"""
        try:
            cursor = self.conn.cursor()
            cursor.execute('DELETE FROM personal_statements WHERE id = ?', (statement_id,))
            self.conn.commit()
            return True, "Personal statement deleted successfully"
        except Exception as e:
            return False, f"Error deleting personal statement: {str(e)}"
    
    def reset_user_by_email(self, email: str) -> bool:
        """Delete user and all related data by email"""
        try:
            cursor = self.conn.cursor()
            # Get user ID first
            cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
            user = cursor.fetchone()
            if not user:
                return False
            
            user_id = user[0]
            
            # Delete all related data
            cursor.execute('DELETE FROM notifications WHERE user_id = ?', (user_id,))
            cursor.execute('DELETE FROM portfolio_items WHERE user_id = ?', (user_id,))
            cursor.execute('DELETE FROM personal_statements WHERE user_id = ?', (user_id,))
            cursor.execute('DELETE FROM applications WHERE user_id = ?', (user_id,))
            cursor.execute('DELETE FROM child_profiles WHERE user_id = ?', (user_id,))
            cursor.execute('DELETE FROM application_tracking WHERE user_id = ?', (user_id,))
            cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
            
            self.conn.commit()
            return True
        except Exception as e:
            st.error(f"Error resetting user: {str(e)}")
            return False
    
    def set_user_password(self, email: str, new_password: str) -> bool:
        """Set new password for user by email"""
        try:
            import hashlib
            password_hash = hashlib.sha256(new_password.encode()).hexdigest()
            
            cursor = self.conn.cursor()
            cursor.execute('''
                UPDATE users SET password_hash = ?
                WHERE email = ?
            ''', (password_hash, email))
            self.conn.commit()
            
            return cursor.rowcount > 0
        except Exception as e:
            st.error(f"Error setting password: {str(e)}")
            return False
    
    def get_all_users(self) -> List[Dict]:
        """Get all users for admin purposes"""
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                SELECT id, username, email, full_name, phone, created_at
                FROM users
                ORDER BY created_at DESC
            ''')
            
            users = []
            for row in cursor.fetchall():
                users.append({
                    'id': row[0],
                    'username': row[1],
                    'email': row[2],
                    'full_name': row[3],
                    'phone': row[4],
                    'created_at': row[5],
                    'is_active': True  # Assume all users are active
                })
            return users
        except Exception as e:
            st.error(f"Error getting all users: {str(e)}")
            return []
    
    @property
    def db_path(self) -> str:
        """Get database path for debug info"""
        if hasattr(self.conn, 'temp_path'):
            return self.conn.temp_path
        elif self.storage_type == "local":
            return "school_portal.db"
        else:
            return f"cloud_{self.storage_type}"
    
    @property
    def is_streamlit_cloud(self) -> bool:
        """Check if running on Streamlit Cloud"""
        return os.environ.get('STREAMLIT_SERVER_PORT') is not None 