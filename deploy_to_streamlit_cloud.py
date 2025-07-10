"""
Deploy to Streamlit Cloud Helper
This script helps verify your setup before deploying to Streamlit Cloud
"""

import streamlit as st
import os
import sys

st.set_page_config(
    page_title="Streamlit Cloud Deployment Helper",
    page_icon="🚀",
    layout="wide"
)

st.title("🚀 Streamlit Cloud Deployment Helper")

st.markdown("""
## 📋 部署檢查清單

這個腳本會檢查你的設置是否準備好部署到 Streamlit Cloud。
""")

# Check 1: Required files
st.header("1. 📁 必要文件檢查")

required_files = [
    "streamlit_app.py",
    "database_cloud.py", 
    "cloud_storage_sqlite.py",
    "requirements.txt"
]

missing_files = []
for file in required_files:
    if os.path.exists(file):
        st.success(f"✅ {file}")
    else:
        st.error(f"❌ {file} - 缺失")
        missing_files.append(file)

if missing_files:
    st.error(f"❌ 缺少 {len(missing_files)} 個必要文件")
else:
    st.success("✅ 所有必要文件都存在")

# Check 2: Requirements.txt
st.header("2. 📦 依賴檢查")

if os.path.exists("requirements.txt"):
    with open("requirements.txt", "r") as f:
        requirements = f.read()
    
    st.code(requirements, language="text")
    
    # Check for Google Drive dependencies
    google_deps = [
        "google-auth-oauthlib",
        "google-auth-httplib2", 
        "google-api-python-client"
    ]
    
    missing_deps = []
    for dep in google_deps:
        if dep in requirements:
            st.success(f"✅ {dep}")
        else:
            st.error(f"❌ {dep} - 缺失")
            missing_deps.append(dep)
    
    if missing_deps:
        st.error("❌ 缺少 Google Drive 依賴")
    else:
        st.success("✅ 所有 Google Drive 依賴都已包含")
else:
    st.error("❌ requirements.txt 文件不存在")

# Check 3: Streamlit Secrets (simulated)
st.header("3. 🔐 Streamlit Secrets 檢查")

st.info("""
在 Streamlit Cloud 中，你需要設置以下 Secrets:

```toml
[GOOGLE_DRIVE]
CREDENTIALS = '''
{
  "type": "service_account",
  "project_id": "schoolportalhk",
  "private_key_id": "fd64f6a8f9514f22b19abe113cf6c7fa14fca76e",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "streamlit-cloud-db@schoolportalhk.iam.gserviceaccount.com",
  "client_id": "117141813818385350638",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/streamlit-cloud-db%40schoolportalhk.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
'''

FOLDER_ID = "your-google-drive-folder-id"
```

**重要**: 將 `your-google-drive-folder-id` 替換為你的實際文件夾 ID
""")

# Check 4: Google Drive setup
st.header("4. ☁️ Google Drive 設置檢查")

st.markdown("""
請確認以下設置已完成:

- ✅ Google Cloud 項目已創建
- ✅ Google Drive API 已啟用  
- ✅ 服務帳戶已創建
- ✅ JSON 憑證已下載
- ✅ Google Drive 文件夾已創建
- ✅ 服務帳戶有文件夾編輯權限
- ✅ Streamlit Secrets 已設置
""")

# Check 5: Deployment steps
st.header("5. 🚀 部署步驟")

st.markdown("""
### 方法 1: 使用 GitHub Desktop (推薦)

1. **下載 GitHub Desktop**: https://desktop.github.com/
2. **克隆你的倉庫**
3. **添加所有文件**
4. **提交並推送**

### 方法 2: 使用 GitHub 網頁

1. **訪問你的 GitHub 倉庫**
2. **點擊 "Add file" > "Upload files"**
3. **上傳所有文件**
4. **提交更改**

### 方法 3: 使用 VS Code

1. **打開 VS Code**
2. **打開你的項目文件夾**
3. **使用內建的 Git 功能**
4. **提交並推送**

### 部署到 Streamlit Cloud

1. **訪問**: https://share.streamlit.io/
2. **連接你的 GitHub 倉庫**
3. **設置主文件**: `streamlit_app.py`
4. **部署**
""")

# Check 6: Testing
st.header("6. 🧪 測試步驟")

st.markdown("""
部署完成後，請測試以下功能:

1. **訪問你的 Streamlit 應用**
2. **註冊新用戶**
3. **登錄用戶**
4. **檢查 Google Drive** 中是否有 `school_portal.db` 文件
5. **重新啟動應用** 檢查數據是否持久化

### 運行測試腳本

如果部署成功，你可以運行測試腳本來驗證:

```bash
streamlit run test_google_drive.py
```
""")

# Final checklist
st.header("7. ✅ 最終檢查清單")

with st.expander("點擊查看完整檢查清單"):
    st.markdown("""
    - [ ] 所有必要文件都存在
    - [ ] requirements.txt 包含所有依賴
    - [ ] Google Cloud 項目已設置
    - [ ] Google Drive API 已啟用
    - [ ] 服務帳戶已創建
    - [ ] JSON 憑證已下載
    - [ ] Google Drive 文件夾已創建
    - [ ] 服務帳戶有文件夾權限
    - [ ] Streamlit Secrets 已設置
    - [ ] 代碼已提交到 GitHub
    - [ ] Streamlit Cloud 已部署
    - [ ] 應用可以正常加載
    - [ ] 用戶註冊功能正常
    - [ ] 用戶登錄功能正常
    - [ ] Google Drive 中有數據庫文件
    - [ ] 數據持久化測試通過
    """)

st.markdown("---")
st.markdown("""
<div style='text-align: center'>
    <p>🚀 Streamlit Cloud Deployment Helper</p>
    <p>完成所有檢查後，你的應用就準備好部署了！</p>
</div>
""", unsafe_allow_html=True) 