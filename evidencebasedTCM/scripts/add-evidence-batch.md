# Adding Evidence Batches Daily

## Quick Guide

To add a new batch of evidence entries:

1. Open `prisma/seeds/evidence.ts`
2. Find the last `] as const;` for `evidenceData` array
3. Add new entries before it, incrementing the index
4. Add corresponding links before the last `] as const;` for `evidenceLinkData`
5. Run `npx next build` to verify

## Current Stats
- **232 evidence entries** (index 0–231)
- **285 evidence-entity links**
- Next batch should start at index **232**

## Evidence Entry Template

```typescript
{
  title: "標題（繁體中文）",
  studyType: "META_ANALYSIS", // or SYSTEMATIC_REVIEW, RCT, COHORT, CASE_CONTROL, CASE_SERIES, CASE_REPORT, EXPERT_OPINION, TRADITIONAL_USE
  evidenceLevel: "LEVEL_2A", // LEVEL_1A, LEVEL_1B, LEVEL_2A, LEVEL_2B, LEVEL_3A, LEVEL_3B, LEVEL_4, LEVEL_5
  evidenceGrade: "B", // A, B, C, D
  authors: "Author A, Author B et al.",
  journal: "Journal Name",
  year: 2025,
  doi: "10.xxxx/xxxxx",
  pubmedId: "12345678",
  abstract: "摘要（繁體中文）",
  summary: "一句話總結（繁體中文）",
  sampleSize: 500, // or null
  population: "目標人群（繁體中文）",
  intervention: "干預措施（繁體中文）",
  comparator: "對照措施（繁體中文）",
  primaryOutcome: "主要結局指標（繁體中文）",
  resultsSummary: "結果摘要（繁體中文）",
  riskOfBias: "SOME_CONCERNS", // LOW, SOME_CONCERNS, HIGH, or null
  qualityScore: 0.65, // 0-1, or null
  qualityTool: "Cochrane RoB 2", // or "GRADE", "AMSTAR 2", "Jadad Scale", "NOS", null
  status: "PUBLISHED",
},
```

## Evidence Link Template

```typescript
// Herb link
{ evidenceIndex: 232, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
// Formula link
{ evidenceIndex: 232, formulaPinyin: "Bu Zhong Yi Qi Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
// Acupoint link
{ evidenceIndex: 232, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
// Pattern link
{ evidenceIndex: 232, patternPinyin: "Pi Qi Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
```

## Source Journals to Monitor

1. **Journal of Traditional Chinese Medicine** (ISSN 0255-2922) — http://journaltcm.cn
2. **Journal of Traditional Chinese Medical Sciences** — ScienceDirect
3. **Evidence-Based Complementary and Alternative Medicine** — Hindawi
4. **Chinese Medicine** — BioMed Central
5. **Journal of Ethnopharmacology** — Elsevier
6. **Phytomedicine** — Elsevier
7. **Frontiers in Pharmacology** — Frontiers
8. **Cochrane Database of Systematic Reviews**
9. **JAMA / JAMA Internal Medicine / JAMA Network Open**
10. **Annals of Internal Medicine**
11. **BMJ / BMJ Open**
12. **PubMed Central (PMC)**

## Available Herb Names for Linking
Huang Qi, Ren Shen, Dang Shen, Bai Zhu, Shan Yao, Gan Cao, Da Zao, Dang Gui, Shu Di Huang, Bai Shao, Chuan Xiong, He Shou Wu, Long Yan Rou, Gou Qi Zi, Mai Dong, Sha Shen, Yu Zhu, Shi Hu, Lu Rong, Du Zhong, Rou Cong Rong, Tu Si Zi, Rou Gui, Fu Zi, Gan Jiang, Wu Zhu Yu, Ma Huang, Gui Zhi, Zi Su Ye, Jing Jie, Fang Feng, Qiang Huo, Bo He, Chai Hu, Ge Gen, Huang Qin, Huang Lian, Huang Bai, Zhi Zi, Jin Yin Hua, Lian Qiao, Ban Lan Gen, Da Huang, Mang Xiao, Fan Xie Ye, Dan Shen, Hong Hua, San Qi, Ban Xia

## Available Formula Names for Linking
Bu Zhong Yi Qi Tang, Liu Wei Di Huang Wan, Si Jun Zi Tang, Si Wu Tang, Ba Zhen Tang, Xiao Yao San, Gui Pi Tang, Suan Zao Ren Tang, Tian Wang Bu Xin Dan, Xiao Chai Hu Tang, Ban Xia Xie Xin Tang, Yin Qiao San, Ma Xing Shi Gan Tang, Gui Zhi Tang, Du Huo Ji Sheng Tang, Er Chen Tang, Liu Jun Zi Tang, Sheng Mai San, Bu Yang Huan Wu Tang, Huang Lian Jie Du Tang

## Available Acupoint Codes for Linking
LI4, ST36, SP6, LR3, PC6, LU7, KI3, HT7, GB34, BL23, GV20, CV4, CV6, ST25, BL20, GB20, LI11, ST40, SP9, SP10, CV12, BL40, LU9, BL67, GV4, GV14, LR14, BL12, BL13, BL15
