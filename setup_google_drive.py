"""
Google Drive Setup Script for Streamlit Cloud
This script helps you set up Google Drive API for your school application portal
"""

import streamlit as st
import json
import os

st.set_page_config(
    page_title="Google Drive Setup",
    page_icon="☁️",
    layout="wide"
)

st.title("🔧 Google Drive API Setup for Streamlit Cloud")

st.markdown("""
## 📋 設置步驟

### 步驟 1: 創建 Google Cloud Project

1. 訪問 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新項目或選擇現有項目
3. 記下項目 ID

### 步驟 2: 啟用 Google Drive API

1. 在左側菜單選擇 "APIs & Services" > "Library"
2. 搜尋 "Google Drive API"
3. 點擊 "Google Drive API"
4. 點擊 "Enable"

### 步驟 3: 創建服務帳戶

1. 進入 "APIs & Services" > "Credentials"
2. 點擊 "Create Credentials" > "Service Account"
3. 輸入服務帳戶名稱: `streamlit-cloud-db`
4. 點擊 "Create and Continue"
5. 角色選擇: "Editor"
6. 點擊 "Continue" > "Done"

### 步驟 4: 下載憑證

1. 點擊剛創建的服務帳戶
2. 進入 "Keys" 標籤
3. 點擊 "Add Key" > "Create new key"
4. 選擇 "JSON"
5. 點擊 "Create"
6. **下載 JSON 文件**

### 步驟 5: 設置 Google Drive 文件夾

1. 訪問 [Google Drive](https://drive.google.com)
2. 創建新文件夾: `School Portal Database`
3. 右鍵點擊文件夾 > "Share"
4. 添加服務帳戶郵箱 (在 JSON 文件中找到 `client_email`)
5. 權限設置為 "Editor"
6. 複製文件夾 ID (從 URL 中獲取)

### 步驟 6: 上傳憑證到 Streamlit Cloud

""")

# File uploader for credentials
st.subheader("📁 上傳 Google 憑證")

uploaded_file = st.file_uploader(
    "選擇下載的 JSON 憑證文件",
    type=['json'],
    help="上傳從 Google Cloud Console 下載的服務帳戶 JSON 文件"
)

if uploaded_file:
    try:
        # Read and parse the JSON file
        credentials_data = json.load(uploaded_file)
        
        st.success("✅ 憑證文件解析成功！")
        
        # Display key information
        st.subheader("📋 憑證信息")
        col1, col2 = st.columns(2)
        
        with col1:
            st.write("**項目 ID:**", credentials_data.get('project_id', 'N/A'))
            st.write("**服務帳戶郵箱:**", credentials_data.get('client_email', 'N/A'))
            st.write("**客戶端 ID:**", credentials_data.get('client_id', 'N/A'))
        
        with col2:
            st.write("**憑證類型:**", credentials_data.get('type', 'N/A'))
            st.write("**私鑰 ID:**", credentials_data.get('private_key_id', 'N/A')[:20] + "...")
        
        # Generate Streamlit secrets configuration
        st.subheader("🔐 Streamlit Secrets 配置")
        
        secrets_config = f"""[GOOGLE_DRIVE]
CREDENTIALS = '''
{json.dumps(credentials_data, indent=2)}
'''

FOLDER_ID = "your-google-drive-folder-id"
"""
        
        st.code(secrets_config, language="toml")
        
        st.info("""
        **下一步:**
        1. 複製上面的配置
        2. 進入你的 Streamlit 應用
        3. 點擊右上角三個點 > Settings > Secrets
        4. 貼上配置並保存
        5. 將 `your-google-drive-folder-id` 替換為實際的文件夾 ID
        """)
        
        # Download the configuration
        st.download_button(
            label="📥 下載 Secrets 配置",
            data=secrets_config,
            file_name="streamlit_secrets.toml",
            mime="text/plain"
        )
        
    except Exception as e:
        st.error(f"❌ 解析憑證文件失敗: {str(e)}")

# Folder ID input
st.subheader("📁 Google Drive 文件夾 ID")

folder_id = st.text_input(
    "輸入 Google Drive 文件夾 ID",
    help="從 Google Drive 文件夾 URL 中獲取，格式如: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
)

if folder_id:
    st.success(f"✅ 文件夾 ID: {folder_id}")
    
    # Generate complete configuration
    if uploaded_file:
        try:
            credentials_data = json.load(uploaded_file)
            complete_config = f"""[GOOGLE_DRIVE]
CREDENTIALS = '''
{json.dumps(credentials_data, indent=2)}
'''

FOLDER_ID = "{folder_id}"
"""
            
            st.subheader("🎯 完整配置")
            st.code(complete_config, language="toml")
            
            st.download_button(
                label="📥 下載完整配置",
                data=complete_config,
                file_name="complete_streamlit_secrets.toml",
                mime="text/plain"
            )
            
        except Exception as e:
            st.error(f"❌ 生成配置失敗: {str(e)}")

# Testing section
st.subheader("🧪 測試設置")

if st.button("🔍 測試 Google Drive 連接"):
    if uploaded_file and folder_id:
        try:
            # This would test the actual connection
            st.info("測試功能需要完整的應用設置。請按照以下步驟進行測試:")
            
            st.markdown("""
            **測試步驟:**
            1. 將配置添加到 Streamlit Secrets
            2. 更新你的應用代碼
            3. 部署到 Streamlit Cloud
            4. 在應用中測試數據庫連接
            """)
            
        except Exception as e:
            st.error(f"❌ 測試失敗: {str(e)}")
    else:
        st.warning("⚠️ 請先上傳憑證文件並輸入文件夾 ID")

# Code update instructions
st.subheader("💻 更新應用代碼")

st.markdown("""
在你的 `streamlit_app.py` 中，將數據庫導入部分替換為:

```python
# Import database manager with cloud storage support
try:
    from database_cloud import CloudDatabaseManager
    CLOUD_DB_AVAILABLE = True
except ImportError:
    # Fallback to local database
    from database import db
    CLOUD_DB_AVAILABLE = False
    st.warning("Cloud database not available. Using local database.")

# Initialize database manager based on environment
def get_db_manager():
    if os.getenv('STREAMLIT_CLOUD') and CLOUD_DB_AVAILABLE:
        return CloudDatabaseManager(storage_type="google_drive")
    elif CLOUD_DB_AVAILABLE:
        return CloudDatabaseManager(storage_type="simple_cloud")
    else:
        return db

# Initialize database
@st.cache_resource
def init_database():
    return get_db_manager()

# Get database instance
db_manager = init_database()
```
""")

# Deployment instructions
st.subheader("🚀 部署到 Streamlit Cloud")

st.markdown("""
**部署步驟:**

1. **更新 requirements.txt**
   ```txt
   google-auth-oauthlib>=1.0.0
   google-auth-httplib2>=0.1.0
   google-api-python-client>=2.100.0
   ```

2. **提交代碼到 GitHub**
   ```bash
   git add .
   git commit -m "Add Google Drive cloud storage"
   git push origin main
   ```

3. **設置 Streamlit Secrets**
   - 進入你的 Streamlit 應用
   - Settings > Secrets
   - 貼上生成的配置

4. **重新部署**
   - Streamlit Cloud 會自動重新部署
   - 檢查部署日誌

5. **測試功能**
   - 註冊新用戶
   - 檢查數據是否持久化
   - 查看 Google Drive 中的數據庫文件
""")

# Troubleshooting
st.subheader("🛠️ 故障排除")

with st.expander("常見問題"):
    st.markdown("""
    **Q: 憑證錯誤怎麼辦？**
    A: 檢查 JSON 文件是否完整，確認服務帳戶已創建
    
    **Q: 權限被拒絕？**
    A: 確認服務帳戶有文件夾的編輯權限
    
    **Q: API 未啟用？**
    A: 確認 Google Drive API 已啟用
    
    **Q: 文件夾 ID 錯誤？**
    A: 從 Google Drive URL 中正確複製文件夾 ID
    
    **Q: 部署失敗？**
    A: 檢查 requirements.txt 是否包含所有依賴
    """)

st.markdown("---")
st.markdown("""
<div style='text-align: center'>
    <p>🔧 Google Drive Setup Helper</p>
    <p>Follow these steps to enable cloud storage for your Streamlit app</p>
</div>
""", unsafe_allow_html=True) 