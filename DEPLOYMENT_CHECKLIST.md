# 🚀 Streamlit Cloud + Google Drive 部署檢查清單

## 📋 你需要做的事情

### ✅ 步驟 1: Google Cloud 設置 (5分鐘)

1. **訪問 Google Cloud Console**
   - 打開 https://console.cloud.google.com/
   - 登錄你的 Google 帳戶

2. **創建項目**
   - 點擊頂部項目選擇器
   - 點擊 "New Project"
   - 名稱: `school-portal-cloud`
   - 點擊 "Create"

3. **啟用 Google Drive API**
   - 左側菜單: "APIs & Services" > "Library"
   - 搜尋 "Google Drive API"
   - 點擊 "Enable"

4. **創建服務帳戶**
   - "APIs & Services" > "Credentials"
   - "Create Credentials" > "Service Account"
   - 名稱: `streamlit-cloud-db`
   - 角色: "Editor"
   - 點擊 "Done"

5. **下載憑證**
   - 點擊剛創建的服務帳戶
   - "Keys" 標籤 > "Add Key" > "Create new key"
   - 選擇 "JSON"
   - 點擊 "Create"
   - **下載 JSON 文件** ⭐

### ✅ 步驟 2: Google Drive 設置 (2分鐘)

1. **創建文件夾**
   - 訪問 https://drive.google.com
   - 創建新文件夾: `School Portal Database`

2. **設置權限**
   - 右鍵點擊文件夾 > "Share"
   - 添加服務帳戶郵箱 (在 JSON 文件中找到 `client_email`)
   - 權限: "Editor"
   - 點擊 "Done"

3. **獲取文件夾 ID**
   - 打開文件夾
   - 從 URL 複製文件夾 ID
   - 格式: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

### ✅ 步驟 3: Streamlit Cloud 設置 (3分鐘)

1. **進入你的 Streamlit 應用**
   - 訪問 https://share.streamlit.io/your-username/your-repo

2. **設置 Secrets**
   - 右上角三個點 > "Settings"
   - 點擊 "Secrets"
   - 貼上以下配置 (替換為你的實際值):

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

### ✅ 步驟 4: 代碼更新 (已自動完成)

✅ 我已經為你更新了以下文件:
- `streamlit_app.py` - 添加了 Google Drive 支援
- `database_cloud.py` - 雲端數據庫管理器
- `cloud_storage_sqlite.py` - Google Drive API 整合
- `requirements.txt` - 添加了必要的依賴

### ✅ 步驟 5: 部署 (2分鐘)

1. **提交代碼**
   ```bash
   git add .
   git commit -m "Add Google Drive cloud storage"
   git push origin main
   ```

2. **等待部署**
   - Streamlit Cloud 會自動重新部署
   - 檢查部署日誌是否有錯誤

### ✅ 步驟 6: 測試 (3分鐘)

1. **測試註冊**
   - 註冊新用戶
   - 檢查是否成功

2. **測試登錄**
   - 登錄剛註冊的用戶
   - 檢查是否成功

3. **檢查 Google Drive**
   - 訪問你的 Google Drive
   - 檢查 `School Portal Database` 文件夾
   - 應該看到 `school_portal.db` 文件

## 🎯 完成後的效果

- ✅ 用戶數據持久化 (不會在重啟後丟失)
- ✅ 自動同步到 Google Drive
- ✅ 免費儲存空間 (15GB)
- ✅ 跨設備訪問數據

## 🛠️ 如果遇到問題

### 常見錯誤及解決方案

1. **"Service account not found"**
   - 檢查 JSON 憑證是否完整複製
   - 確認服務帳戶已創建

2. **"Permission denied"**
   - 確認服務帳戶有文件夾編輯權限
   - 檢查文件夾 ID 是否正確

3. **"API not enabled"**
   - 確認 Google Drive API 已啟用
   - 檢查項目是否正確選擇

4. **部署失敗**
   - 檢查 requirements.txt 是否包含所有依賴
   - 查看 Streamlit Cloud 部署日誌

### 調試模式

在應用中啟用調試模式:
```python
# 在側邊欄勾選 "Debug Mode"
# 會顯示詳細的連接信息
```

## 📞 需要幫助？

如果遇到問題:

1. 檢查這個檢查清單是否都完成了
2. 查看 `GOOGLE_DRIVE_SETUP.md` 詳細指南
3. 運行 `setup_google_drive.py` 獲取幫助
4. 檢查 Streamlit Cloud 部署日誌

---

**總時間**: 約 15-20 分鐘
**難度**: ⭐⭐ (簡單)
**成本**: 免費

完成後你的應用就能在 Streamlit Cloud 中持久化存儲數據了！🎉 