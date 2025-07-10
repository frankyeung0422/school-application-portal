"""
Cloud Storage SQLite Implementation
Uses Google Drive API to store SQLite database files
"""

import sqlite3
import os
import tempfile
import shutil
from datetime import datetime
from typing import Optional, Dict, Any
import streamlit as st
import json

try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload
    import io
    GOOGLE_DRIVE_AVAILABLE = True
except ImportError:
    GOOGLE_DRIVE_AVAILABLE = False
    print("Google Drive API not available. Install with: pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client")

class CloudSQLiteManager:
    def __init__(self, db_name: str = "school_portal.db"):
        self.db_name = db_name
        self.temp_db_path = None
        self.drive_service = None
        self.file_id = None
        self.folder_id = None
        
        # Initialize Google Drive connection
        self._init_google_drive()
    
    def _init_google_drive(self):
        """Initialize Google Drive API connection using Streamlit secrets"""
        if not GOOGLE_DRIVE_AVAILABLE:
            st.error("Google Drive API not available. Please install required packages.")
            return
        
        try:
            # Get credentials from Streamlit secrets
            if 'GOOGLE_DRIVE' in st.secrets:
                credentials_data = st.secrets['GOOGLE_DRIVE']['CREDENTIALS']
                self.folder_id = st.secrets['GOOGLE_DRIVE'].get('FOLDER_ID')
                
                # Parse credentials
                if isinstance(credentials_data, str):
                    credentials_dict = json.loads(credentials_data)
                else:
                    credentials_dict = credentials_data
                
                # Create credentials object
                credentials = Credentials.from_service_account_info(credentials_dict)
                
                # Build the Drive service
                self.drive_service = build('drive', 'v3', credentials=credentials)
                
                # Find or create the database file
                self._find_or_create_db_file()
                
                st.success("✅ Google Drive connected successfully!")
                
            else:
                st.error("Google Drive credentials not found in Streamlit secrets.")
                st.info("Please add your Google Drive credentials to Streamlit secrets.")
                
        except Exception as e:
            st.error(f"Failed to initialize Google Drive: {str(e)}")
            st.info("Check your credentials and folder ID in Streamlit secrets.")
    
    def _find_or_create_db_file(self):
        """Find existing database file or create new one"""
        try:
            if not self.drive_service:
                return
            
            # Search for existing file in the specified folder
            query = f"name='{self.db_name}' and trashed=false"
            if self.folder_id:
                query += f" and '{self.folder_id}' in parents"
            
            results = self.drive_service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name, modifiedTime)'
            ).execute()
            
            files = results.get('files', [])
            
            if files:
                # Use existing file
                self.file_id = files[0]['id']
                st.info(f"Found existing database: {files[0]['name']}")
            else:
                # Create new file
                self._create_new_db_file()
                
        except Exception as e:
            st.error(f"Error finding database file: {str(e)}")
    
    def _create_new_db_file(self):
        """Create a new database file in Google Drive"""
        try:
            # Create empty database in memory first
            conn = sqlite3.connect(':memory:')
            conn.close()
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
                self.temp_db_path = tmp_file.name
            
            # Upload to Google Drive
            file_metadata = {
                'name': self.db_name,
                'parents': [self.folder_id] if self.folder_id else []
            }
            
            # Create empty file content
            media = MediaIoBaseUpload(
                io.BytesIO(b''),  # Empty file for now
                mimetype='application/x-sqlite3',
                resumable=True
            )
            
            file = self.drive_service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            
            self.file_id = file.get('id')
            st.success(f"Created new database file: {self.db_name}")
            
        except Exception as e:
            st.error(f"Error creating database file: {str(e)}")
    
    def download_database(self) -> str:
        """Download database from Google Drive to temporary file"""
        if not self.file_id:
            st.error("No database file ID available")
            return None
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
                self.temp_db_path = tmp_file.name
            
            # Download from Google Drive
            request = self.drive_service.files().get_media(fileId=self.file_id)
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            
            done = False
            while done is False:
                status, done = downloader.next_chunk()
                if status:
                    st.write(f"Download {int(status.progress() * 100)}%")
            
            # Write to temporary file
            with open(self.temp_db_path, 'wb') as f:
                f.write(fh.getvalue())
            
            return self.temp_db_path
            
        except Exception as e:
            st.error(f"Error downloading database: {str(e)}")
            return None
    
    def upload_database(self):
        """Upload database from temporary file to Google Drive"""
        if not self.file_id or not self.temp_db_path:
            st.error("No database file to upload")
            return False
        
        try:
            # Read temporary file
            with open(self.temp_db_path, 'rb') as f:
                file_data = f.read()
            
            # Upload to Google Drive
            media = MediaIoBaseUpload(
                io.BytesIO(file_data),
                mimetype='application/x-sqlite3',
                resumable=True
            )
            
            self.drive_service.files().update(
                fileId=self.file_id,
                media_body=media
            ).execute()
            
            st.success("Database uploaded successfully!")
            return True
            
        except Exception as e:
            st.error(f"Error uploading database: {str(e)}")
            return False
    
    def get_database_connection(self) -> Optional[sqlite3.Connection]:
        """Get SQLite database connection with cloud sync"""
        if not self.drive_service:
            st.error("Google Drive not initialized")
            return None
        
        try:
            # Download database
            db_path = self.download_database()
            if not db_path:
                return None
            
            # Create connection
            conn = sqlite3.connect(db_path)
            
            # Store connection info for later upload
            conn.cloud_manager = self
            conn.temp_path = db_path
            
            return conn
            
        except Exception as e:
            st.error(f"Error getting database connection: {str(e)}")
            return None
    
    def close_connection(self, conn: sqlite3.Connection):
        """Close connection and upload changes"""
        if hasattr(conn, 'cloud_manager'):
            # Upload changes
            conn.cloud_manager.upload_database()
            
            # Clean up temporary file
            if hasattr(conn, 'temp_path') and os.path.exists(conn.temp_path):
                os.unlink(conn.temp_path)
        
        conn.close()

# Alternative: Simple file-based approach for development
class SimpleCloudSQLite:
    """Simple cloud storage using file upload/download"""
    
    def __init__(self, db_name: str = "school_portal.db"):
        self.db_name = db_name
        self.temp_db_path = None
    
    def handle_file_upload(self):
        """Handle file upload UI - call this before get_database_connection"""
        if 'database_file' not in st.session_state:
            st.markdown("""
            ## 📁 Database Setup
            
            To use persistent storage, upload your database file:
            """)
            
            uploaded_file = st.file_uploader(
                f"Upload {self.db_name} (optional)", 
                type=['db', 'sqlite', 'sqlite3']
            )
            
            if uploaded_file:
                # Save uploaded file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
                    tmp_file.write(uploaded_file.getvalue())
                    st.session_state.database_file = tmp_file.name
                    st.success("Database file uploaded successfully!")
            
            # If no file uploaded, create new database
            if 'database_file' not in st.session_state:
                with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
                    st.session_state.database_file = tmp_file.name
    
    def get_database_connection(self) -> Optional[sqlite3.Connection]:
        """Get database connection - assumes handle_file_upload was called first"""
        
        # Check if database file is available
        if 'database_file' not in st.session_state:
            st.error("Database file not initialized. Call handle_file_upload() first.")
            return None
        
        # Create connection
        try:
            conn = sqlite3.connect(st.session_state.database_file)
            return conn
        except Exception as e:
            st.error(f"Error connecting to database: {str(e)}")
            return None
    
    def download_database(self):
        """Provide database file for download"""
        if 'database_file' in st.session_state and os.path.exists(st.session_state.database_file):
            with open(st.session_state.database_file, 'rb') as f:
                st.download_button(
                    label="📥 Download Database",
                    data=f.read(),
                    file_name=self.db_name,
                    mime="application/x-sqlite3"
                ) 