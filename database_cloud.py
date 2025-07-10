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
        
        # Initialize storage based on type
        if storage_type == "google_drive" and CLOUD_STORAGE_AVAILABLE:
            try:
                self.storage_manager = CloudSQLiteManager()
                if self.storage_manager.drive_service:
                    st.success("✅ Google Drive cloud storage initialized!")
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
                # Use cloud storage
                self.conn = self.storage_manager.get_database_connection()
            else:
                # Use local storage (fallback)
                db_path = "school_portal.db"
                self.conn = sqlite3.connect(db_path)
            
            if self.conn:
                self._create_tables()
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
                application_id INTEGER,
                status TEXT NOT NULL,
                notes TEXT,
                date_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (application_id) REFERENCES applications (id)
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
                file_path TEXT,
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (child_id) REFERENCES child_profiles (id)
            )
        ''')
        
        self.conn.commit()
    
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
                            category: str = None, file_path: str = None) -> int:
        """Create a new portfolio item"""
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                INSERT INTO portfolio_items 
                (user_id, child_id, title, description, category, file_path)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, child_id, title, description, category, file_path))
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
                    SELECT id, title, description, category, file_path, created_at
                    FROM portfolio_items 
                    WHERE user_id = ? AND child_id = ?
                    ORDER BY created_at DESC
                ''', (user_id, child_id))
            else:
                cursor.execute('''
                    SELECT id, title, description, category, file_path, created_at
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
                    'file_path': row[4],
                    'created_at': row[5]
                })
            return items
        except Exception as e:
            st.error(f"Error getting portfolio items: {str(e)}")
            return []
    
    # Personal statement methods
    def create_personal_statement(self, user_id: int, child_id: int, title: str, content: str) -> int:
        """Create a new personal statement"""
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                INSERT INTO personal_statements 
                (user_id, child_id, title, content)
                VALUES (?, ?, ?, ?)
            ''', (user_id, child_id, title, content))
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
                    SELECT id, title, content, created_at
                    FROM personal_statements 
                    WHERE user_id = ? AND child_id = ?
                    ORDER BY created_at DESC
                ''', (user_id, child_id))
            else:
                cursor.execute('''
                    SELECT id, title, content, created_at
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
                    'created_at': row[3]
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