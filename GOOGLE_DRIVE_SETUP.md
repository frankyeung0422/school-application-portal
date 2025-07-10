# Google Drive API 設置指南 (Streamlit Cloud)

## 📋 完整設置步驟

### 步驟 1: 創建 Google Cloud Project

1. **訪問 Google Cloud Console**
   ```
   https://console.cloud.google.com/
   ```

2. **創建新項目**
   - 點擊頂部的項目選擇器
   - 點擊 "New Project"
   - 輸入項目名稱: `school-portal-cloud`
   - 點擊 "Create"

### 步驟 2: 啟用 Google Drive API

1. **進入 API Library**
   - 在左側菜單選擇 "APIs & Services" > "Library"

2. **搜尋並啟用 Drive API**
   - 搜尋 "Google Drive API"
   - 點擊 "Google Drive API"
   - 點擊 "Enable"

### 步驟 3: 創建服務帳戶 (重要！)

1. **進入 Credentials**
   - 左側菜單選擇 "APIs & Services" > "Credentials"

2. **創建服務帳戶**
   - 點擊 "Create Credentials" > "Service Account"
   - 輸入服務帳戶名稱: `streamlit-cloud-db`
   - 點擊 "Create and Continue"

3. **設置權限**
   - 角色選擇: "Editor"
   - 點擊 "Continue"
   - 點擊 "Done"

4. **創建密鑰**
   - 點擊剛創建的服務帳戶
   - 進入 "Keys" 標籤
   - 點擊 "Add Key" > "Create new key"
   - 選擇 "JSON"
   - 點擊 "Create"
   - **下載 JSON 文件** (重要！)

### 步驟 4: 設置 Google Drive 權限

1. **創建專用文件夾**
   - 訪問 https://drive.google.com
   - 創建新文件夾: `School Portal Database`
   - 右鍵點擊文件夾 > "Share"
   - 添加你的服務帳戶郵箱 (在 JSON 文件中找到)
   - 權限設置為 "Editor"

### 步驟 5: 在 Streamlit Cloud 中設置

1. **進入你的 Streamlit 應用**
   ```
   https://share.streamlit.io/your-username/your-repo
   ```

2. **設置 Secrets**
   - 點擊右上角的三個點 > "Settings"
   - 點擊 "Secrets"
   - 添加以下配置:

```toml
[GOOGLE_DRIVE]
CREDENTIALS = '''
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
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

### 步驟 6: 更新你的代碼

在你的 `streamlit_app.py` 中添加:

```python
import os
import json
from database_cloud import CloudDatabaseManager

# 檢查是否在 Streamlit Cloud 環境
def get_storage_type():
    if os.getenv('STREAMLIT_CLOUD'):
        return "google_drive"
    else:
        return "local"

# 初始化數據庫管理器
@st.cache_resource
def get_db_manager():
    return CloudDatabaseManager(storage_type=get_storage_type())

# 使用數據庫管理器
db_manager = get_db_manager()
```

### 步驟 7: 部署到 Streamlit Cloud

1. **提交代碼到 GitHub**
   ```bash
   git add .
   git commit -m "Add Google Drive cloud storage"
   git push origin main
   ```

2. **重新部署**
   - Streamlit Cloud 會自動重新部署
   - 檢查部署日誌是否有錯誤

## 🔧 測試步驟

### 1. 測試數據庫連接
```python
# 在你的應用中添加測試代碼
if st.button("Test Database Connection"):
    if db_manager.conn:
        st.success("✅ Database connected successfully!")
    else:
        st.error("❌ Database connection failed")
```

### 2. 測試數據持久化
```python
# 創建測試用戶
if st.button("Create Test User"):
    success = db_manager.create_user("test", "test@example.com", "password123")
    if success:
        st.success("✅ Test user created!")
    else:
        st.error("❌ Failed to create test user")
```

### 3. 檢查 Google Drive
- 訪問你的 Google Drive
- 檢查 `School Portal Database` 文件夾
- 應該看到 `school_portal.db` 文件

## 🛠️ 故障排除

### 常見問題

1. **"Service account not found"**
   - 檢查 JSON 憑證是否正確複製
   - 確認服務帳戶已創建

2. **"Permission denied"**
   - 確認服務帳戶有文件夾的編輯權限
   - 檢查文件夾 ID 是否正確

3. **"API not enabled"**
   - 確認 Google Drive API 已啟用
   - 檢查項目是否正確選擇

### 調試模式

```python
# 添加調試信息
if st.checkbox("Debug Mode"):
    st.write("Environment:", os.getenv('STREAMLIT_CLOUD', 'Local'))
    st.write("Storage Type:", get_storage_type())
    st.write("Database Connected:", db_manager.conn is not None)
    
    # 檢查 Google Drive 設置
    if hasattr(db_manager, 'storage_manager'):
        st.write("Storage Manager:", type(db_manager.storage_manager).__name__)
        if hasattr(db_manager.storage_manager, 'drive_service'):
            st.write("Google Drive Service:", db_manager.storage_manager.drive_service is not None)
```

## 📊 監控和維護

### 1. 檢查數據庫大小
```python
# 在 Google Drive 中檢查文件大小
# 如果超過 100MB，考慮清理舊數據
```

### 2. 定期備份
```python
# 自動備份功能
import schedule

def auto_backup():
    backup_data = db_manager.backup_database()
    # 可以保存到其他位置

# 每天凌晨備份
schedule.every().day.at("02:00").do(auto_backup)
```

### 3. 錯誤監控
```python
# 添加錯誤日誌
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    # 數據庫操作
    pass
except Exception as e:
    logger.error(f"Database error: {e}")
    st.error("Database operation failed")
```

## ✅ 檢查清單

- [ ] Google Cloud Project 已創建
- [ ] Google Drive API 已啟用
- [ ] 服務帳戶已創建
- [ ] JSON 憑證已下載
- [ ] Google Drive 文件夾已創建並共享
- [ ] Streamlit Secrets 已設置
- [ ] 代碼已更新
- [ ] 已部署到 Streamlit Cloud
- [ ] 數據庫連接測試通過
- [ ] 數據持久化測試通過

## 🎯 完成後的效果

1. **數據持久化**: 用戶數據不會在重啟後丟失
2. **自動同步**: 數據自動保存到 Google Drive
3. **備份安全**: 數據有多重備份
4. **跨設備訪問**: 可以從任何地方訪問數據

---

**重要提醒**: 請妥善保管你的 JSON 憑證文件，不要分享給他人！ 