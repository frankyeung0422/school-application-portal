import sqlite3
import hashlib
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

class DatabaseManager:
    def __init__(self, db_path: str = "school_portal.db"):
        """Initialize database manager with Streamlit Cloud support"""
        self.db_path = db_path
        self.is_streamlit_cloud = self._detect_streamlit_cloud()
        
        if self.is_streamlit_cloud:
            print("[INFO] Running on Streamlit Cloud - using in-memory database")
            self.db_path = ":memory:"
        else:
            print(f"[INFO] Running locally - using file database: {db_path}")
        
        self.init_database()
    
    def _detect_streamlit_cloud(self) -> bool:
        """Detect if running on Streamlit Cloud"""
        # Check for Streamlit Cloud environment variables
        cloud_indicators = [
            'STREAMLIT_SERVER_PORT',
            'STREAMLIT_SERVER_HEADLESS',
            'STREAMLIT_SERVER_ENABLE_CORS',
            'STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION'
        ]
        
        for indicator in cloud_indicators:
            if os.environ.get(indicator):
                return True
        
        # Check if running in Streamlit environment
        try:
            import streamlit as st
            return True
        except ImportError:
            pass
        
        return False
    
    def init_database(self):
        """Initialize database tables"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Users table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    phone TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1,
                    last_login TIMESTAMP
                )
            ''')
            
            # Child profiles table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS child_profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    date_of_birth DATE NOT NULL,
                    gender TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')
            
            # Applications table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS applications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    child_id INTEGER NOT NULL,
                    school_no TEXT NOT NULL,
                    school_name TEXT NOT NULL,
                    parent_name TEXT NOT NULL,
                    parent_email TEXT NOT NULL,
                    parent_phone TEXT NOT NULL,
                    preferred_start_date DATE NOT NULL,
                    additional_notes TEXT,
                    status TEXT DEFAULT 'pending',
                    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (child_id) REFERENCES child_profiles (id)
                )
            ''')
            
            # Application tracker table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS application_tracker (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    school_no TEXT NOT NULL,
                    school_name TEXT NOT NULL,
                    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'tracking',
                    last_checked TIMESTAMP,
                    application_info TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')
            
            # Notifications table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    priority TEXT DEFAULT 'medium',
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_read BOOLEAN DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')
            
            # Portfolio items table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS portfolio_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    child_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    category TEXT NOT NULL,
                    item_date DATE NOT NULL,
                    attachment_path TEXT,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (child_id) REFERENCES child_profiles (id)
                )
            ''')
            
            # Personal statements table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS personal_statements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    child_id INTEGER NOT NULL,
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
            
            conn.commit()
    
    def hash_password(self, password: str) -> str:
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return self.hash_password(password) == hashed
    
    def register_user(self, name: str, email: str, phone: str, password: str) -> tuple[bool, str]:
        """Register a new user with enhanced error handling"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Enable foreign keys and set timeout
                conn.execute("PRAGMA foreign_keys = ON")
                conn.execute("PRAGMA busy_timeout = 30000")  # 30 second timeout
                
                cursor = conn.cursor()
                
                # Start transaction
                cursor.execute("BEGIN TRANSACTION")
                
                try:
                    # Check if user already exists
                    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
                    if cursor.fetchone():
                        cursor.execute("ROLLBACK")
                        return False, f"User with email '{email}' already exists"
                    
                    # Hash password and insert user
                    password_hash = self.hash_password(password)
                    cursor.execute('''
                        INSERT INTO users (name, email, phone, password_hash, is_active)
                        VALUES (?, ?, ?, ?, 1)
                    ''', (name, email, phone, password_hash))
                    
                    # Get the inserted user ID
                    user_id = cursor.lastrowid
                    
                    # Commit transaction
                    cursor.execute("COMMIT")
                    
                    print(f"[DB] Successfully registered user: {email} (ID: {user_id})")
                    return True, f"Registration successful! User ID: {user_id}"
                    
                except Exception as e:
                    cursor.execute("ROLLBACK")
                    print(f"[DB ERROR] Transaction failed for {email}: {str(e)}")
                    return False, f"Registration failed during transaction: {str(e)}"
                
        except Exception as e:
            print(f"[DB ERROR] Database connection failed: {str(e)}")
            return False, f"Registration failed: Database error - {str(e)}"

    def user_exists(self, email: str) -> bool:
        """Check if a user exists by email"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
                return cursor.fetchone() is not None
        except Exception as e:
            print(f"[DB ERROR] Error checking user existence: {str(e)}")
            return False

    def get_all_users(self) -> List[Dict]:
        """Get all users (for debugging)"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, name, email, phone, is_active, created_at, last_login
                    FROM users ORDER BY created_at DESC
                ''')
                
                users = []
                for row in cursor.fetchall():
                    users.append({
                        'id': row[0],
                        'name': row[1],
                        'email': row[2],
                        'phone': row[3],
                        'is_active': bool(row[4]),
                        'created_at': row[5],
                        'last_login': row[6]
                    })
                
                return users
                
        except Exception as e:
            print(f"[DB ERROR] Error getting all users: {str(e)}")
            return []
    
    def login_user(self, email: str, password: str) -> tuple[bool, str, Optional[Dict]]:
        """Login a user"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Find user by email
                cursor.execute('''
                    SELECT id, name, email, phone, password_hash, created_at
                    FROM users WHERE email = ? AND is_active = 1
                ''', (email,))
                
                user_data = cursor.fetchone()
                if not user_data:
                    return False, "Invalid email or password", None
                
                user_id, name, email, phone, password_hash, created_at = user_data
                
                # Verify password
                if not self.verify_password(password, password_hash):
                    return False, "Invalid email or password", None
                
                # Update last login
                cursor.execute('''
                    UPDATE users SET last_login = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (user_id,))
                
                conn.commit()
                
                # Return user data
                user = {
                    'id': user_id,
                    'name': name,
                    'email': email,
                    'phone': phone,
                    'created_at': created_at
                }
                
                return True, "Login successful!", user
                
        except Exception as e:
            return False, f"Login failed: {str(e)}", None
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, name, email, phone, created_at, last_login
                    FROM users WHERE id = ? AND is_active = 1
                ''', (user_id,))
                
                user_data = cursor.fetchone()
                if user_data:
                    return {
                        'id': user_data[0],
                        'name': user_data[1],
                        'email': user_data[2],
                        'phone': user_data[3],
                        'created_at': user_data[4],
                        'last_login': user_data[5]
                    }
                return None
                
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    def update_user_profile(self, user_id: int, name: str, email: str, phone: str) -> tuple[bool, str]:
        """Update user profile"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check if email is already taken by another user
                cursor.execute("SELECT id FROM users WHERE email = ? AND id != ?", (email, user_id))
                if cursor.fetchone():
                    return False, "Email already taken by another user"
                
                # Update user
                cursor.execute('''
                    UPDATE users SET name = ?, email = ?, phone = ?
                    WHERE id = ?
                ''', (name, email, phone, user_id))
                
                conn.commit()
                return True, "Profile updated successfully!"
                
        except Exception as e:
            return False, f"Update failed: {str(e)}"
    
    def add_child_profile(self, user_id: int, name: str, date_of_birth: str, gender: str) -> tuple[bool, str]:
        """Add child profile"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO child_profiles (user_id, name, date_of_birth, gender)
                    VALUES (?, ?, ?, ?)
                ''', (user_id, name, date_of_birth, gender))
                
                conn.commit()
                return True, "Child profile added successfully!"
                
        except Exception as e:
            return False, f"Failed to add child profile: {str(e)}"
    
    def get_child_profiles(self, user_id: int) -> List[Dict]:
        """Get child profiles for user"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, name, date_of_birth, gender, created_at
                    FROM child_profiles WHERE user_id = ?
                    ORDER BY created_at DESC
                ''', (user_id,))
                
                profiles = []
                for row in cursor.fetchall():
                    profiles.append({
                        'id': row[0],
                        'name': row[1],
                        'date_of_birth': row[2],
                        'gender': row[3],
                        'created_at': row[4]
                    })
                
                return profiles
                
        except Exception as e:
            print(f"Error getting child profiles: {e}")
            return []
    
    def submit_application(self, user_id: int, child_id: int, school_no: str, school_name: str,
                          parent_name: str, parent_email: str, parent_phone: str,
                          preferred_start_date: str, additional_notes: str = "") -> tuple[bool, str]:
        """Submit application"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO applications 
                    (user_id, child_id, school_no, school_name, parent_name, parent_email, 
                     parent_phone, preferred_start_date, additional_notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (user_id, child_id, school_no, school_name, parent_name, parent_email,
                      parent_phone, preferred_start_date, additional_notes))
                
                conn.commit()
                return True, "Application submitted successfully!"
                
        except Exception as e:
            return False, f"Failed to submit application: {str(e)}"
    
    def get_applications(self, user_id: int) -> List[Dict]:
        """Get applications for user"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT a.id, a.school_name, c.name as child_name, a.status, 
                           a.submitted_at, a.preferred_start_date, a.additional_notes
                    FROM applications a
                    JOIN child_profiles c ON a.child_id = c.id
                    WHERE a.user_id = ?
                    ORDER BY a.submitted_at DESC
                ''', (user_id,))
                
                applications = []
                for row in cursor.fetchall():
                    applications.append({
                        'id': row[0],
                        'school_name': row[1],
                        'child_name': row[2],
                        'status': row[3],
                        'submitted_at': row[4],
                        'preferred_start_date': row[5],
                        'additional_notes': row[6]
                    })
                
                return applications
                
        except Exception as e:
            print(f"Error getting applications: {e}")
            return []
    
    def add_to_tracker(self, user_id: int, school_no: str, school_name: str) -> tuple[bool, str]:
        """Add school to application tracker"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check if already tracking
                cursor.execute('''
                    SELECT id FROM application_tracker 
                    WHERE user_id = ? AND school_no = ?
                ''', (user_id, school_no))
                
                if cursor.fetchone():
                    return False, "Already tracking this school"
                
                cursor.execute('''
                    INSERT INTO application_tracker (user_id, school_no, school_name)
                    VALUES (?, ?, ?)
                ''', (user_id, school_no, school_name))
                
                conn.commit()
                return True, "Added to tracker successfully!"
                
        except Exception as e:
            return False, f"Failed to add to tracker: {str(e)}"
    
    def get_tracked_schools(self, user_id: int) -> List[Dict]:
        """Get tracked schools for user"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, school_no, school_name, added_date, status, 
                           last_checked, application_info
                    FROM application_tracker 
                    WHERE user_id = ?
                    ORDER BY added_date DESC
                ''', (user_id,))
                
                schools = []
                for row in cursor.fetchall():
                    schools.append({
                        'id': row[0],
                        'school_no': row[1],
                        'school_name': row[2],
                        'added_date': row[3],
                        'status': row[4],
                        'last_checked': row[5],
                        'application_info': row[6]
                    })
                
                return schools
                
        except Exception as e:
            print(f"Error getting tracked schools: {e}")
            return []
    
    def remove_from_tracker(self, user_id: int, school_no: str) -> tuple[bool, str]:
        """Remove school from tracker"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    DELETE FROM application_tracker 
                    WHERE user_id = ? AND school_no = ?
                ''', (user_id, school_no))
                
                conn.commit()
                return True, "Removed from tracker successfully!"
                
        except Exception as e:
            return False, f"Failed to remove from tracker: {str(e)}"
    
    def add_notification(self, user_id: int, title: str, message: str, priority: str = 'medium') -> bool:
        """Add notification"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO notifications (user_id, title, message, priority)
                    VALUES (?, ?, ?, ?)
                ''', (user_id, title, message, priority))
                
                conn.commit()
                return True
                
        except Exception as e:
            print(f"Error adding notification: {e}")
            return False
    
    def get_notifications(self, user_id: int, include_read: bool = False) -> List[Dict]:
        """Get notifications for user"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if include_read:
                    cursor.execute('''
                        SELECT id, title, message, priority, timestamp, is_read
                        FROM notifications 
                        WHERE user_id = ?
                        ORDER BY timestamp DESC
                    ''', (user_id,))
                else:
                    cursor.execute('''
                        SELECT id, title, message, priority, timestamp, is_read
                        FROM notifications 
                        WHERE user_id = ? AND is_read = 0
                        ORDER BY timestamp DESC
                    ''', (user_id,))
                
                notifications = []
                for row in cursor.fetchall():
                    notifications.append({
                        'id': row[0],
                        'title': row[1],
                        'message': row[2],
                        'priority': row[3],
                        'timestamp': row[4],
                        'read': bool(row[5])
                    })
                
                return notifications
                
        except Exception as e:
            print(f"Error getting notifications: {e}")
            return []
    
    def mark_notification_read(self, notification_id: int) -> bool:
        """Mark notification as read"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE notifications SET is_read = 1
                    WHERE id = ?
                ''', (notification_id,))
                
                conn.commit()
                return True
                
        except Exception as e:
            print(f"Error marking notification read: {e}")
            return False
    
    def mark_all_notifications_read(self, user_id: int) -> bool:
        """Mark all notifications as read for user"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE notifications SET is_read = 1
                    WHERE user_id = ?
                ''', (user_id,))
                
                conn.commit()
                return True
                
        except Exception as e:
            print(f"Error marking all notifications read: {e}")
            return False
    
    # Portfolio methods
    def add_portfolio_item(self, user_id: int, child_id: int, title: str, description: str, 
                          category: str, item_date: str, attachment_path: str = None, 
                          notes: str = None) -> tuple[bool, str]:
        """Add a portfolio item"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO portfolio_items (user_id, child_id, title, description, category, 
                                               item_date, attachment_path, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (user_id, child_id, title, description, category, item_date, attachment_path, notes))
                conn.commit()
                return True, "Portfolio item added successfully!"
        except Exception as e:
            return False, f"Failed to add portfolio item: {str(e)}"
    
    def get_portfolio_items(self, user_id: int, child_id: int = None) -> List[Dict]:
        """Get portfolio items for a user"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                if child_id:
                    cursor.execute('''
                        SELECT id, child_id, title, description, category, item_date, 
                               attachment_path, notes, created_at, updated_at
                        FROM portfolio_items 
                        WHERE user_id = ? AND child_id = ?
                        ORDER BY item_date DESC
                    ''', (user_id, child_id))
                else:
                    cursor.execute('''
                        SELECT id, child_id, title, description, category, item_date, 
                               attachment_path, notes, created_at, updated_at
                        FROM portfolio_items 
                        WHERE user_id = ?
                        ORDER BY item_date DESC
                    ''', (user_id,))
                
                items = []
                for row in cursor.fetchall():
                    items.append({
                        'id': row[0],
                        'child_id': row[1],
                        'title': row[2],
                        'description': row[3],
                        'category': row[4],
                        'item_date': row[5],
                        'attachment_path': row[6],
                        'notes': row[7],
                        'created_at': row[8],
                        'updated_at': row[9]
                    })
                return items
        except Exception as e:
            print(f"Error getting portfolio items: {e}")
            return []
    
    def update_portfolio_item(self, item_id: int, title: str, description: str, 
                            category: str, item_date: str, attachment_path: str = None, 
                            notes: str = None) -> tuple[bool, str]:
        """Update a portfolio item"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE portfolio_items 
                    SET title = ?, description = ?, category = ?, item_date = ?, 
                        attachment_path = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (title, description, category, item_date, attachment_path, notes, item_id))
                conn.commit()
                return True, "Portfolio item updated successfully!"
        except Exception as e:
            return False, f"Failed to update portfolio item: {str(e)}"
    
    def delete_portfolio_item(self, item_id: int) -> tuple[bool, str]:
        """Delete a portfolio item"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM portfolio_items WHERE id = ?', (item_id,))
                conn.commit()
                return True, "Portfolio item deleted successfully!"
        except Exception as e:
            return False, f"Failed to delete portfolio item: {str(e)}"
    
    # Personal statement methods
    def add_personal_statement(self, user_id: int, child_id: int, title: str, content: str,
                              target_school: str = None, version: str = "1.0", 
                              notes: str = None) -> tuple[bool, str]:
        """Add a personal statement"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO personal_statements (user_id, child_id, title, content, 
                                                   target_school, version, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (user_id, child_id, title, content, target_school, version, notes))
                conn.commit()
                return True, "Personal statement added successfully!"
        except Exception as e:
            return False, f"Failed to add personal statement: {str(e)}"
    
    def get_personal_statements(self, user_id: int, child_id: int = None) -> List[Dict]:
        """Get personal statements for a user"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                if child_id:
                    cursor.execute('''
                        SELECT id, child_id, title, content, target_school, version, 
                               notes, created_at, updated_at
                        FROM personal_statements 
                        WHERE user_id = ?
                        AND child_id = ?
                        ORDER BY created_at DESC
                    ''', (user_id, child_id))
                else:
                    cursor.execute('''
                        SELECT id, child_id, title, content, target_school, version, 
                               notes, created_at, updated_at
                        FROM personal_statements 
                        WHERE user_id = ?
                        ORDER BY created_at DESC
                    ''', (user_id,))
                
                statements = []
                for row in cursor.fetchall():
                    statements.append({
                        'id': row[0],
                        'child_id': row[1],
                        'title': row[2],
                        'content': row[3],
                        'target_school': row[4],
                        'version': row[5],
                        'notes': row[6],
                        'created_at': row[7],
                        'updated_at': row[8]
                    })
                return statements
        except Exception as e:
            print(f"Error getting personal statements: {e}")
            return []
    
    def update_personal_statement(self, statement_id: int, title: str, content: str,
                                target_school: str = None, version: str = None, 
                                notes: str = None) -> tuple[bool, str]:
        """Update a personal statement"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE personal_statements 
                    SET title = ?, content = ?, target_school = ?, version = ?, 
                        notes = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (title, content, target_school, version, notes, statement_id))
                conn.commit()
                return True, "Personal statement updated successfully!"
        except Exception as e:
            return False, f"Failed to update personal statement: {str(e)}"
    
    def delete_personal_statement(self, statement_id: int) -> tuple[bool, str]:
        """Delete a personal statement"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM personal_statements WHERE id = ?', (statement_id,))
                conn.commit()
                return True, "Personal statement deleted successfully!"
        except Exception as e:
            return False, f"Failed to delete personal statement: {str(e)}"

    def reset_user_by_email(self, email: str) -> bool:
        """Delete a user and all their data by email (admin use only)"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
                row = cursor.fetchone()
                if not row:
                    return False
                user_id = row[0]
                # Delete child profiles
                cursor.execute("DELETE FROM child_profiles WHERE user_id = ?", (user_id,))
                # Delete applications
                cursor.execute("DELETE FROM applications WHERE user_id = ?", (user_id,))
                # Delete application tracker
                cursor.execute("DELETE FROM application_tracker WHERE user_id = ?", (user_id,))
                # Delete notifications
                cursor.execute("DELETE FROM notifications WHERE user_id = ?", (user_id,))
                # Delete portfolio items
                cursor.execute("DELETE FROM portfolio_items WHERE user_id = ?", (user_id,))
                # Delete personal statements
                cursor.execute("DELETE FROM personal_statements WHERE user_id = ?", (user_id,))
                # Delete user
                cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error resetting user: {e}")
            return False

    def set_user_password(self, email: str, new_password: str) -> bool:
        """Set a new password for a user by email (admin use only)"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                password_hash = self.hash_password(new_password)
                cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (password_hash, email))
                conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            print(f"Error setting user password: {e}")
            return False

# Global database instance
db = DatabaseManager() 