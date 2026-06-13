# Lead Magnet — 中藥-西藥交互作用速查表 / Herb-Drug Interaction Quick Reference

**Format**: A4 bilingual PDF, 6 pages. Free download in exchange for an email.

**Hosted at**: `/cheatsheet/herb-drug-2026` (build a simple landing route in EBTCM with email capture → triggers PDF email)

**Design tool**: Canva → Pro template "Healthcare Reference Card" or build in Figma. Keep it print-friendly (no dark backgrounds).

---

## Page 1 — Cover

**Title (zh)**: 中藥-西藥交互作用速查表
**Subtitle (zh)**: 香港臨床醫師參考 · 2026 年 5 月版

**Title (en)**: Herb-Drug Interaction Quick Reference
**Subtitle (en)**: For the Modern Hong Kong Clinic · May 2026 Edition

Footer:
> Curated from 707 GRADE-rated evidence entries on EvidenceBasedTCM.com
> Free, no login required — start at `/interactions`

Photo: stack of 中藥 boxes next to a Western pill bottle on a clinical desk. Neutral lighting. (Avoid pharmacy-stock-photo cliché.)

---

## Page 2 — Methodology

A half-page primer:
- We catalogued 50+ herb-drug interactions from PubMed RCTs + meta-analyses, scored against the Cochrane RoB 2 + GRADE frameworks.
- Severity grades follow the Stockley convention: **MAJOR / MODERATE / MINOR / THEORETICAL**.
- Each entry lists: mechanism, clinical effect, management.
- "Not listed" ≠ "safe" — see disclaimer at end.

Visual: a tiny pyramid showing Evidence Level 1A through Level 5.

---

## Pages 3–5 — The 25 most clinically significant pairs

Table format, color-coded by severity. **Group by drug class** (clinicians scan that way).

### Group 1: Anticoagulants / Antiplatelets (the most-asked category)

| Herb | Drug | Severity | Mechanism | Management |
|------|------|----------|-----------|------------|
| 丹參 Dan Shen | Warfarin | 🔴 MAJOR | Antiplatelet + ↑ INR | Avoid combo; if used, monitor INR weekly |
| 銀杏葉 Yin Xing Ye | Warfarin / Aspirin | 🔴 MAJOR | Platelet aggregation inhibition | Discontinue 7 days pre-op |
| 當歸 Dang Gui | Warfarin | 🟠 MODERATE | ↑ INR, mechanism uncertain | Monitor INR if combined |
| 三七 San Qi | Warfarin / Antiplatelets | 🟠 MODERATE | Bidirectional clotting modulation | Avoid in patients on chronic anticoagulation |
| 大蒜 Da Suan (high dose) | Warfarin / Aspirin | 🟠 MODERATE | ↑ Bleeding time | Culinary doses safe; supplements risky |

### Group 2: CYP3A4 / Substrate-altering

| Herb | Drug | Severity | Mechanism | Management |
|------|------|----------|-----------|------------|
| 貫葉連翹 (St John's Wort) | Tacrolimus / Cyclosporine / Warfarin / SSRIs | 🔴 MAJOR | Potent CYP3A4 + P-gp inducer → ↓ levels | Hard avoid in transplant patients |
| 五味子 Wu Wei Zi | Tacrolimus | 🟠 MODERATE | CYP3A4 inhibition → ↑ levels | Dose-adjust under TDM |
| 甘草 Gan Cao (high dose) | Digoxin, Antihypertensives | 🟠 MODERATE | Pseudo-aldosteronism, hypokalemia | Limit to < 5g/day if on these meds |

### Group 3: Glycemic / Antidiabetic

| Herb | Drug | Severity | Mechanism | Management |
|------|------|----------|-----------|------------|
| 黃連 Huang Lian (berberine) | Metformin / Sulfonylureas / Insulin | 🟠 MODERATE | Additive glucose lowering | Monitor glucose; reduce dose if hypoglycemia |
| 苦瓜 Ku Gua | Insulin / Sulfonylureas | 🟡 MINOR | Mild hypoglycemic | Counsel patient; monitor |
| 人參 Ren Shen | Insulin | 🟡 MINOR | Variable glycemic effect | Patient education |

### Group 4: CNS / Sedatives

| Herb | Drug | Severity | Mechanism | Management |
|------|------|----------|-----------|------------|
| 纈草 Xie Cao (Valerian) | Benzodiazepines / Zolpidem | 🟠 MODERATE | Additive CNS depression | Avoid combo |
| 酸棗仁 Suan Zao Ren | Benzodiazepines | 🟡 MINOR | Mild additive sedation | Generally safe at standard dose |
| 麻黃 Ma Huang | MAOI, Stimulants | 🔴 MAJOR | Hypertensive crisis risk | Hard contraindication; banned in many jurisdictions |

### Group 5: Hormonal / Reproductive

| Herb | Drug | Severity | Mechanism | Management |
|------|------|----------|-----------|------------|
| 大豆異黃酮 Da Dou (high dose) | Tamoxifen | 🟠 MODERATE | Phytoestrogenic interference | Avoid in ER+ breast cancer |
| 黑升麻 Hei Sheng Ma | HRT | 🟡 MINOR | Theoretical estrogenic interaction | Patient education |

### Group 6: Pregnancy contraindications (full avoidance, regardless of co-meds)

| Herb | Status | Note |
|------|--------|------|
| 紅花 Hong Hua | CONTRAINDICATED | Strong blood-mover, abortifacient |
| 桃仁 Tao Ren | CONTRAINDICATED | Blood-stasis breaker |
| 莪朮 E Zhu | CONTRAINDICATED | Strong qi-mover |
| 三棱 San Leng | CONTRAINDICATED | Blood-stasis breaker |
| 番瀉葉 Fan Xie Ye | CONTRAINDICATED | Stimulant laxative |
| 麝香 She Xiang | CONTRAINDICATED | Strong qi-mover, abortifacient |

---

## Page 6 — Use, Disclaimer, How to dig deeper

**How to use this sheet**
- Reference at point of prescribing. Bring it up before signing a herb prescription if patient is on chronic Western meds.
- Ask patients: "Are you taking any prescription medications, including supplements?" — many won't volunteer it unless asked.

**Limitations / Disclaimer**
- "Not on this list" does NOT mean "safe combination." The literature on TCM herb interactions is sparse.
- Pharmacokinetic interactions depend on dose, formulation (decoction vs. granule vs. tincture), and patient factors.
- Always integrate with clinical judgment; this is decision support, not a substitute for it.

**Dig deeper**
- Full searchable database: **evidencebasedtcm.com/interactions** (free, no login)
- Per-patient checker (with structured Western med list + auto-flag at Rx save): Pro tier from HK$XXX/mo
- Subscribe to the **EBTCM Newsletter** for case studies + new evidence as it's added: evidencebasedtcm.com/newsletter

**About the author**
- 1-paragraph bio, professional photo. Mention "Built EBTCM after [trigger story]; based in Hong Kong."

---

## Production checklist

- [ ] Write all text bilingually (zh primary, en secondary in smaller font)
- [ ] Color code: 🔴 = #dc2626 / 🟠 = #ea580c / 🟡 = #ca8a04 / 🔵 = #2563eb (theoretical)
- [ ] Cover photo (no stock-photo cliché)
- [ ] Pyramid evidence-level graphic on page 2
- [ ] Footer with platform URL + QR code linking to `/interactions` on every page
- [ ] Export as A4 PDF, optimized < 2 MB
- [ ] Build `/cheatsheet/herb-drug-2026` landing page in EBTCM with:
  - Email capture form (1 field)
  - "Send me the PDF" CTA button
  - On submit: store in `email_subscribers` table (new), email PDF as attachment via Resend / Mailgun
  - Show success state with social-share buttons
- [ ] Pinned LinkedIn post linking to the landing page
- [ ] Substack opt-in mirror

## Version cadence

Refresh every 6 months. Add a "v2026.05" tag bottom-right of cover so practitioners know it's not stale.
