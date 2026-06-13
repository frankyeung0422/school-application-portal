/**
 * Curated glossary of common TCM terms for the English UI. Used by
 * <TermPopover term="肝氣鬱結" /> to display an English gloss + concise
 * 1-line explanation on hover/tap.
 *
 * Keep entries brief — TermPopover is for orientation, not deep dives.
 */

export interface GlossaryEntry {
  pinyin: string;
  english: string;
  description: string; // 1 sentence, plain language
}

export const TCM_GLOSSARY: Record<string, GlossaryEntry> = {
  // ── Patterns / 證型 ──
  "肝氣鬱結": { pinyin: "Gan Qi Yu Jie", english: "Liver Qi Stagnation",
    description: "Stress / emotional pattern: irritability, sighing, distended chest/sides, irregular menses." },
  "肝鬱": { pinyin: "Gan Yu", english: "Liver Stagnation (short)",
    description: "Shorthand for Liver Qi Stagnation — emotional / digestive disharmony pattern." },
  "脾氣虛": { pinyin: "Pi Qi Xu", english: "Spleen Qi Deficiency",
    description: "Digestive weakness: poor appetite, bloating, loose stool, fatigue, pale tongue with teeth marks." },
  "肺氣虛": { pinyin: "Fei Qi Xu", english: "Lung Qi Deficiency",
    description: "Weak immunity + breath: shortness of breath, easy sweating, frequent colds, low voice." },
  "腎陰虛": { pinyin: "Shen Yin Xu", english: "Kidney Yin Deficiency",
    description: "Depleted essence-fluid: night sweats, hot flashes, low back ache, tinnitus, red tongue scant coat." },
  "腎陽虛": { pinyin: "Shen Yang Xu", english: "Kidney Yang Deficiency",
    description: "Depleted warming function: cold limbs, low libido, nocturia, lumbar coldness, pale puffy tongue." },
  "心血虛": { pinyin: "Xin Xue Xu", english: "Heart Blood Deficiency",
    description: "Insomnia, palpitations, poor memory, pale complexion, light periods." },
  "氣血兩虛": { pinyin: "Qi Xue Liang Xu", english: "Qi and Blood Deficiency",
    description: "Combined fatigue + pallor: dizziness, palpitations, light menses, dull pale complexion." },
  "痰濕內阻": { pinyin: "Tan Shi Nei Zu", english: "Phlegm-Dampness",
    description: "Damp accumulation: heaviness, fullness, nausea, greasy tongue coat, slippery pulse." },
  "血瘀": { pinyin: "Xue Yu", english: "Blood Stasis",
    description: "Stagnant circulation: fixed sharp pain, dark/dusky complexion, purple tongue, dark menses with clots." },
  "濕熱": { pinyin: "Shi Re", english: "Damp-Heat",
    description: "Damp + heat: yellow greasy coat, bitter mouth, scanty dark urine, sticky stool, skin eruptions." },
  "風熱": { pinyin: "Feng Re", english: "Wind-Heat",
    description: "Acute warm pattern: sore throat, fever, yellow phlegm, red tongue tip — Yin Qiao San territory." },
  "風寒": { pinyin: "Feng Han", english: "Wind-Cold",
    description: "Acute cold pattern: chills > fever, clear runny nose, body aches, thin white coat — Gui Zhi Tang territory." },
  "心腎不交": { pinyin: "Xin Shen Bu Jiao", english: "Heart-Kidney Disharmony",
    description: "Upper heat + lower deficiency: insomnia, palpitations, night sweats, low back ache." },
  "肝脾不和": { pinyin: "Gan Pi Bu He", english: "Liver-Spleen Disharmony",
    description: "Stress disrupts digestion: alternating constipation/diarrhea, bloating worse with emotional stress." },
  "肝腎陰虛": { pinyin: "Gan Shen Yin Xu", english: "Liver-Kidney Yin Deficiency",
    description: "Combined Yin depletion: dry eyes, dizziness, tinnitus, low back ache, night sweats." },
  "氣滯": { pinyin: "Qi Zhi", english: "Qi Stagnation",
    description: "Movement-of-energy blocked: distention, hiccups, sighing, mood-related symptoms." },

  // ── Concepts ──
  "氣": { pinyin: "Qi", english: "Qi (vital energy)",
    description: "Functional life-force concept; deficiency manifests as fatigue, stagnation as distention." },
  "血": { pinyin: "Xue", english: "Blood (TCM)",
    description: "Nourishing-fluid concept overlapping but broader than Western 'blood' — includes nutrient-rich body fluids." },
  "陰陽": { pinyin: "Yin Yang", english: "Yin-Yang",
    description: "Complementary opposites framework: Yin = cool/material/inward, Yang = warm/functional/outward." },
  "津液": { pinyin: "Jin Ye", english: "Body Fluids",
    description: "All physiological fluids — saliva, sweat, tears, joint fluid, etc." },
  "精": { pinyin: "Jing", english: "Essence",
    description: "Reproductive + constitutional reserve, stored by Kidneys." },
  "神": { pinyin: "Shen", english: "Shen (mind/spirit)",
    description: "Mental-emotional-conscious aspect, housed by Heart." },
  "經絡": { pinyin: "Jing Luo", english: "Meridians",
    description: "Energy-channel network used for acupuncture point relationships and treatment principles." },

  // ── Four exams ──
  "四診": { pinyin: "Si Zhen", english: "Four Examinations",
    description: "TCM diagnostic framework: 望 inspection, 聞 auscultation/olfaction, 問 inquiry, 切 palpation (incl. pulse)." },
  "望診": { pinyin: "Wang Zhen", english: "Inspection",
    description: "Visual exam: face, body, posture, tongue (body, coat, shape)." },
  "聞診": { pinyin: "Wen Zhen", english: "Auscultation & Olfaction",
    description: "Listening (voice, cough, breath) and smelling (breath, body)." },
  "問診": { pinyin: "Wen Zhen (inquiry)", english: "Inquiry",
    description: "History-taking: 10 questions covering temperature, sweat, head/body, GI, urination, sleep, etc." },
  "切診": { pinyin: "Qie Zhen", english: "Palpation",
    description: "Pulse + body palpation. Pulse: 3 positions × 3 depths × both wrists." },
  "舌診": { pinyin: "She Zhen", english: "Tongue Examination",
    description: "Tongue body (color, shape) + coat (color, thickness, distribution) — central in pattern diagnosis." },
  "脈診": { pinyin: "Mai Zhen", english: "Pulse Examination",
    description: "Both wrists; cun-guan-chi positions correspond to different organs and depths." },

  // ── Treatment principles ──
  "辨證論治": { pinyin: "Bian Zheng Lun Zhi", english: "Pattern Differentiation & Treatment",
    description: "Core TCM principle: identify the underlying pattern first, then prescribe accordingly." },
  "君臣佐使": { pinyin: "Jun Chen Zuo Shi", english: "Sovereign-Minister-Assistant-Envoy",
    description: "Hierarchical formula construction: lead herb, supporting herbs, assistants, harmonizers." },
  "寒熱": { pinyin: "Han Re", english: "Cold-Heat (temperament axis)",
    description: "One of the 8 principles. Patterns and herbs are classified along a cold↔heat axis." },
  "虛實": { pinyin: "Xu Shi", english: "Deficiency-Excess",
    description: "Distinguishes weakness states (tonify) from excess states (clear/reduce)." },
  "表裏": { pinyin: "Biao Li", english: "Exterior-Interior",
    description: "Depth of disease: 表 = surface (cold/flu), 裏 = internal (organ disease)." },
};

export function lookup(term: string): GlossaryEntry | undefined {
  return TCM_GLOSSARY[term];
}
