# Week 1 — Image specs

## Image A · Monday post — Origin hero image

**Format**: 1200×627 (LinkedIn share-card)

**Option 1 (recommended)**: A real screenshot.

- Open `/interactions` on your dev server.
- Add herb "丹參 (Dan Shen)" + drug "Warfarin".
- The result shows a MAJOR severity red card with mechanism + management.
- Crop to show: the input chips at top (showing 丹參 + Warfarin selected) and the red-bordered interaction result.
- Add a thin caption strip at the bottom: "EvidenceBasedTCM.com — free, no login"
- Export at 1200×627.

This is more powerful than any stock photo. It IS the platform.

**Option 2 (illustration backup if Option 1 isn't ready)**:
- Midjourney prompt:
  > Editorial illustration of a doctor's hand holding a paper prescription, with traditional Chinese medicine herbs (ginseng, ginkgo) overlapping with a Western pill bottle on a clinical desk. Flat illustration style, muted clinical palette of teal, sage green, ivory. Minimal, professional, no faces. --ar 1200:627 --v 6 --style raw
- Or DALL-E 3:
  > "Flat editorial illustration, clinical desk top-down view. Left half: traditional Chinese herbs in small glass jars (ginseng, ginkgo leaves, dried red dates). Right half: amber prescription pill bottle and a folded prescription paper. Color palette: emerald green, sage, ivory. Minimal, clean, no people, no text. 1200x627."

---

## Carousel A · Thursday post — 10-slide PDF

**Format**: 1080×1080 per slide, exported as a single PDF (LinkedIn auto-converts to a swipeable carousel).
**Tool**: Canva → "Document → A4" → resize to 1080×1080 → 10 pages → export PDF.

### Universal slide template

- **Background**: ivory `#fefce8` (warm white, friendlier than pure white in clinical contexts)
- **Text**: slate `#0f172a` for body, emerald `#10b981` for accents
- **Footer (every slide)**: small EBTCM wordmark + "evidencebasedtcm.com" bottom-left, slide number bottom-right (e.g. "3 / 10")
- **Font**: Inter or Source Han Sans for zh chars

### Slide 1 — Cover

Layout:
```
┌─────────────────────────────────────┐
│                                     │
│        8 herb-drug interactions     │
│        HK clinicians keep missing   │
│                                     │
│        Cochrane-graded · 2026       │
│                                     │
│        [Swipe →]                    │
│                                     │
│        EBTCM ·  evidencebasedtcm.com│
└─────────────────────────────────────┘
```

Big bold title, lots of negative space. No decorative graphics needed on the cover.

### Slide 2 — Legend

```
HOW TO READ THIS

🔴 MAJOR
   Hard avoid. Reported serious clinical harm.

🟠 MODERATE
   Use with caution; monitor labs / clinical signs.

🟡 MINOR
   Theoretical or low-incidence concern.

Grades: Cochrane RoB-2 + GRADE
"Not listed" ≠ safe combination.
```

### Slides 3–9 — Interaction cards (one per slide)

Template per slide:

```
┌─────────────────────────────────────┐
│  🔴  MAJOR                          │
│                                     │
│  丹參  ×  Warfarin                  │
│  Dan Shen                           │
│                                     │
│  ─────────────────                  │
│                                     │
│  MECHANISM                          │
│  Antiplatelet + ↑ INR               │
│                                     │
│  CLINICAL EFFECT                    │
│  Major bleeding risk —              │
│  GI + intracranial reported         │
│                                     │
│  MANAGEMENT                         │
│  Avoid combination.                 │
│  If used, INR weekly.               │
│                                     │
│  ─────────────────                  │
│  Evidence: 3 RCT, 2 case series     │
└─────────────────────────────────────┘
```

The severity badge (top left) changes color per slide:
- Slides 3, 4, 5, 6 → red `#dc2626`
- Slides 7, 8, 9 → orange `#ea580c`

### Slide 10 — CTA

```
┌─────────────────────────────────────┐
│                                     │
│        Full searchable checker      │
│                                     │
│        ┌────────────┐               │
│        │   QR code  │               │
│        └────────────┘               │
│                                     │
│        evidencebasedtcm.com/        │
│        interactions                 │
│                                     │
│        Free · No login · No paywall │
│                                     │
└─────────────────────────────────────┘
```

Generate QR: https://qr.io or https://www.qr-code-generator.com → target `https://evidencebasedtcm.com/interactions` → download SVG.

### Production tip

Build slide 3 once, then **duplicate page** in Canva and swap herb/drug/severity color. Don't rebuild from scratch each time. The 10-slide deck should take ~90 min total.
