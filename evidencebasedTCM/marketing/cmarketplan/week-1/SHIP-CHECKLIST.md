# 第 1 週 — 發布檢查清單

下方所有材料皆已建造或寫好。你的工作只剩組裝 + 貼文。

## 週日（1 小時）— 準備

- [ ] 啟動開發伺服器：`npm run dev`（port 4343）
- [ ] 另開終端機執行：`npx tsx scripts/screenshot-marketing.ts`
  - 會於 `marketing/week-1/images/` 產出 4 張 PNG
  - 若交互查詢截圖失敗（autocomplete selector 不符），手動開啟 `http://localhost:4343/interactions`，輸入「Dan Shen」、點選建議、輸入「warfarin」、點選建議，再用 Snipping Tool 手動裁切 1200×627。
- [ ] 開啟 `http://localhost:4343/cheatsheet/herb-drug-2026/preview` → 點「列印」 → 儲存為 PDF → 存到 `marketing/week-1/cheatsheet-2026-05.pdf`。這就是你的線索磁鐵。
- [ ] 開啟 `http://localhost:4343/marketing/carousel-week1` → 點「列印」 → 紙張大小設 210×210 mm 或 A4 直印、邊距**無**、背景圖形**開啟** → 儲存為 PDF → 存到 `marketing/week-1/linkedin-carousel.pdf`。
- [ ] 決定 LinkedIn 釘選貼文 — 第 1 週週一將釘選 14 日。先取消目前釘選的內容。

## 週一 — 發文日（15 分鐘）

### HK 時間 8:30 — 發布週一 LinkedIn

1. 開啟 `marketing/zh-Hant/week-1/mon-linkedin.md` → 複製內文段落。
2. 貼到 LinkedIn → 附上圖片 `01-checker-danshen-warfarin.png`。
3. **立即**補上第一則留言（連結到 `/interactions` + `/cheatsheet/herb-drug-2026`）。
4. 釘選貼文至個人檔案（貼文三點選單 → Featured）。

### 當天

- [ ] 前 6 小時內回覆每則留言。
- [ ] 私訊 5 位特定中醫師 + 3 位家庭醫學科醫師。不要複製貼上 — 每則訊息首句個人化。
- [ ] 每 2 小時檢查電郵訂閱者。對每位訂閱者親自回覆（「謝謝你訂閱 — 如果有特定的交互作用想加入資料庫，直接回覆就好。」）

## 週四 — 輪播日（15 分鐘）

### HK 時間 8:30 — 發布週四輪播

1. 開啟 `marketing/zh-Hant/week-1/thu-linkedin.md` → 複製內文段落。
2. **建立 Document Post**（不是一般貼文）→ 上傳 `linkedin-carousel.pdf` → 10 張投影片會顯示為可滑動的文件。
3. 貼上內文 → 發布。
4. 第一則留言補上同樣的兩個連結。

### 當天

- [ ] 同樣的互動循環。
- [ ] 私訊週一已聯絡的 8 位，問：「我今天做了這個輪播 — 從你的臨床經驗看，缺甚麼？」
- [ ] 週五早上看 LinkedIn 分析，**記下哪張投影片瀏覽量最高** — 那是你下一篇要寫甚麼的提示。

## 週末 — 成效檢視（週日 10 分鐘）

開啟 `marketing/zh-Hant/README.md` 的成效追蹤表。填入：

| 指標 | 目標 | 實際 |
|------|------|------|
| LinkedIn 追蹤者增加 | +10 | ___ |
| 電郵訂閱者 | 5 | ___ |
| `/interactions` 不重複訪客 | 30 | ___ |
| 收到的 DM | 3 | ___ |
| 由本週貼文預約的示範 | 1 | ___ |

若任一數字 < 目標的 50%，常見診斷：
- 發文時段錯誤（試 HK 7:30 全球向、或 HK 11:30 東南亞向）
- 貼文太長（砍掉 30%）
- 第一則留言沒附平台連結（LinkedIn 會降權內文連結，但獎勵留言連結）

---

## 你現在 EBTCM 內已建好甚麼

### Routes
- **`/cheatsheet/herb-drug-2026`** — 含電郵捕獲表單的著陸頁
- **`/cheatsheet/herb-drug-2026/preview`** — 可列印的 6 頁 A4 速查表（**線索磁鐵本身** — 用瀏覽器列印）
- **`/marketing/carousel-week1`** — 10 張投影片的 LinkedIn 輪播（可列印為 10 頁 PDF）
- **`/api/cheatsheet/subscribe`** — POST 端點，將電郵寫入新的 `EmailSubscriber` 資料表

### 資料庫
- **`EmailSubscriber` 資料表** — 儲存電郵 + 職業 + 語言 + 來源。查詢：`prisma.emailSubscriber.findMany({ where: { source: 'cheatsheet-herb-drug-2026' } })`。

### 組件
- `SubscribeForm`（`src/components/marketing/SubscribeForm.tsx`）
- `PrintButton`（`src/components/marketing/PrintButton.tsx`）

### 資料
- `cheatsheet-data.ts`（`src/lib/marketing/cheatsheet-data.ts`） — 22 條中藥-西藥組合 + 6 條妊娠禁忌，按西藥分類分組。編輯此檔可新增/移除條目；速查表預覽與輪播均由此檔渲染。

### 腳本
- `npx tsx scripts/screenshot-marketing.ts` — Playwright 自動截圖

## 沒做的部分（刻意，之後做）

- **Resend / Mailgun 寄送 PDF 附件** — 訂閱端點目前只寫入資料庫，不自動寄送。使用者立即在螢幕上看到完整速查表（`/preview` 頁面），功能等效。設定電郵服務後在 `src/app/api/cheatsheet/subscribe/route.ts` 的 `deliverCheatSheetEmail()` 補上實作。
- **靜態 PDF 資產** — 速查表目前是 HTML 在瀏覽器即時列印。若想要可下載的 `/cheatsheet-2026-05.pdf` URL，週日用上述列印流程產生一次，存到 `public/cheatsheet-2026-05.pdf`，然後在著陸頁加直接下載連結。
- **訂閱者匯出** — 當有 25+ 訂閱者時，寫個小腳本：`prisma.emailSubscriber.findMany().then(...)` → CSV → 匯入 Substack。
