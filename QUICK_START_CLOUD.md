# 快速開始：雲端儲存 SQLite

## 🚀 5分鐘設置指南

### 步驟 1: 選擇儲存方案

**推薦方案 (按複雜度排序):**

1. **簡單文件上傳/下載** - 最簡單，適合快速測試
2. **Google Drive API** - 免費且可靠，適合生產環境
3. **外部數據庫服務** - 最專業，適合大型應用

### 步驟 2: 安裝依賴

```bash
# 基本依賴
pip install streamlit pandas plotly

# 雲端儲存依賴 (選擇其中一個)
pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### 步驟 3: 更新你的應用

在你的 `streamlit_app.py` 中替換數據庫管理器：

```python
# 替換這行:
# from database import DatabaseManager

# 改為:
from database_cloud import CloudDatabaseManager

# 初始化時選擇儲存類型
db_manager = CloudDatabaseManager(storage_type="simple_cloud")  # 或 "google_drive"
```

### 步驟 4: 測試應用

```bash
streamlit run streamlit_app.py
```

## 📋 詳細實施指南

### 方案 A: 簡單文件上傳/下載

**優點:** 設置簡單，無需外部服務
**缺點:** 需要手動管理文件

```python
# 在你的應用中
from database_cloud import CloudDatabaseManager

# 初始化
db_manager = CloudDatabaseManager(storage_type="simple_cloud")

# 應用會自動提供文件上傳/下載功能
```

### 方案 B: Google Drive API

**優點:** 自動同步，免費，可靠
**缺點:** 需要 Google Cloud 設置

#### 設置步驟:

1. **訪問 Google Cloud Console**
   ```
   https://console.cloud.google.com/
   ```

2. **創建項目並啟用 Drive API**
   - 創建新項目
   - 搜尋 "Google Drive API"
   - 點擊啟用

3. **創建憑證**
   - APIs & Services > Credentials
   - Create Credentials > OAuth 2.0 Client IDs
   - 選擇 Desktop application
   - 下載 JSON 文件

4. **在 Streamlit Cloud 中設置**
   - 進入你的 Streamlit 應用
   - Settings > Secrets
   - 添加 Google 憑證

5. **使用代碼**
   ```python
   db_manager = CloudDatabaseManager(storage_type="google_drive")
   ```

### 方案 C: 外部數據庫服務

**推薦服務:** Supabase (免費層級)

#### Supabase 設置:

1. **創建 Supabase 項目**
   ```
   https://supabase.com
   ```

2. **獲取連接信息**
   - 在儀表板中找到 Database URL
   - 格式: `postgresql://user:password@host:port/database`

3. **安裝依賴**
   ```bash
   pip install psycopg2-binary sqlalchemy
   ```

4. **使用 SQLAlchemy**
   ```python
   from sqlalchemy import create_engine
   import os
   
   DATABASE_URL = os.getenv('DATABASE_URL')
   engine = create_engine(DATABASE_URL)
   ```

## 🔧 整合到現有應用

### 1. 更新 requirements.txt

```txt
streamlit>=1.28.0
pandas>=2.0.0
plotly>=5.15.0
google-auth-oauthlib>=1.0.0
google-auth-httplib2>=0.1.0
google-api-python-client>=2.100.0
```

### 2. 修改主應用文件

```python
# 在 streamlit_app.py 頂部
import os
from database_cloud import CloudDatabaseManager

# 根據環境選擇儲存類型
def get_storage_type():
    if os.getenv('STREAMLIT_CLOUD'):
        return "google_drive"  # 或 "simple_cloud"
    else:
        return "local"

# 初始化數據庫管理器
@st.cache_resource
def get_db_manager():
    return CloudDatabaseManager(storage_type=get_storage_type())

db_manager = get_db_manager()
```

### 3. 添加備份功能

```python
# 在側邊欄添加備份功能
if st.sidebar.button("📥 Download Database Backup"):
    backup_data = db_manager.backup_database()
    if backup_data:
        st.download_button(
            label="Download Backup",
            data=backup_data,
            file_name="school_portal_backup.db",
            mime="application/x-sqlite3"
        )

# 添加上傳備份功能
uploaded_file = st.sidebar.file_uploader(
    "Upload Database Backup",
    type=['db', 'sqlite', 'sqlite3']
)
if uploaded_file and st.sidebar.button("Restore Backup"):
    backup_data = uploaded_file.read()
    success = db_manager.restore_database(backup_data)
    if success:
        st.sidebar.success("Database restored!")
    else:
        st.sidebar.error("Restore failed")
```

## 🛠️ 故障排除

### 常見問題

1. **"Cloud database manager not available"**
   ```bash
   pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client
   ```

2. **Google Drive API 錯誤**
   - 檢查憑證是否正確上傳
   - 確認 API 已啟用
   - 檢查權限範圍

3. **數據庫連接失敗**
   - 檢查網絡連接
   - 確認文件權限
   - 查看錯誤日誌

### 調試模式

```python
# 添加調試信息
if st.checkbox("Debug Mode"):
    st.write("Database Connection:", db_manager.conn is not None)
    st.write("Storage Type:", db_manager.storage_type)
    st.write("Storage Manager:", type(db_manager.storage_manager).__name__)
```

## 📊 性能優化

### 1. 連接池

```python
# 使用連接池提高性能
import sqlite3
from contextlib import contextmanager

@contextmanager
def get_db_connection():
    conn = sqlite3.connect('school_portal.db')
    try:
        yield conn
    finally:
        conn.close()
```

### 2. 定期備份

```python
# 自動備份功能
import schedule
import time

def auto_backup():
    backup_data = db_manager.backup_database()
    # 保存到雲端儲存

# 每天凌晨 2 點備份
schedule.every().day.at("02:00").do(auto_backup)
```

### 3. 數據清理

```python
# 定期清理舊數據
def cleanup_old_data():
    # 刪除 30 天前的通知
    # 清理過期的應用記錄
    pass
```

## 🔒 安全考慮

### 1. 密碼加密

```python
import hashlib
import os

def hash_password(password):
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return salt + key
```

### 2. 環境變量

```python
# 使用環境變量存儲敏感信息
import os

DATABASE_URL = os.getenv('DATABASE_URL')
GOOGLE_CREDENTIALS = os.getenv('GOOGLE_CREDENTIALS')
```

### 3. 數據驗證

```python
# 驗證用戶輸入
def validate_email(email):
    import re
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None
```

## 📈 監控和日誌

### 1. 添加日誌

```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def log_database_operation(operation, success, error=None):
    if success:
        logger.info(f"Database {operation} successful")
    else:
        logger.error(f"Database {operation} failed: {error}")
```

### 2. 性能監控

```python
import time

def measure_performance(func):
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        st.write(f"Operation took {end_time - start_time:.2f} seconds")
        return result
    return wrapper
```

## 🎯 下一步

1. **選擇適合的儲存方案**
2. **實施基本功能**
3. **測試備份/恢復**
4. **添加安全措施**
5. **監控性能**
6. **部署到生產環境**

## 📞 支持

如果遇到問題：

1. 檢查錯誤日誌
2. 確認依賴已安裝
3. 驗證配置正確
4. 測試連接性
5. 查看文檔和示例

---

**記住:** 開始時使用簡單方案，隨著需求增長再升級到更複雜的解決方案。 