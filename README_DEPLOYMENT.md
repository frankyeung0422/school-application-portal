# 🚀 Streamlit Cloud 部署指南

## 📋 快速部署步驟

### 1. 上傳文件到 GitHub

由於你的系統沒有 Git，請使用以下方法之一：

#### 方法 A: GitHub Desktop (推薦)
1. 下載 [GitHub Desktop](https://desktop.github.com/)
2. 克隆你的倉庫
3. 將所有文件複製到倉庫文件夾
4. 提交並推送

#### 方法 B: GitHub 網頁
1. 訪問你的 GitHub 倉庫
2. 點擊 "Add file" > "Upload files"
3. 上傳以下文件：
   - `streamlit_app.py`
   - `database_cloud.py`
   - `cloud_storage_sqlite.py`
   - `requirements.txt`
   - `test_google_drive.py`
   - 其他所有文件

### 2. 設置 Streamlit Secrets

在你的 Streamlit 應用中：
1. 點擊右上角三個點 > "Settings"
2. 點擊 "Secrets"
3. 貼上以下配置：

```toml
[GOOGLE_DRIVE]
CREDENTIALS = '''
{
  "type": "service_account",
  "project_id": "schoolportalhk",
  "private_key_id": "fd64f6a8f9514f22b19abe113cf6c7fa14fca76e",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCzq6tVsFf6kzp/\neKybGUdCKtGTkG+cY6m3AmLmIJTnyE/+uTT88f1CCXG57OvCXCjzHxoXVZAgwo4/\nsLioBYBdhcOnpMlYQRPbXMj/izTqHdikHjYk202E++0b1O1ubIY7P4G76jB3FuoA\nQBwp0jOppSOaBVec2zr0iWTf0Hw6KbS2ljodR9YMeNjHv5nc+io2lCV8ULXhxa2s\n6VMoOSPvmjhwZVEJH50PloQ7KIzYkam5Ju3s9ljxcJGpCUIb+m7I6ZyxiZnq3CQJ\ne/N6Z0YywEN40OymI9Ktrr2tsUV5dcvAw/lR+8QGgX9nzmObjQ81ztpg9Bq1ctD9\n22ayhQoDAgMBAAECggEARqRXG7xXgxpzFB52ww6X0WCzgRD3iSY4Ws/R4chqs40z\nQqRAPLnKiTXcZK1N7t+8bAbNA+Ks5eyI8GrD17A+Dcdjq5zjW1NPAt9C2hK6Ldip\nTrHgOPKO0pwY2GoKJnH9/vqTwDYucwxr2chbKmhOzsMyscKq9W3PCsmgg01eIqGN\nhbsmjknNPe68Peh7vBb7TJdXyeNTEhjI0YVyJ2DK73Xk7UjpVvDVMXVlPhX5gerv\nffhVgTPC0wGN9cVztkQy/aeYKpP1vDPg4y7qTULCdKO1jWGkE0Yk5/mLMt0P0Ehw\nCIf6FSetYOi7KxbYRcZsE1w0rLMGWtHkdVp4Yk53QQKBgQDdFP/b86kjLIzPmnTy\nDbiO16+aMhxWV8ZT+k8xF/68+w8NaifebEQ741jq2eqLDpFLiWpONSNj3IkgPm9f\nBDkJE7fU36egqpuEitpWd3CGYhz3nJUIBbqFMWJuoKLUwzTsKENv5CBddLzJyAwe\nIYymXhJCDpACVTsRoj54p07cwQKBgQDQDEhUnuEN5E78ln21xH1TyIj9RZLhWHP8\n8kw0yF0m08olqaR7eKMgVYod0YkKRQgylSzCrIpMKMPs/p0SSCeYlhtk0N+Abg03\n7TrJSP662nyeE5HpI1AKiZJdGt+XDXhhzx1aybkt4molcHLDU7H+faIoWvpSXjLR\nJN80L+SjwwKBgFIz7K6r+sfJWNIYbENUNrtmFzUOTNsN6ABxoeBvO5ipAP/L6Oca\n+oQKFJW+USdDU2LyxUQvHemTpqkGjgKWX16wpjnQr1NeHFU8C9L6tixBbuPipMdG\n2gOMST05HVJfAt6MWgbQm/gj385nQ5owf0uczs0g/QrhBgWYfgH+s6QBAoGBAIXu\nwkmnll5pEehNwVPY0I21VWsm9O2ZEeJO4XxBWKZ8RXCFi1vpR6qzJp0XnU89LY/S\ntOQGS2nH/Il/SALS7JqwV6ZJSPjW4C+Wyvd1xHbp3LuvAYnCr+54rf6+JB6MD2l3\n+f/OSSYe0hKUF21jXfzlSBUOrIOGHNTDFeX0xw4dAoGARsQtC5C+sd6SBcD/xj9u\ncdNf42AYVpniqr1t5X6Q2ft1jO+LfP07q37cH5wTcjUKJE/S4v7gjQZlLYufKhuu\nlPJK5HQ62gKxwR1hDOhAEb2SpzfWxhQnMjkmcXslh+MnBcEc/gxAvryZkrHtUFuC\np06NYRZ/A6tlMkhdQsb5c4w=\n-----END PRIVATE KEY-----\n",
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

### 3. 部署到 Streamlit Cloud

1. 訪問 [Streamlit Cloud](https://share.streamlit.io/)
2. 連接你的 GitHub 倉庫
3. 設置主文件: `streamlit_app.py`
4. 點擊 "Deploy"

### 4. 測試部署

部署完成後：
1. 訪問你的 Streamlit 應用
2. 註冊新用戶
3. 檢查 Google Drive 中是否有 `school_portal.db` 文件
4. 重新啟動應用檢查數據是否持久化

## 📁 必要文件清單

確保以下文件都在你的 GitHub 倉庫中：

- ✅ `streamlit_app.py` - 主應用文件
- ✅ `database_cloud.py` - 雲端數據庫管理器
- ✅ `cloud_storage_sqlite.py` - Google Drive 整合
- ✅ `requirements.txt` - 依賴文件
- ✅ `test_google_drive.py` - 測試腳本

## 🛠️ 故障排除

### 常見問題

1. **"Module not found" 錯誤**
   - 檢查 `requirements.txt` 是否包含所有依賴
   - 確保 Streamlit Cloud 重新部署

2. **"Google Drive credentials not found"**
   - 檢查 Streamlit Secrets 是否正確設置
   - 確認憑證格式正確

3. **"Permission denied" 錯誤**
   - 確認服務帳戶有文件夾編輯權限
   - 檢查文件夾 ID 是否正確

### 調試步驟

1. 檢查 Streamlit Cloud 日誌
2. 運行測試腳本 `test_google_drive.py`
3. 檢查 Google Drive 權限
4. 確認 Streamlit Secrets 設置

## 🎯 成功指標

部署成功後，你應該看到：

- ✅ 應用正常加載
- ✅ 可以註冊新用戶
- ✅ 可以登錄
- ✅ Google Drive 中有 `school_portal.db` 文件
- ✅ 重啟應用後數據仍然存在

---

**完成這些步驟後，你的學校申請門戶就能在 Streamlit Cloud 中持久化存儲數據了！🎉** 