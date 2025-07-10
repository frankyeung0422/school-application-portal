# 🚀 最終部署指南 - Google Drive + Streamlit Cloud

## ✅ 你已經完成的步驟

1. ✅ 創建了 Google Cloud 項目
2. ✅ 啟用了 Google Drive API
3. ✅ 創建了服務帳戶
4. ✅ 下載了 JSON 憑證
5. ✅ 設置了 Streamlit Secrets
6. ✅ 創建了 Google Drive 文件夾

## 🔧 現在需要做的事情

### 步驟 1: 安裝 Git (如果還沒安裝)

由於你的系統沒有 Git，請：

1. **重新啟動 PowerShell** (讓 Git 安裝生效)
2. **或者手動安裝 Git**:
   - 訪問 https://git-scm.com/download/win
   - 下載並安裝 Git for Windows

### 步驟 2: 測試本地連接

運行測試腳本來驗證 Google Drive 連接：

```bash
# 如果你有 Python 和 Streamlit
streamlit run test_google_drive.py
```

或者直接在 Streamlit Cloud 上測試。

### 步驟 3: 提交代碼到 GitHub

如果你有 Git：

```bash
# 初始化 Git 倉庫 (如果還沒初始化)
git init

# 添加所有文件
git add .

# 提交更改
git commit -m "Add Google Drive cloud storage support"

# 推送到 GitHub
git push origin main
```

如果你沒有 Git，可以：

1. **使用 GitHub Desktop** (圖形界面)
2. **直接在 GitHub 網頁上上傳文件**
3. **使用 VS Code 的 Git 功能**

### 步驟 4: 部署到 Streamlit Cloud

1. **訪問 Streamlit Cloud**: https://share.streamlit.io/
2. **連接你的 GitHub 倉庫**
3. **設置部署配置**:
   - Main file path: `streamlit_app.py`
   - Python version: 3.9 或更高

## 📋 文件檢查清單

確保以下文件都在你的項目中：

- ✅ `streamlit_app.py` - 主應用文件
- ✅ `database_cloud.py` - 雲端數據庫管理器
- ✅ `cloud_storage_sqlite.py` - Google Drive 整合
- ✅ `requirements.txt` - 依賴文件
- ✅ `test_google_drive.py` - 測試腳本

## 🔍 測試部署

部署完成後：

1. **訪問你的 Streamlit 應用**
2. **註冊新用戶**
3. **檢查 Google Drive** 中是否出現 `school_portal.db` 文件
4. **重新啟動應用** 檢查數據是否持久化

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

4. **數據庫連接失敗**
   - 檢查 Google Drive API 是否啟用
   - 確認項目 ID 正確

### 調試步驟

1. **運行測試腳本**:
   ```bash
   streamlit run test_google_drive.py
   ```

2. **檢查 Streamlit Cloud 日誌**:
   - 進入你的 Streamlit 應用
   - 點擊右上角三個點 > "View app logs"

3. **檢查 Google Drive**:
   - 訪問你的 Google Drive
   - 查看 `School Portal Database` 文件夾

## 📊 成功指標

部署成功後，你應該看到：

- ✅ 應用正常加載
- ✅ 可以註冊新用戶
- ✅ 可以登錄
- ✅ Google Drive 中有 `school_portal.db` 文件
- ✅ 重啟應用後數據仍然存在

## 🎯 最終檢查清單

- [ ] Git 已安裝並配置
- [ ] 所有文件已提交到 GitHub
- [ ] Streamlit Cloud 已部署
- [ ] Google Drive 連接正常
- [ ] 用戶註冊/登錄功能正常
- [ ] 數據持久化測試通過

## 📞 需要幫助？

如果遇到問題：

1. **查看 Streamlit Cloud 日誌**
2. **運行測試腳本** `test_google_drive.py`
3. **檢查 Google Drive 權限**
4. **確認 Streamlit Secrets 設置**

---

**完成這些步驟後，你的學校申請門戶就能在 Streamlit Cloud 中持久化存儲數據了！🎉**

數據將自動同步到你的 Google Drive，即使應用重啟也不會丟失用戶數據。 