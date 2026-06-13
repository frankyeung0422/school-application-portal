# 第 1 週 — 圖片規格

## Image A · 週一貼文主視覺

**格式**：1200×627（LinkedIn 連結卡尺寸）

**選項 1（建議）**：真實截圖。

- 在開發伺服器開啟 `/interactions`。
- 加入中藥「丹參 (Dan Shen)」+ 西藥「Warfarin」。
- 結果會顯示紅色邊框 MAJOR 警示卡，附機轉 + 處置建議。
- 裁切顯示：頂部已選的藥材標籤（丹參 + Warfarin）+ 紅邊交互結果。
- 底部加一條細字 caption：「EvidenceBasedTCM.com — 免費、免登入」
- 匯出 1200×627。

這比任何 stock photo 都有力。**它就是平台本身。**

**選項 2（插畫替代）**：
- Midjourney 提示詞：
  > Editorial illustration of a doctor's hand holding a paper prescription, with traditional Chinese medicine herbs (ginseng, ginkgo) overlapping with a Western pill bottle on a clinical desk. Flat illustration style, muted clinical palette of teal, sage green, ivory. Minimal, professional, no faces. --ar 1200:627 --v 6 --style raw
- 或 DALL-E 3：
  > 「平面編輯插畫，臨床桌面俯視。左半：傳統中藥於小玻璃罐（人參、銀杏葉、紅棗乾）。右半：琥珀色處方藥瓶與折起的處方箋。色調：翠綠、鼠尾草綠、象牙白。簡潔、乾淨、無人物、無文字。1200x627。」

---

## Carousel A · 週四貼文 10 張 PDF 輪播

**格式**：每張 1080×1080，匯出單一 PDF（LinkedIn 會自動轉成可滑動輪播）。
**工具**：Canva → 「Document → A4」→ 調整為 1080×1080 → 10 頁 → 匯出 PDF。

### 通用投影片模板

- **背景**：象牙白 `#fefce8`（在臨床語境比純白更友善）
- **文字**：石板深色 `#0f172a` 為主，翠綠 `#10b981` 為重點
- **頁尾（每張投影片）**：左下小字 EBTCM logo + 「evidencebasedtcm.com」，右下投影片頁碼（如「3 / 10」）
- **字型**：Inter 或 Source Han Sans 給中文字

### 第 1 張 — 封面

排版：
```
┌─────────────────────────────────────┐
│                                     │
│        8 條香港臨床漏網的            │
│        中藥-西藥交互                 │
│                                     │
│        Cochrane 評級 · 2026          │
│                                     │
│        [向左滑 →]                   │
│                                     │
│        EBTCM · evidencebasedtcm.com │
└─────────────────────────────────────┘
```

大標題、大量留白。封面不需要裝飾性圖案。

### 第 2 張 — 圖例

```
如何閱讀本輪播

🔴 MAJOR
   絕對避免。已報告嚴重臨床傷害。

🟠 MODERATE
   謹慎使用；監測檢驗值或臨床指標。

🟡 MINOR
   理論性或低發生率風險。

評級：Cochrane RoB-2 + GRADE
「未列出」≠ 安全。
```

### 第 3–9 張 — 交互卡（每張一條）

每張投影片模板：

```
┌─────────────────────────────────────┐
│  🔴  MAJOR                          │
│                                     │
│  丹參  ×  Warfarin                  │
│  Dan Shen                           │
│                                     │
│  ─────────────────                  │
│                                     │
│  機轉 MECHANISM                     │
│  抗血小板 + ↑ INR                   │
│                                     │
│  臨床效應 CLINICAL EFFECT           │
│  嚴重出血風險 —                     │
│  消化道、顱內已報告                 │
│                                     │
│  處置 MANAGEMENT                    │
│  避免合用。                         │
│  如使用每週監測 INR。               │
│                                     │
│  ─────────────────                  │
│  證據：3 RCT、2 系列病例            │
└─────────────────────────────────────┘
```

嚴重度色碼徽章（左上）隨投影片變色：
- 第 3、4、5、6 張 → 紅色 `#dc2626`
- 第 7、8、9 張 → 橙色 `#ea580c`

### 第 10 張 — 行動呼籲

```
┌─────────────────────────────────────┐
│                                     │
│        完整互動式查詢               │
│                                     │
│        ┌────────────┐               │
│        │   QR code  │               │
│        └────────────┘               │
│                                     │
│        evidencebasedtcm.com/        │
│        interactions                 │
│                                     │
│        免費 · 免登入 · 免付費       │
│                                     │
└─────────────────────────────────────┘
```

QR 產生：https://qr.io 或 https://www.qr-code-generator.com → 目標 `https://evidencebasedtcm.com/interactions` → 下載 SVG。

### 製作小訣竅

在 Canva 做好第 3 張，然後**複製頁面**，每張換中藥/西藥/嚴重度色碼即可。不要每張從頭做。10 張投影片總共應約 90 分鐘搞定。
