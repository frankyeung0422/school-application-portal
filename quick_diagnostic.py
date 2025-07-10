"""
Quick Google Drive Diagnostic - Command Line Version
This script runs diagnostics without requiring Streamlit web interface
"""

import os
import json
import sys

def check_packages():
    """Check if required packages are installed"""
    print("🔍 Step 1: Checking Package Dependencies")
    
    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build
        print("✅ Google Drive API packages are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing Google Drive API packages: {e}")
        print("Install with: pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client")
        return False

def check_environment():
    """Check if running on Streamlit Cloud"""
    print("\n🔍 Step 2: Environment Check")
    
    is_streamlit_cloud = os.getenv('STREAMLIT_CLOUD', False)
    if is_streamlit_cloud:
        print("✅ Running on Streamlit Cloud")
    else:
        print("⚠️ Not running on Streamlit Cloud - Google Drive is only needed for cloud deployment")
    
    return is_streamlit_cloud

def check_secrets_file():
    """Check if .streamlit/secrets.toml exists locally"""
    print("\n🔍 Step 3: Local Secrets File Check")
    
    secrets_path = ".streamlit/secrets.toml"
    if os.path.exists(secrets_path):
        print(f"✅ Local secrets file found: {secrets_path}")
        return True
    else:
        print(f"❌ Local secrets file not found: {secrets_path}")
        print("Note: This is normal for local development. Secrets are only needed on Streamlit Cloud.")
        return False

def check_google_drive_credentials():
    """Check if Google Drive credentials are properly formatted"""
    print("\n🔍 Step 4: Google Drive Credentials Check")
    
    # Try to import streamlit and check secrets
    try:
        import streamlit as st
        
        # Check if we can access secrets (this will only work in Streamlit environment)
        if hasattr(st, 'secrets') and 'GOOGLE_DRIVE' in st.secrets:
            print("✅ Google Drive secrets found in Streamlit")
            
            secrets = st.secrets['GOOGLE_DRIVE']
            print(f"Available keys: {list(secrets.keys())}")
            
            # Check required keys
            required_keys = ['CREDENTIALS', 'FOLDER_ID']
            for key in required_keys:
                if key in secrets:
                    print(f"✅ {key} found")
                else:
                    print(f"❌ {key} missing")
                    return False
            
            # Test credentials format
            try:
                credentials_data = secrets['CREDENTIALS']
                if isinstance(credentials_data, str):
                    credentials_dict = json.loads(credentials_data)
                else:
                    credentials_dict = credentials_data
                
                # Check required fields
                required_fields = [
                    'type', 'project_id', 'private_key_id', 'private_key',
                    'client_email', 'client_id', 'auth_uri', 'token_uri',
                    'auth_provider_x509_cert_url', 'client_x509_cert_url'
                ]
                
                missing_fields = []
                for field in required_fields:
                    if field not in credentials_dict:
                        missing_fields.append(field)
                
                if missing_fields:
                    print(f"❌ Missing credential fields: {missing_fields}")
                    return False
                
                print("✅ Credentials format is valid")
                print(f"Service account: {credentials_dict.get('client_email', 'Unknown')}")
                return True
                
            except json.JSONDecodeError as e:
                print(f"❌ Invalid JSON in credentials: {e}")
                return False
            except Exception as e:
                print(f"❌ Error validating credentials: {e}")
                return False
                
        else:
            print("❌ Google Drive secrets not found in Streamlit")
            print("This is expected if running locally without Streamlit Cloud")
            return False
            
    except ImportError:
        print("⚠️ Streamlit not available - cannot check secrets")
        return False
    except Exception as e:
        print(f"❌ Error checking secrets: {e}")
        return False

def test_google_drive_connection():
    """Test actual Google Drive API connection"""
    print("\n🔍 Step 5: Google Drive API Connection Test")
    
    try:
        import streamlit as st
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build
        
        if 'GOOGLE_DRIVE' not in st.secrets:
            print("❌ No Google Drive secrets available for testing")
            return False
        
        # Get credentials
        credentials_data = st.secrets['GOOGLE_DRIVE']['CREDENTIALS']
        if isinstance(credentials_data, str):
            credentials_dict = json.loads(credentials_data)
        else:
            credentials_dict = credentials_data
        
        # Create credentials object
        credentials = Credentials.from_service_account_info(credentials_dict)
        print("✅ Credentials object created successfully")
        
        # Build the Drive service
        drive_service = build('drive', 'v3', credentials=credentials)
        print("✅ Google Drive service built successfully")
        
        # Test API call
        about = drive_service.about().get(fields="user").execute()
        user_email = about.get('user', {}).get('emailAddress', 'Unknown')
        print(f"✅ Google Drive API connection successful")
        print(f"Connected as: {user_email}")
        
        # Test folder access
        folder_id = st.secrets['GOOGLE_DRIVE']['FOLDER_ID']
        folder = drive_service.files().get(fileId=folder_id, fields="name,permissions").execute()
        print(f"✅ Folder access successful: {folder.get('name', 'Unknown')}")
        
        # Check permissions
        permissions = folder.get('permissions', [])
        service_account_email = credentials_dict.get('client_email')
        
        has_permission = False
        for permission in permissions:
            if permission.get('emailAddress') == service_account_email:
                role = permission.get('role', '')
                print(f"✅ Service account has {role} permission")
                has_permission = True
                break
        
        if not has_permission:
            print("⚠️ Service account may not have proper folder permissions")
            print(f"Service account email: {service_account_email}")
        
        return True
        
    except Exception as e:
        print(f"❌ Google Drive API connection failed: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

def main():
    """Run all diagnostic checks"""
    print("🔍 Google Drive Connection Diagnostic")
    print("=" * 50)
    
    # Run all checks
    checks = [
        ("Package Dependencies", check_packages),
        ("Environment", check_environment),
        ("Local Secrets File", check_secrets_file),
        ("Google Drive Credentials", check_google_drive_credentials),
        ("Google Drive API Connection", test_google_drive_connection)
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ Error in {name}: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 DIAGNOSTIC SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} checks passed")
    
    if passed == total:
        print("🎉 All checks passed! Google Drive should work correctly.")
    else:
        print("⚠️ Some checks failed. See issues above for details.")
        
        # Provide specific recommendations
        print("\n📋 RECOMMENDATIONS:")
        
        if not any(name == "Package Dependencies" and result for name, result in results):
            print("- Install required packages: pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client")
        
        if not any(name == "Google Drive Credentials" and result for name, result in results):
            print("- Set up Google Drive credentials in Streamlit Cloud secrets")
            print("- Follow the setup guide in GOOGLE_DRIVE_SETUP.md")
        
        if not any(name == "Google Drive API Connection" and result for name, result in results):
            print("- Check Google Cloud Console: Enable Google Drive API")
            print("- Verify service account permissions")
            print("- Check folder sharing settings")

if __name__ == "__main__":
    main() 