# Streamlit Cloud Deployment Guide

## 部署到 Streamlit Cloud Community

### 重要注意事項

⚠️ **Streamlit Cloud 限制：**
- 使用臨時檔案系統，每次重啟都會重置資料庫
- 不支援持久化檔案儲存
- 多用戶同時訪問可能造成資料庫鎖定

### 部署步驟

1. **準備 GitHub Repository**
   - 確保所有檔案都已推送到 GitHub
   - 確保 `requirements.txt` 包含所有依賴

2. **部署到 Streamlit Cloud**
   - 前往 [share.streamlit.io](https://share.streamlit.io)
   - 使用 GitHub 帳號登入
   - 選擇你的 repository
   - 設定主檔案路徑：`streamlit_app.py`
   - 點擊 "Deploy"

3. **環境變數設定**
   - 在 Streamlit Cloud 設定中，可以添加環境變數
   - 目前不需要額外設定

### 資料庫解決方案

**當前實現：**
- 自動檢測 Streamlit Cloud 環境
- 在雲端使用記憶體資料庫 (`:memory:`)
- 在本地使用檔案資料庫 (`school_portal.db`)

**限制：**
- 雲端部署中，用戶資料會在應用重啟後消失
- 每次部署都會重置資料庫

### 建議的長期解決方案

1. **使用外部資料庫**
   - PostgreSQL (Supabase, Railway)
   - MongoDB Atlas
   - SQLite with cloud storage

2. **使用 Streamlit 的 secrets 管理**
   - 儲存資料庫連線字串
   - 管理 API 金鑰

3. **實作資料匯出/匯入功能**
   - 讓用戶可以備份資料
   - 支援資料恢復

### 測試部署

部署完成後，測試以下功能：
1. 用戶註冊
2. 用戶登入
3. 資料庫操作
4. 應用程式功能

### 故障排除

**常見問題：**
1. **模組找不到**：檢查 `requirements.txt`
2. **資料庫錯誤**：檢查是否為記憶體資料庫模式
3. **部署失敗**：檢查檔案路徑和語法錯誤

**除錯技巧：**
- 查看 Streamlit Cloud 的日誌
- 使用 `st.write()` 輸出除錯資訊
- 檢查環境變數設定

### 聯絡支援

如果遇到問題：
1. 檢查 Streamlit Cloud 狀態頁面
2. 查看應用程式日誌
3. 在 GitHub Issues 中報告問題 