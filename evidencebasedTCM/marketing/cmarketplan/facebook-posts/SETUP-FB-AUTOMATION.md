# FB 自動發布設定指南

**目標**：取得 Facebook App credentials + 永久不過期的 Page Access Token，啟用 EBTCM 內建的自動發布功能。

**預估時間**：30 分鐘（首次設定），之後永不重做。

---

## 為甚麼需要這麼複雜？

Facebook 為了保護用戶資料，所有自動化發文都需要：
1. 一個註冊的 FB App（你的應用程式身份）
2. 一個 Page Access Token（代表你獲得發文授權）
3. （生產用，可選）App Review — 但對於只發到自己擁有的 Page，**不需要 App Review**

---

## 步驟 1：建立 Facebook App（5 分鐘）

1. 開 https://developers.facebook.com/apps/
2. 用個人 FB 登入（必須是擁有 EBTCM Page 的 admin）
3. 點 **"Create App"**
4. **Use case**：選 **"Other"** → Next
5. **App type**：選 **"Business"** → Next
6. **App name**：`EBTCM Auto Poster`
7. **App contact email**：你的電郵
8. **Business portfolio**：選擇你的業務管理平台（前面建立 EBTCM 時的）
9. 點 **"Create App"** → 輸入密碼確認

完成後，你會在 App Dashboard 看到：

| 欄位 | 在哪找 |
|------|-------|
| **App ID** | Dashboard 頂部，純數字（~16 位） |
| **App Secret** | Settings → Basic → "App Secret" 旁邊點 "Show" |

把這兩個值存起來 — 待會放進 `.env`。

---

## 步驟 2：取得 Page ID（1 分鐘）

1. 開你的 FB 專頁 https://www.facebook.com/[你的-page]
2. 點 **"About"**
3. 捲到最下面 → **Page ID** 是一串 15-16 位數字

或：在 https://developers.facebook.com/tools/explorer/ 用查詢 `me/accounts` 看到所有你管理的 Page + ID。

---

## 步驟 3：先把 3 個值放進 `.env`

```env
FB_APP_ID="924720747195161"
FB_APP_SECRET="43570f942b6d30d535f8b8ea08ab9a86"
FB_PAGE_ID="987654321098765"
FB_PAGE_ACCESS_TOKEN=""   # 暫時空白，下一步取得
```

---

## 步驟 4：取得短期 User Access Token（5 分鐘）

1. 開 https://developers.facebook.com/tools/explorer/
2. 右上 **"Facebook App"** dropdown → 選 `EBTCM Auto Poster`
3. **"User or Page"** dropdown → 選 **"User Token"**
4. 點 **"Generate Access Token"** 旁邊的 **"Add a Permission"**
5. 加入這三個權限：
   - `pages_show_list` ✅
   - `pages_manage_posts` ✅
   - `pages_read_engagement` ✅
6. 點 **"Generate Access Token"** → 彈出視窗中允許
7. 上方輸入框出現一串很長的 token — **複製整串**（會以 `EAAB...` 開頭）

⚠ 這個 token 1-2 小時後就會過期 — 馬上做下一步。

---

## 步驟 5：把短期 token 轉成永久 Page Access Token（1 分鐘）

在你的專案根目錄執行：

```bash
npx tsx scripts/extend-fb-token.ts <你剛複製的長 token>
```

例如：
```bash
npx tsx scripts/extend-fb-token.ts EAABwzLixnjY...很長很長
```

成功會印出：

```
✅ Long-lived Page Access Token:
EAAB...另一串很長的 token

Paste this into .env as:
FB_PAGE_ACCESS_TOKEN="..."

This token does NOT expire (unless you revoke permissions).
```

把這個 **新的長期 token** 貼進 `.env` 取代步驟 3 留下的空白。

---

## 步驟 6：驗證設定成功（10 秒）

```bash
npx tsx scripts/post-fb.ts --verify
```

預期輸出：
```
✅ Page: 實證中醫 EBTCM
```

如果看到錯誤：
- `HTTP 400` → token 不對，重做步驟 4-5
- `HTTP 403` → 權限不足，確認步驟 4 的 3 個 permission 都勾選
- `not_id_in_response` → Page ID 錯，回步驟 2

---

## 步驟 7：第一次測試發文（5 分鐘）

**先在你的 Page 設定為 "Only me visible" 模式**，或建一個 test post，避免測試貼文出現在粉絲動態。

### 7a. 渲染海報（一次性）

```bash
# 渲染所有 SVG → PNG
npx tsx scripts/render-svg-to-png.ts
```

（前提：你已在 `marketing/cmarketplan/facebook-posts/week-1/rendered/` 放好客製化 SVG，或編輯模板後另存到該位置。）

### 7b. Dry-run（不真的發）

```bash
npx tsx scripts/post-fb.ts marketing/cmarketplan/facebook-posts/week-1/01-mon-origin.md
```

看到 `[dry-run] add --apply to actually post` 表示一切正常。

### 7c. 真的發一篇（不排程，立即發）

```bash
npx tsx scripts/post-fb.ts marketing/cmarketplan/facebook-posts/week-1/01-mon-origin.md --apply
```

預期看到：
```
   ✓ PUBLISHED — fb_post_id=987654321098765_111222333
     https://www.facebook.com/987654321098765_111222333
```

開 FB 確認貼文上線。

### 7d. 排程發文（推薦做法）

```bash
npx tsx scripts/post-fb.ts marketing/cmarketplan/facebook-posts/week-1/01-mon-origin.md \
  --apply --schedule="2026-05-19 09:00"
```

⚠ FB 規定排程時間必須至少 **10 分鐘後**，最遠 **6 個月內**。

### 7e. 批次排程整週

```bash
npx tsx scripts/post-fb.ts --batch=week-1 --apply --start="2026-05-19"
```

自動依檔名（`01-mon-*` / `02-tue-*` …）配對 HKT 預設時段：
- Mon 09:00 · Tue 17:00 · Wed 20:00 · Thu 19:30 · Fri 12:30 · Sat 10:00

---

## 步驟 8：在 `/admin/fb-scheduler` 查看狀態

啟動 dev server：
```bash
npm run dev
```

開 http://localhost:4343/admin/fb-scheduler

你會看到：
- 24 篇 markdown 貼文列表
- 每篇的 DRAFT / SCHEDULED / PUBLISHED / FAILED 狀態
- FB 連結（已發布的）
- 「Schedule all」/「Cancel」按鈕

---

## 常見問題

### Q: Token 之後會失效嗎？

A: **不會**，前提是：
- 你沒有取消授權給 App
- 你的 FB 帳號沒有更改密碼或被 FB 標記異常
- App 沒有違反 FB 政策被禁

如果失效（極罕見），重做步驟 4-5 就好。

### Q: 我可以同時管理多個 FB Page 嗎？

A: 可以。把第二個 Page 的 Page Access Token 存為 `FB_PAGE_ACCESS_TOKEN_2`、`FB_PAGE_ID_2`，並改 `post-fb.ts` 接受 `--page=2` 參數。

### Q: 達到 FB API 速率上限怎辦？

A: FB 對 Page posting 的限制：**每小時 200 次 / 每日 1,000 次**。一天 24 篇貼文完全不會碰到。如果未來規模化才會考慮。

### Q: App Review 何時需要？

A: 只有當你要：
- 發文到**其他人的 Page**（代理發文業務）
- 公開分發這個 App 給其他 EBTCM 使用者
- 啟用某些進階權限（Insights API、Messenger）

僅自己用，**永遠不需要 App Review**。

### Q: 我的 FB Page 違反政策被封了怎辦？

A: API 自動發布不會增加 Page 被封風險，只要：
- 不發垃圾訊息
- 不假冒
- 不違反 Community Standards

EBTCM 的衛教內容是 FB 樂見的健康類內容。

---

## 完整命令小抄

```bash
# 一次性設定
npx tsx scripts/extend-fb-token.ts <SHORT_TOKEN>      # token 轉長期
npx tsx scripts/post-fb.ts --verify                   # 驗證設定

# 渲染海報
npx tsx scripts/render-svg-to-png.ts                  # 全部
npx tsx scripts/render-svg-to-png.ts --week=1         # 單週
npx tsx scripts/render-svg-to-png.ts --file=path.svg  # 單檔

# 發文
npx tsx scripts/post-fb.ts <md>                       # dry-run
npx tsx scripts/post-fb.ts <md> --apply               # 立即發
npx tsx scripts/post-fb.ts <md> --apply --schedule="2026-05-19 09:00"   # 排程
npx tsx scripts/post-fb.ts --batch=week-1 --apply --start="2026-05-19"  # 批次

# Admin UI
npm run dev
# 開 http://localhost:4343/admin/fb-scheduler
```

設定完成後，每週發文流程：

1. **週日下午（30 分鐘）**：編輯下週 6 篇 markdown + 海報文字
2. **`npx tsx scripts/render-svg-to-png.ts --week=N`** — 渲染海報
3. **`npx tsx scripts/post-fb.ts --batch=week-N --apply --start="..."`** — 批次排程
4. **接下來 7 天 FB 自動發布** — 你只需回覆留言

從 30 分鐘/天 → 30 分鐘/週。
