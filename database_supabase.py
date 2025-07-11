import streamlit as st
import sqlite3
import hashlib
from typing import Optional, Dict, List, Tuple
from supabase import create_client, Client
import os
from datetime import datetime
import json

class SupabaseDatabaseManager:
    def __init__(self):
        """Initialize Supabase database connection"""
        self.supabase: Optional[Client] = None
        self._init_supabase()
    
    def _init_supabase(self):
        """Initialize Supabase client"""
        try:
            # Get Supabase credentials from Streamlit secrets
            if 'SUPABASE' in st.secrets:
                supabase_url = st.secrets['SUPABASE']['URL']
                supabase_key = st.secrets['SUPABASE']['ANON_KEY']
                
                self.supabase = create_client(supabase_url, supabase_key)
                print("✅ Supabase connection established")
                
                # Initialize tables if they don't exist
                self._create_tables()
                
            else:
                st.error("❌ Supabase credentials not found in Streamlit secrets")
                st.info("Please add your Supabase URL and anon key to Streamlit secrets")
                
        except Exception as e:
            st.error(f"❌ Failed to initialize Supabase: {str(e)}")
    
    def _create_tables(self):
        """Create tables in Supabase if they don't exist"""
        try:
            # Note: In Supabase, tables are typically created via SQL migrations
            # For now, we'll assume the tables exist and handle errors gracefully
            print("📋 Tables will be created via Supabase SQL editor")
            pass
            
        except Exception as e:
            st.error(f"Error creating tables: {str(e)}")
    
    def create_user(self, username: str, email: str, password_hash: str, full_name: str = None, phone: str = None) -> bool:
        """Create a new user"""
        try:
            if not self.supabase:
                return False
            
            data = {
                'username': username,
                'email': email,
                'password_hash': password_hash,
                'full_name': full_name,
                'phone': phone,
                'created_at': datetime.now().isoformat()
            }
            
            result = self.supabase.table('users').insert(data).execute()
            return len(result.data) > 0
            
        except Exception as e:
            st.error(f"Error creating user: {str(e)}")
            return False
    
    def verify_user(self, email: str, password_hash: str) -> Optional[Dict]:
        """Verify user login"""
        try:
            if not self.supabase:
                return None
            
            result = self.supabase.table('users').select(
                'id, username, email, full_name, phone'
            ).eq('email', email).eq('password_hash', password_hash).execute()
            
            if result.data:
                user = result.data[0]
                return {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'full_name': user['full_name'],
                    'phone': user['phone']
                }
            return None
            
        except Exception as e:
            st.error(f"Error verifying user: {str(e)}")
            return None
    
    def update_user_profile(self, user_id: int, full_name: str = None, phone: str = None) -> bool:
        """Update user profile"""
        try:
            if not self.supabase:
                return False
            
            updates = {}
            if full_name is not None:
                updates['full_name'] = full_name
            if phone is not None:
                updates['phone'] = phone
            
            if updates:
                result = self.supabase.table('users').update(updates).eq('id', user_id).execute()
                return len(result.data) > 0
            return False
            
        except Exception as e:
            st.error(f"Error updating profile: {str(e)}")
            return False
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email"""
        try:
            if not self.supabase:
                return None
            
            result = self.supabase.table('users').select('*').eq('email', email).execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            st.error(f"Error getting user: {str(e)}")
            return None
    
    def get_all_users(self) -> List[Dict]:
        """Get all users"""
        try:
            if not self.supabase:
                return []
            
            result = self.supabase.table('users').select('*').execute()
            return result.data
            
        except Exception as e:
            st.error(f"Error getting users: {str(e)}")
            return []
    
    # Child profile methods
    def create_child_profile(self, user_id: int, child_name: str, date_of_birth: str = None,
                           gender: str = None, nationality: str = None, address: str = None,
                           parent_name: str = None, parent_phone: str = None, parent_email: str = None) -> int:
        """Create a new child profile"""
        try:
            if not self.supabase:
                return None
            
            data = {
                'user_id': user_id,
                'child_name': child_name,
                'date_of_birth': date_of_birth,
                'gender': gender,
                'nationality': nationality,
                'address': address,
                'parent_name': parent_name,
                'parent_phone': parent_phone,
                'parent_email': parent_email,
                'created_at': datetime.now().isoformat()
            }
            
            result = self.supabase.table('child_profiles').insert(data).execute()
            if result.data:
                return result.data[0]['id']
            return None
            
        except Exception as e:
            st.error(f"Error creating child profile: {str(e)}")
            return None
    
    def get_child_profiles(self, user_id: int) -> List[Dict]:
        """Get all child profiles for a user"""
        try:
            if not self.supabase:
                return []
            
            result = self.supabase.table('child_profiles').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
            return result.data
            
        except Exception as e:
            st.error(f"Error getting child profiles: {str(e)}")
            return []
    
    def update_child_profile(self, child_id: int, child_name: str, date_of_birth: str, gender: str) -> tuple:
        """Update a child profile by id"""
        try:
            if not self.supabase:
                return False, "Database not initialized"
            data = {
                'child_name': child_name,
                'date_of_birth': date_of_birth,
                'gender': gender
            }
            result = self.supabase.table('child_profiles').update(data).eq('id', child_id).execute()
            if result.data:
                return True, "Child profile updated successfully."
            return False, "Failed to update child profile."
        except Exception as e:
            return False, f"Error updating child profile: {str(e)}"

    def delete_child_profile(self, child_id: int) -> tuple:
        """Delete a child profile by id"""
        try:
            if not self.supabase:
                return False, "Database not initialized"
            result = self.supabase.table('child_profiles').delete().eq('id', child_id).execute()
            if result.data:
                return True, "Child profile deleted successfully."
            return False, "Failed to delete child profile."
        except Exception as e:
            return False, f"Error deleting child profile: {str(e)}"
    
    # Application methods
    def create_application(self, user_id: int, child_id: int, school_name: str, school_type: str,
                          application_date: str, notes: str = None) -> int:
        """Create a new application"""
        try:
            if not self.supabase:
                return None
            
            data = {
                'user_id': user_id,
                'child_id': child_id,
                'school_name': school_name,
                'school_type': school_type,
                'application_date': application_date,
                'notes': notes,
                'created_at': datetime.now().isoformat()
            }
            
            result = self.supabase.table('applications').insert(data).execute()
            if result.data:
                return result.data[0]['id']
            return None
            
        except Exception as e:
            st.error(f"Error creating application: {str(e)}")
            return None
    
    def get_applications(self, user_id: int) -> List[Dict]:
        """Get all applications for a user"""
        try:
            if not self.supabase:
                return []
            
            result = self.supabase.table('applications').select('*, child_profiles(child_name)').eq('user_id', user_id).order('created_at', desc=True).execute()
            return result.data
            
        except Exception as e:
            st.error(f"Error getting applications: {str(e)}")
            return []
    
    # Portfolio methods
    def create_portfolio_item(self, user_id: int, child_id: int, title: str, description: str = None,
                            category: str = None, attachment_path: str = None, item_date: str = None, notes: str = None) -> int:
        """Create a new portfolio item"""
        try:
            if not self.supabase:
                return None
            
            # Validate and format the date
            if item_date:
                # Ensure item_date is a valid date string in YYYY-MM-DD format
                if not isinstance(item_date, str) or len(item_date) != 10 or item_date.count('-') != 2:
                    st.error(f"Invalid date format: {item_date}. Expected YYYY-MM-DD format.")
                    return None
            
            data = {
                'user_id': user_id,
                'child_id': child_id,
                'title': title,
                'description': description,
                'category': category,
                'attachment_path': attachment_path,
                'item_date': item_date,
                'notes': notes,
                'created_at': datetime.now().isoformat()
            }
            
            result = self.supabase.table('portfolio_items').insert(data).execute()
            if result.data:
                return result.data[0]['id']
            return None
            
        except Exception as e:
            st.error(f"Error creating portfolio item: {str(e)}")
            return None
    
    def get_portfolio_items(self, user_id: int, child_id: int = None) -> List[Dict]:
        """Get all portfolio items for a user"""
        try:
            if not self.supabase:
                return []
            
            query = self.supabase.table('portfolio_items').select('*').eq('user_id', user_id)
            if child_id:
                query = query.eq('child_id', child_id)
            
            result = query.order('created_at', desc=True).execute()
            return result.data
            
        except Exception as e:
            st.error(f"Error getting portfolio items: {str(e)}")
            return []
    
    # Personal statements methods
    def create_personal_statement(self, user_id: int, child_id: int, title: str, content: str, 
                                 target_school: str = None, version: str = "1.0", notes: str = None) -> int:
        """Create a new personal statement"""
        try:
            if not self.supabase:
                return None
            
            data = {
                'user_id': user_id,
                'child_id': child_id,
                'title': title,
                'content': content,
                'target_school': target_school,
                'version': version,
                'notes': notes,
                'created_at': datetime.now().isoformat()
            }
            
            result = self.supabase.table('personal_statements').insert(data).execute()
            if result.data:
                return result.data[0]['id']
            return None
            
        except Exception as e:
            st.error(f"Error creating personal statement: {str(e)}")
            return None
    
    def get_personal_statements(self, user_id: int, child_id: int = None) -> List[Dict]:
        """Get all personal statements for a user"""
        try:
            if not self.supabase:
                return []
            
            query = self.supabase.table('personal_statements').select('*').eq('user_id', user_id)
            if child_id:
                query = query.eq('child_id', child_id)
            
            result = query.order('created_at', desc=True).execute()
            return result.data
            
        except Exception as e:
            st.error(f"Error getting personal statements: {str(e)}")
            return []
    
    # Notification methods
    def create_notification(self, user_id: int, title: str, message: str) -> int:
        """Create a new notification"""
        try:
            if not self.supabase:
                return None
            
            data = {
                'user_id': user_id,
                'title': title,
                'message': message,
                'is_read': False,
                'created_at': datetime.now().isoformat()
            }
            
            result = self.supabase.table('notifications').insert(data).execute()
            if result.data:
                return result.data[0]['id']
            return None
            
        except Exception as e:
            st.error(f"Error creating notification: {str(e)}")
            return None
    
    def get_notifications(self, user_id: int, unread_only: bool = False) -> List[Dict]:
        """Get all notifications for a user"""
        try:
            if not self.supabase:
                return []
            
            query = self.supabase.table('notifications').select('*').eq('user_id', user_id)
            if unread_only:
                query = query.eq('is_read', False)
            
            result = query.order('created_at', desc=True).execute()
            return result.data
            
        except Exception as e:
            st.error(f"Error getting notifications: {str(e)}")
            return []
    
    def mark_notification_read(self, notification_id: int) -> bool:
        """Mark a notification as read"""
        try:
            if not self.supabase:
                return False
            
            result = self.supabase.table('notifications').update({'is_read': True}).eq('id', notification_id).execute()
            return len(result.data) > 0
            
        except Exception as e:
            st.error(f"Error marking notification read: {str(e)}")
            return False
    
    def mark_all_notifications_read(self, user_id: int) -> bool:
        """Mark all notifications as read for a user"""
        try:
            if not self.supabase:
                return False
            
            result = self.supabase.table('notifications').update({'is_read': True}).eq('user_id', user_id).execute()
            return len(result.data) > 0
            
        except Exception as e:
            st.error(f"Error marking notifications read: {str(e)}")
            return False
    
    # High-level methods for backward compatibility
    def register_user(self, name: str, email: str, phone: str, password: str) -> Tuple[bool, str]:
        """Register a new user"""
        try:
            if not self.supabase:
                return False, "Database not initialized"
            
            # Check if user already exists
            existing_user = self.get_user_by_email(email)
            if existing_user:
                return False, "User with this email already exists"
            
            # Hash password
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            # Create user
            success = self.create_user(name, email, password_hash, name, phone)
            
            if success:
                return True, "User registered successfully"
            else:
                return False, "Failed to create user"
                
        except Exception as e:
            return False, f"Registration error: {str(e)}"
    
    def login_user(self, email: str, password: str) -> Tuple[bool, str, Dict]:
        """Login user"""
        try:
            if not self.supabase:
                return False, "Database not initialized", {}
            
            # Hash password
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            # Verify user
            user = self.verify_user(email, password_hash)
            
            if user:
                return True, "Login successful", user
            else:
                return False, "Invalid email or password", {}
                
        except Exception as e:
            return False, f"Login error: {str(e)}", {}
    
    def add_child_profile(self, user_id: int, child_name: str, date_of_birth: str, gender: str) -> Tuple[bool, str]:
        """Add a child profile"""
        try:
            if not self.supabase:
                return False, "Database not initialized"
            
            profile_id = self.create_child_profile(user_id, child_name, date_of_birth, gender)
            if profile_id:
                return True, f"Child profile created with ID: {profile_id}"
            else:
                return False, "Failed to create child profile"
        except Exception as e:
            return False, f"Error creating child profile: {str(e)}"
    
    def add_portfolio_item(self, user_id: int, child_id: int, title: str, description: str, 
                          category: str, item_date: str, attachment_path: str = None, notes: str = None) -> Tuple[bool, str]:
        """Add a portfolio item"""
        try:
            if not self.supabase:
                return False, "Database not initialized"
            
            item_id = self.create_portfolio_item(user_id, child_id, title, description, category, attachment_path, item_date, notes)
            if item_id:
                return True, f"Portfolio item created with ID: {item_id}"
            else:
                return False, "Failed to create portfolio item"
        except Exception as e:
            return False, f"Error creating portfolio item: {str(e)}"
    
    def add_personal_statement(self, user_id: int, child_id: int, title: str, content: str,
                              target_school: str = None, version: str = "1.0", notes: str = None) -> Tuple[bool, str]:
        """Add a personal statement"""
        try:
            if not self.supabase:
                return False, "Database not initialized"
            
            statement_id = self.create_personal_statement(user_id, child_id, title, content, target_school, version, notes)
            if statement_id:
                return True, f"Personal statement created with ID: {statement_id}"
            else:
                return False, "Failed to create personal statement"
        except Exception as e:
            return False, f"Error creating personal statement: {str(e)}"
    
    def add_notification(self, user_id: int, title: str, message: str, priority: str = 'medium') -> Tuple[bool, str]:
        """Add a notification"""
        try:
            if not self.supabase:
                return False, "Database not initialized"
            
            notification_id = self.create_notification(user_id, title, message)
            if notification_id:
                return True, f"Notification created with ID: {notification_id}"
            else:
                return False, "Failed to create notification"
        except Exception as e:
            return False, f"Error creating notification: {str(e)}"
    
    def submit_application(self, user_id: int, child_id: int, school_no: str, school_name: str,
                          parent_name: str, parent_email: str, parent_phone: str,
                          preferred_start_date: str, notes: str = None) -> Tuple[bool, str]:
        """Submit an application"""
        try:
            if not self.supabase:
                return False, "Database not initialized"
            
            application_id = self.create_application(user_id, child_id, school_name, "kindergarten", preferred_start_date, notes)
            if application_id:
                return True, f"Application submitted with ID: {application_id}"
            else:
                return False, "Failed to submit application"
        except Exception as e:
            return False, f"Error submitting application: {str(e)}"
    
    def add_to_tracker(self, user_id: int, school_no: str, school_name: str) -> Tuple[bool, str]:
        """Add school to application tracker"""
        try:
            if not self.supabase:
                return False, "Database not initialized"
            
            data = {
                'user_id': user_id,
                'school_no': school_no,
                'school_name': school_name,
                'status': 'tracking',
                'date_updated': datetime.now().isoformat()
            }
            
            result = self.supabase.table('application_tracking').upsert(data).execute()
            if result.data:
                return True, "School added to tracker"
            else:
                return False, "Failed to add school to tracker"
        except Exception as e:
            return False, f"Error adding to tracker: {str(e)}"
    
    def remove_from_tracker(self, user_id: int, school_no: str) -> Tuple[bool, str]:
        """Remove school from application tracker"""
        try:
            if not self.supabase:
                return False, "Database not initialized"
            
            result = self.supabase.table('application_tracking').delete().eq('user_id', user_id).eq('school_no', school_no).execute()
            return True, "School removed from tracker"
        except Exception as e:
            return False, f"Error removing from tracker: {str(e)}"
    
    def get_tracked_schools(self, user_id: int) -> List[Dict]:
        """Get tracked schools for a user"""
        try:
            if not self.supabase:
                return []
            
            result = self.supabase.table('application_tracking').select('*').eq('user_id', user_id).order('date_updated', desc=True).execute()
            return result.data
        except Exception as e:
            st.error(f"Error getting tracked schools: {str(e)}")
            return []
    
    def update_tracker_status(self, user_id: int, school_no: str, status: str, last_checked: str = None, application_info: dict = None) -> Tuple[bool, str]:
        """Update application tracker status"""
        try:
            if not self.supabase:
                return False, "Database not initialized"
            
            data = {
                'status': status,
                'date_updated': last_checked or datetime.now().isoformat()
            }
            
            # Add application info if provided and column exists
            if application_info:
                try:
                    data['application_info'] = json.dumps(application_info)
                except Exception:
                    # If application_info column doesn't exist, skip it
                    pass
            
            result = self.supabase.table('application_tracking').update(data).eq('user_id', user_id).eq('school_no', school_no).execute()
            if result.data:
                return True, "Tracker status updated successfully"
            return False, "Failed to update tracker status"
        except Exception as e:
            return False, f"Error updating tracker status: {str(e)}"
    
    def delete_portfolio_item(self, item_id: int) -> Tuple[bool, str]:
        """Delete a portfolio item"""
        try:
            if not self.supabase:
                return False, "Database not initialized"
            
            result = self.supabase.table('portfolio_items').delete().eq('id', item_id).execute()
            return True, "Portfolio item deleted"
        except Exception as e:
            return False, f"Error deleting portfolio item: {str(e)}"
    
    def delete_personal_statement(self, statement_id: int) -> Tuple[bool, str]:
        """Delete a personal statement"""
        try:
            if not self.supabase:
                return False, "Database not initialized"
            
            result = self.supabase.table('personal_statements').delete().eq('id', statement_id).execute()
            return True, "Personal statement deleted"
        except Exception as e:
            return False, f"Error deleting personal statement: {str(e)}"
    
    def reset_user_by_email(self, email: str) -> bool:
        """Reset user data by email (for testing)"""
        try:
            if not self.supabase:
                return False
            
            # Get user ID first
            user = self.get_user_by_email(email)
            if user:
                user_id = user['id']
                # Delete related data
                self.supabase.table('notifications').delete().eq('user_id', user_id).execute()
                self.supabase.table('portfolio_items').delete().eq('user_id', user_id).execute()
                self.supabase.table('personal_statements').delete().eq('user_id', user_id).execute()
                self.supabase.table('applications').delete().eq('user_id', user_id).execute()
                self.supabase.table('child_profiles').delete().eq('user_id', user_id).execute()
                self.supabase.table('application_tracking').delete().eq('user_id', user_id).execute()
                self.supabase.table('users').delete().eq('id', user_id).execute()
                return True
            return False
        except Exception as e:
            st.error(f"Error resetting user: {str(e)}")
            return False
    
    def set_user_password(self, email: str, new_password: str) -> bool:
        """Set user password"""
        try:
            if not self.supabase:
                return False
            
            password_hash = hashlib.sha256(new_password.encode()).hexdigest()
            result = self.supabase.table('users').update({'password_hash': password_hash}).eq('email', email).execute()
            return len(result.data) > 0
        except Exception as e:
            st.error(f"Error setting password: {str(e)}")
            return False
    
    def migrate_from_sqlite(self, sqlite_db_path: str) -> bool:
        """Migrate users from SQLite database"""
        try:
            if not self.supabase:
                return False
            
            # Connect to SQLite database
            sqlite_conn = sqlite3.connect(sqlite_db_path)
            sqlite_cursor = sqlite_conn.cursor()
            
            # Get users from SQLite
            sqlite_cursor.execute("SELECT name, email, password_hash, created_at FROM users")
            users = sqlite_cursor.fetchall()
            
            migrated_count = 0
            for user in users:
                name = user[0]
                email = user[1]
                password_hash = user[2]
                created_at = user[3]
                
                # Fallback: if name is empty/null, use email prefix
                if not name or name.strip() == "":
                    username = email.split('@')[0]
                    full_name = username
                else:
                    username = name
                    full_name = name
                
                # Check if user already exists
                existing_user = self.get_user_by_email(email)
                if not existing_user:
                    # Create user in Supabase
                    data = {
                        'username': username,
                        'email': email,
                        'password_hash': password_hash,
                        'full_name': full_name,
                        'created_at': created_at or datetime.now().isoformat()
                    }
                    
                    result = self.supabase.table('users').insert(data).execute()
                    if result.data:
                        migrated_count += 1
                        print(f"✅ Migrated user: {email}")
            
            sqlite_conn.close()
            print(f"✅ Migration complete. {migrated_count} users migrated.")
            return True
            
        except Exception as e:
            st.error(f"Migration error: {str(e)}")
            return False
    
    @property
    def db_path(self) -> str:
        """Return database path for compatibility"""
        return "supabase_cloud"
    
    @property
    def is_streamlit_cloud(self) -> bool:
        """Check if running on Streamlit Cloud"""
        return os.environ.get('STREAMLIT_SERVER_RUN_ON_IP') is not None
    
    def get_all_kindergartens(self) -> List[Dict]:
        """Get all kindergarten data from database"""
        try:
            if not self.supabase:
                return []
            
            result = self.supabase.table('kindergartens').select('*').order('name_en').execute()
            return result.data
            
        except Exception as e:
            print(f"Error getting kindergartens: {e}")
            return []
    
    def get_all_primary_schools(self) -> List[Dict]:
        """Get all primary school data from database"""
        try:
            if not self.supabase:
                return []
            
            result = self.supabase.table('primary_schools').select('*').order('name_en').execute()
            return result.data
            
        except Exception as e:
            print(f"Error getting primary schools: {e}")
            return [] 