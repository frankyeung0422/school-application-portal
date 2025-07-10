import streamlit as st
import sqlite3
import hashlib
from typing import Optional, Dict, List, Tuple
from supabase import create_client, Client
import os
from datetime import datetime

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