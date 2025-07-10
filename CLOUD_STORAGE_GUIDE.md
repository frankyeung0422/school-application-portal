# Cloud Storage SQLite 使用指南

## 概述

本指南介紹如何在 Streamlit Cloud 中使用 SQLite 配合雲端儲存來解決數據持久化問題。

## 問題背景

Streamlit Cloud 使用臨時儲存，每次重新部署或重啟都會重置數據庫。這導致用戶數據丟失，需要解決方案來實現數據持久化。

## 解決方案

### 方案 1: Google Drive API (推薦)

#### 優點
- 完全免費 (15GB 儲存空間)
- 自動同步
- 可靠且穩定
- 支援版本控制

#### 設置步驟

1. **創建 Google Cloud Project**
   ```bash
   # 訪問 Google Cloud Console
   https://console.cloud.google.com/
   ```

2. **啟用 Google Drive API**
   - 進入 "APIs & Services" > "Library"
   - 搜尋 "Google Drive API"
   - 點擊啟用

3. **創建憑證**
   - 進入 "APIs & Services" > "Credentials"
   - 點擊 "Create Credentials" > "OAuth 2.0 Client IDs"
   - 選擇 "Desktop application"
   - 下載 JSON 憑證文件

4. **安裝依賴**
   ```bash
   pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client
   ```

5. **在 Streamlit 中使用**
   ```python
   from database_cloud import CloudDatabaseManager
   
   # 初始化 Google Drive 儲存
   db_manager = CloudDatabaseManager(storage_type="google_drive")
   ```

### 方案 2: 簡單文件上傳/下載

#### 優點
- 設置簡單
- 無需外部 API
- 適合開發和測試

#### 使用方法

1. **初始化**
   ```python
   from database_cloud import CloudDatabaseManager
   
   # 使用簡單雲端儲存
   db_manager = CloudDatabaseManager(storage_type="simple_cloud")
   ```

2. **上傳數據庫文件**
   - 應用會提供文件上傳功能
   - 上傳現有的 SQLite 數據庫文件
   - 系統會自動使用上傳的文件

3. **下載數據庫備份**
   - 應用提供下載按鈕
   - 定期下載數據庫備份
   - 保存到本地安全位置

### 方案 3: 外部數據庫服務

#### 推薦服務
- **Supabase** (PostgreSQL)
- **PlanetScale** (MySQL)
- **Neon** (PostgreSQL)
- **Railway** (PostgreSQL)

#### 優點
- 專業數據庫服務
- 高可用性
- 自動備份
- 更好的性能

#### 設置示例 (Supabase)

1. **創建 Supabase 項目**
   ```bash
   # 訪問 https://supabase.com
   # 創建新項目
   ```

2. **獲取連接信息**
   ```python
   # 在 Supabase 儀表板獲取
   DATABASE_URL = "postgresql://user:password@host:port/database"
   ```

3. **安裝依賴**
   ```bash
   pip install psycopg2-binary sqlalchemy
   ```

4. **使用 SQLAlchemy**
   ```python
   from sqlalchemy import create_engine
   
   engine = create_engine(DATABASE_URL)
   # 使用 SQLAlchemy ORM 替代 SQLite
   ```

## 實施建議

### 開發階段
- 使用 **方案 2 (簡單文件上傳/下載)**
- 快速測試和開發
- 無需複雜設置

### 生產環境
- 使用 **方案 1 (Google Drive API)**
- 或 **方案 3 (外部數據庫服務)**
- 確保數據安全和持久化

### 混合方案
```python
# 根據環境選擇儲存方式
import os

if os.getenv('STREAMLIT_CLOUD'):
    # Streamlit Cloud 環境
    storage_type = "google_drive"
else:
    # 本地開發環境
    storage_type = "local"

db_manager = CloudDatabaseManager(storage_type=storage_type)
```

## 代碼示例

### 基本使用
```python
import streamlit as st
from database_cloud import CloudDatabaseManager

# 初始化數據庫管理器
@st.cache_resource
def get_db_manager():
    return CloudDatabaseManager(storage_type="google_drive")

db_manager = get_db_manager()

# 用戶註冊
def register_user(username, email, password):
    success = db_manager.create_user(username, email, password)
    if success:
        st.success("註冊成功！")
    else:
        st.error("註冊失敗，用戶可能已存在")

# 用戶登錄
def login_user(email, password):
    user = db_manager.verify_user(email, password)
    if user:
        st.session_state.user = user
        st.success("登錄成功！")
    else:
        st.error("登錄失敗，請檢查郵箱和密碼")
```

### 數據備份和恢復
```python
# 創建備份
def create_backup():
    backup_data = db_manager.backup_database()
    if backup_data:
        st.download_button(
            label="下載數據庫備份",
            data=backup_data,
            file_name="school_portal_backup.db",
            mime="application/x-sqlite3"
        )

# 恢復備份
def restore_backup(uploaded_file):
    if uploaded_file:
        backup_data = uploaded_file.read()
        success = db_manager.restore_database(backup_data)
        if success:
            st.success("數據庫恢復成功！")
        else:
            st.error("數據庫恢復失敗")
```

## 安全考慮

### 數據加密
```python
import hashlib
import os

def hash_password(password):
    """安全的密碼哈希"""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return salt + key

def verify_password(stored_password, provided_password):
    """驗證密碼"""
    salt = stored_password[:32]
    stored_key = stored_password[32:]
    key = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt, 100000)
    return stored_key == key
```

### 環境變量
```python
# 在 Streamlit Cloud 中設置
# 進入 Settings > Secrets
# 添加以下配置：
{
    "GOOGLE_CREDENTIALS": "your_google_credentials_json",
    "DATABASE_URL": "your_database_url"
}
```

## 故障排除

### 常見問題

1. **Google Drive API 錯誤**
   - 檢查憑證是否正確
   - 確認 API 已啟用
   - 檢查權限範圍

2. **數據庫連接失敗**
   - 檢查網絡連接
   - 確認數據庫文件存在
   - 檢查文件權限

3. **數據同步問題**
   - 手動觸發同步
   - 檢查雲端儲存空間
   - 驗證文件完整性

### 調試模式
```python
# 啟用調試模式
st.set_option('deprecation.showPyplotGlobalUse', False)

# 顯示數據庫狀態
if st.checkbox("顯示調試信息"):
    st.write("數據庫連接狀態:", db_manager.conn is not None)
    st.write("儲存類型:", db_manager.storage_type)
    st.write("雲端儲存可用:", CLOUD_STORAGE_AVAILABLE)
```

## 最佳實踐

1. **定期備份**
   - 每日自動備份
   - 手動備份重要數據
   - 測試備份恢復流程

2. **錯誤處理**
   - 捕獲所有數據庫異常
   - 提供用戶友好的錯誤信息
   - 記錄錯誤日誌

3. **性能優化**
   - 使用連接池
   - 優化查詢語句
   - 定期清理舊數據

4. **用戶體驗**
   - 提供數據導出功能
   - 顯示同步狀態
   - 自動保存用戶操作

## 部署檢查清單

- [ ] 安裝所有依賴包
- [ ] 配置環境變量
- [ ] 測試數據庫連接
- [ ] 驗證用戶註冊/登錄
- [ ] 測試數據備份/恢復
- [ ] 檢查錯誤處理
- [ ] 驗證雲端同步
- [ ] 測試性能表現

## 總結

通過使用雲端儲存解決方案，可以有效解決 Streamlit Cloud 的數據持久化問題。建議根據項目需求和技術能力選擇合適的方案，並遵循安全最佳實踐。 