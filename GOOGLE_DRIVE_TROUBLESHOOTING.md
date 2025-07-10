# Google Drive Connection Troubleshooting Guide

## 🚨 Quick Diagnosis

If you see "Database initialized successfully! (Storage: simple_cloud)" instead of Google Drive, it means the Google Drive connection failed and the system fell back to simple cloud storage.

## 🔍 Step-by-Step Diagnosis

### 1. Run the Diagnostic Tool

First, run the diagnostic tool to identify the specific issue:

```bash
streamlit run google_drive_diagnostic.py
```

This will check:
- ✅ Package dependencies
- ✅ Streamlit secrets configuration
- ✅ Credentials validation
- ✅ Google Drive API connection
- ✅ Folder access permissions
- ✅ File operations

### 2. Common Issues and Solutions

#### Issue 1: "Google Drive API not available"
**Symptoms:** Error about missing packages
**Solution:**
```bash
pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

#### Issue 2: "Google Drive credentials not found in Streamlit secrets"
**Symptoms:** No secrets configured
**Solution:**
1. Go to your Streamlit Cloud app
2. Settings → Secrets
3. Add the Google Drive configuration (see setup guide)

#### Issue 3: "Invalid JSON in credentials"
**Symptoms:** JSON parsing error
**Solution:**
1. Check that your JSON credentials are properly formatted
2. Make sure all quotes are escaped correctly
3. Copy the entire JSON content from your service account key file

#### Issue 4: "Service account not found"
**Symptoms:** Authentication error
**Solution:**
1. Verify the service account email in your JSON file
2. Make sure the service account exists in your Google Cloud project
3. Check that the service account has the correct permissions

#### Issue 5: "Permission denied"
**Symptoms:** Folder access error
**Solution:**
1. Share the Google Drive folder with your service account email
2. Set permission to "Editor"
3. Make sure the folder ID is correct

#### Issue 6: "API not enabled"
**Symptoms:** API disabled error
**Solution:**
1. Go to Google Cloud Console
2. APIs & Services → Library
3. Search for "Google Drive API"
4. Click "Enable"

## 🛠️ Manual Setup Verification

### Step 1: Check Google Cloud Console

1. **Verify Project Setup:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project
   - Check that Google Drive API is enabled

2. **Verify Service Account:**
   - Go to APIs & Services → Credentials
   - Find your service account
   - Download a new JSON key if needed

3. **Check API Quotas:**
   - Go to APIs & Services → Quotas
   - Make sure you haven't exceeded limits

### Step 2: Check Google Drive

1. **Verify Folder:**
   - Go to [Google Drive](https://drive.google.com)
   - Find your "School Portal Database" folder
   - Copy the folder ID from the URL

2. **Check Permissions:**
   - Right-click the folder → Share
   - Verify your service account email has "Editor" access
   - The email should look like: `your-service@your-project.iam.gserviceaccount.com`

### Step 3: Check Streamlit Secrets

1. **Verify Secrets Format:**
```toml
[GOOGLE_DRIVE]
CREDENTIALS = '''
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"
}
'''

FOLDER_ID = "your-google-drive-folder-id"
```

2. **Common Mistakes:**
   - Missing quotes around the JSON
   - Incorrect escaping of newlines in private_key
   - Wrong folder ID format
   - Extra spaces or characters

## 🔧 Advanced Troubleshooting

### Debug Mode

Add this to your `streamlit_app.py` to enable detailed debugging:

```python
# Add at the top of your app
if st.checkbox("Enable Debug Mode"):
    st.write("Environment:", os.getenv('STREAMLIT_CLOUD', 'Local'))
    st.write("Available secrets:", list(st.secrets.keys()))
    
    if 'GOOGLE_DRIVE' in st.secrets:
        st.write("Google Drive secrets found")
        st.write("Keys:", list(st.secrets['GOOGLE_DRIVE'].keys()))
```

### Test Individual Components

1. **Test Credentials:**
```python
import json
from google.oauth2.service_account import Credentials

creds_data = st.secrets['GOOGLE_DRIVE']['CREDENTIALS']
if isinstance(creds_data, str):
    creds_dict = json.loads(creds_data)
else:
    creds_dict = creds_data

credentials = Credentials.from_service_account_info(creds_dict)
st.success("Credentials valid!")
```

2. **Test Drive Service:**
```python
from googleapiclient.discovery import build

drive_service = build('drive', 'v3', credentials=credentials)
about = drive_service.about().get(fields="user").execute()
st.success(f"Connected as: {about.get('user', {}).get('emailAddress')}")
```

3. **Test Folder Access:**
```python
folder_id = st.secrets['GOOGLE_DRIVE']['FOLDER_ID']
folder = drive_service.files().get(fileId=folder_id, fields="name").execute()
st.success(f"Folder: {folder.get('name')}")
```

## 🚀 Alternative Solutions

### Option 1: Use Simple Cloud Storage (Current Fallback)
- Pros: Easy to set up, no external dependencies
- Cons: Less reliable, requires manual file upload
- Status: ✅ Currently working

### Option 2: Use Local Storage
- Pros: Simple, no setup required
- Cons: Data doesn't persist between deployments
- Implementation: Change `storage_type="local"`

### Option 3: Use Other Cloud Storage
- AWS S3, Azure Blob Storage, etc.
- Requires additional setup but more reliable
- Contact for implementation details

## 📞 Getting Help

If you're still having issues:

1. **Run the diagnostic tool** and share the output
2. **Check the error logs** in Streamlit Cloud
3. **Verify your setup** using the manual verification steps
4. **Try the alternative solutions** if Google Drive continues to fail

## 🔄 Quick Fix Commands

```bash
# Install required packages
pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client

# Run diagnostic
streamlit run google_drive_diagnostic.py

# Run simple test
streamlit run test_google_drive.py

# Run fix guide
streamlit run fix_google_drive_connection.py
```

## 📋 Checklist

- [ ] Google Drive API enabled in Google Cloud Console
- [ ] Service account created with Editor role
- [ ] JSON credentials file downloaded
- [ ] Google Drive folder created and shared with service account
- [ ] Streamlit secrets configured correctly
- [ ] All required packages installed
- [ ] Diagnostic tool passes all tests
- [ ] App deployed to Streamlit Cloud
- [ ] Database connects successfully

## 🎯 Success Indicators

When Google Drive is working correctly, you should see:
- ✅ "Google Drive cloud storage initialized!"
- ✅ "Google Drive connected successfully!"
- ✅ "Database initialized successfully! (Storage: google_drive)"
- ✅ Database file appears in your Google Drive folder
- ✅ Data persists between app restarts 