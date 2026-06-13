/**
 * Curated subset of common Western medications for the public herb-drug
 * interaction checker. Each entry: generic name (RxNorm-style), drug class,
 * ATC code (when stable), common brand names, and zh name(s) for HK/TW
 * users searching by Chinese.
 *
 * Sourced from RxNav + WHO ATC, focused on drugs most likely to interact
 * with TCM herbs (anticoagulants, antihypertensives, immunosuppressants,
 * antidiabetics, CYP3A4/CYP2C9 substrates, NSAIDs, antidepressants).
 *
 * Add more as needed — this is a static dictionary, no network lookup.
 */

export interface DrugRecord {
  generic: string;       // canonical lowercase generic name
  display: string;       // display name (Title Case)
  className: string;     // therapeutic class
  atc?: string;          // ATC code
  brands?: string[];     // common brand names
  chineseNames?: string[]; // 通用 + 商品名 in Chinese
  notes?: string;        // brief warning summary
}

export const DRUGS: DrugRecord[] = [
  // ───── Anticoagulants / Antiplatelets ─────
  { generic: "warfarin", display: "Warfarin", className: "Anticoagulant", atc: "B01AA03",
    brands: ["Coumadin"], chineseNames: ["華法林"],
    notes: "Major bleeding risk with Danshen, Dang Gui, Yin Xing (ginkgo), garlic." },
  { generic: "aspirin", display: "Aspirin", className: "Antiplatelet / NSAID", atc: "N02BA01",
    chineseNames: ["阿司匹林", "阿士匹靈"] },
  { generic: "clopidogrel", display: "Clopidogrel", className: "Antiplatelet", atc: "B01AC04",
    brands: ["Plavix"], chineseNames: ["氯吡格雷", "波立維"] },
  { generic: "apixaban", display: "Apixaban", className: "DOAC", atc: "B01AF02", brands: ["Eliquis"],
    chineseNames: ["阿哌沙班"] },
  { generic: "rivaroxaban", display: "Rivaroxaban", className: "DOAC", atc: "B01AF01",
    brands: ["Xarelto"], chineseNames: ["利伐沙班"] },
  { generic: "dabigatran", display: "Dabigatran", className: "DOAC", atc: "B01AE07",
    brands: ["Pradaxa"], chineseNames: ["達比加群"] },
  { generic: "heparin", display: "Heparin", className: "Anticoagulant", atc: "B01AB01",
    chineseNames: ["肝素"] },
  { generic: "enoxaparin", display: "Enoxaparin", className: "LMWH", atc: "B01AB05",
    brands: ["Lovenox", "Clexane"], chineseNames: ["依諾肝素"] },

  // ───── Antihypertensives ─────
  { generic: "amlodipine", display: "Amlodipine", className: "Calcium channel blocker", atc: "C08CA01",
    brands: ["Norvasc"], chineseNames: ["氨氯地平", "脈優"] },
  { generic: "nifedipine", display: "Nifedipine", className: "Calcium channel blocker", atc: "C08CA05",
    chineseNames: ["硝苯地平", "心痛定"] },
  { generic: "lisinopril", display: "Lisinopril", className: "ACE inhibitor", atc: "C09AA03",
    chineseNames: ["賴諾普利"] },
  { generic: "enalapril", display: "Enalapril", className: "ACE inhibitor", atc: "C09AA02",
    chineseNames: ["依那普利"] },
  { generic: "losartan", display: "Losartan", className: "ARB", atc: "C09CA01",
    brands: ["Cozaar"], chineseNames: ["氯沙坦"] },
  { generic: "valsartan", display: "Valsartan", className: "ARB", atc: "C09CA03",
    brands: ["Diovan"], chineseNames: ["纈沙坦"] },
  { generic: "metoprolol", display: "Metoprolol", className: "Beta blocker", atc: "C07AB02",
    brands: ["Lopressor", "Toprol"], chineseNames: ["美托洛爾", "倍他樂克"] },
  { generic: "propranolol", display: "Propranolol", className: "Beta blocker", atc: "C07AA05",
    chineseNames: ["普萘洛爾"] },
  { generic: "atenolol", display: "Atenolol", className: "Beta blocker", atc: "C07AB03",
    chineseNames: ["阿替洛爾"] },
  { generic: "hydrochlorothiazide", display: "Hydrochlorothiazide", className: "Thiazide diuretic", atc: "C03AA03",
    chineseNames: ["氫氯噻嗪"] },
  { generic: "furosemide", display: "Furosemide", className: "Loop diuretic", atc: "C03CA01",
    brands: ["Lasix"], chineseNames: ["呋塞米", "速尿"] },
  { generic: "spironolactone", display: "Spironolactone", className: "K-sparing diuretic", atc: "C03DA01",
    chineseNames: ["螺內酯"] },
  { generic: "digoxin", display: "Digoxin", className: "Cardiac glycoside", atc: "C01AA05",
    chineseNames: ["地高辛"],
    notes: "Narrow therapeutic index — many herbs alter clearance." },

  // ───── Statins / Lipids ─────
  { generic: "atorvastatin", display: "Atorvastatin", className: "Statin", atc: "C10AA05",
    brands: ["Lipitor"], chineseNames: ["阿托伐他汀", "立普妥"] },
  { generic: "simvastatin", display: "Simvastatin", className: "Statin", atc: "C10AA01",
    brands: ["Zocor"], chineseNames: ["辛伐他汀"] },
  { generic: "rosuvastatin", display: "Rosuvastatin", className: "Statin", atc: "C10AA07",
    brands: ["Crestor"], chineseNames: ["瑞舒伐他汀"] },

  // ───── Antidiabetics ─────
  { generic: "metformin", display: "Metformin", className: "Biguanide", atc: "A10BA02",
    brands: ["Glucophage"], chineseNames: ["二甲雙胍"] },
  { generic: "insulin", display: "Insulin", className: "Antidiabetic", atc: "A10AB",
    chineseNames: ["胰島素"] },
  { generic: "glipizide", display: "Glipizide", className: "Sulfonylurea", atc: "A10BB07",
    chineseNames: ["格列吡嗪"] },
  { generic: "sitagliptin", display: "Sitagliptin", className: "DPP-4 inhibitor", atc: "A10BH01",
    brands: ["Januvia"], chineseNames: ["西格列汀"] },
  { generic: "empagliflozin", display: "Empagliflozin", className: "SGLT2 inhibitor", atc: "A10BK03",
    brands: ["Jardiance"], chineseNames: ["恩格列淨"] },

  // ───── NSAIDs / Analgesics ─────
  { generic: "ibuprofen", display: "Ibuprofen", className: "NSAID", atc: "M01AE01",
    brands: ["Advil", "Motrin"], chineseNames: ["布洛芬"] },
  { generic: "naproxen", display: "Naproxen", className: "NSAID", atc: "M01AE02",
    chineseNames: ["萘普生"] },
  { generic: "celecoxib", display: "Celecoxib", className: "COX-2 inhibitor", atc: "M01AH01",
    brands: ["Celebrex"], chineseNames: ["塞來昔布"] },
  { generic: "acetaminophen", display: "Acetaminophen (Paracetamol)", className: "Analgesic", atc: "N02BE01",
    brands: ["Tylenol", "Panadol"], chineseNames: ["撲熱息痛", "對乙醯氨基酚"] },
  { generic: "tramadol", display: "Tramadol", className: "Opioid analgesic", atc: "N02AX02",
    chineseNames: ["曲馬多"] },

  // ───── Antidepressants / Anxiolytics ─────
  { generic: "fluoxetine", display: "Fluoxetine", className: "SSRI", atc: "N06AB03",
    brands: ["Prozac"], chineseNames: ["氟西汀", "百憂解"] },
  { generic: "sertraline", display: "Sertraline", className: "SSRI", atc: "N06AB06",
    brands: ["Zoloft"], chineseNames: ["舍曲林"] },
  { generic: "escitalopram", display: "Escitalopram", className: "SSRI", atc: "N06AB10",
    brands: ["Lexapro"], chineseNames: ["艾司西酞普蘭"] },
  { generic: "venlafaxine", display: "Venlafaxine", className: "SNRI", atc: "N06AX16",
    brands: ["Effexor"], chineseNames: ["文拉法辛"] },
  { generic: "duloxetine", display: "Duloxetine", className: "SNRI", atc: "N06AX21",
    brands: ["Cymbalta"], chineseNames: ["度洛西汀"] },
  { generic: "alprazolam", display: "Alprazolam", className: "Benzodiazepine", atc: "N05BA12",
    brands: ["Xanax"], chineseNames: ["阿普唑侖"] },
  { generic: "lorazepam", display: "Lorazepam", className: "Benzodiazepine", atc: "N05BA06",
    brands: ["Ativan"], chineseNames: ["勞拉西泮"] },
  { generic: "diazepam", display: "Diazepam", className: "Benzodiazepine", atc: "N05BA01",
    brands: ["Valium"], chineseNames: ["地西泮"] },
  { generic: "zolpidem", display: "Zolpidem", className: "Z-drug hypnotic", atc: "N05CF02",
    brands: ["Ambien"], chineseNames: ["唑吡坦"] },

  // ───── Antiepileptics ─────
  { generic: "phenytoin", display: "Phenytoin", className: "Antiepileptic", atc: "N03AB02",
    chineseNames: ["苯妥英"] },
  { generic: "valproate", display: "Valproate", className: "Antiepileptic", atc: "N03AG01",
    brands: ["Depakote"], chineseNames: ["丙戊酸"] },
  { generic: "carbamazepine", display: "Carbamazepine", className: "Antiepileptic", atc: "N03AF01",
    chineseNames: ["卡馬西平"] },
  { generic: "lamotrigine", display: "Lamotrigine", className: "Antiepileptic", atc: "N03AX09",
    chineseNames: ["拉莫三嗪"] },

  // ───── Immunosuppressants ─────
  { generic: "cyclosporine", display: "Cyclosporine", className: "Immunosuppressant", atc: "L04AD01",
    chineseNames: ["環孢素"],
    notes: "St John's wort lowers serum level; many TCM herbs are theoretical concerns." },
  { generic: "tacrolimus", display: "Tacrolimus", className: "Immunosuppressant", atc: "L04AD02",
    brands: ["Prograf"], chineseNames: ["他克莫司"] },
  { generic: "methotrexate", display: "Methotrexate", className: "Antimetabolite / DMARD", atc: "L01BA01",
    chineseNames: ["甲氨蝶呤"] },
  { generic: "prednisone", display: "Prednisone", className: "Corticosteroid", atc: "H02AB07",
    chineseNames: ["強的松", "潑尼松"] },
  { generic: "prednisolone", display: "Prednisolone", className: "Corticosteroid", atc: "H02AB06",
    chineseNames: ["潑尼松龍"] },

  // ───── Antimicrobials ─────
  { generic: "amoxicillin", display: "Amoxicillin", className: "Beta-lactam antibiotic", atc: "J01CA04",
    chineseNames: ["阿莫西林"] },
  { generic: "azithromycin", display: "Azithromycin", className: "Macrolide", atc: "J01FA10",
    brands: ["Zithromax"], chineseNames: ["阿奇黴素"] },
  { generic: "ciprofloxacin", display: "Ciprofloxacin", className: "Fluoroquinolone", atc: "J01MA02",
    chineseNames: ["環丙沙星"] },
  { generic: "levofloxacin", display: "Levofloxacin", className: "Fluoroquinolone", atc: "J01MA12",
    brands: ["Levaquin"], chineseNames: ["左氧氟沙星"] },
  { generic: "doxycycline", display: "Doxycycline", className: "Tetracycline", atc: "J01AA02",
    chineseNames: ["多西環素"] },

  // ───── GI ─────
  { generic: "omeprazole", display: "Omeprazole", className: "PPI", atc: "A02BC01",
    chineseNames: ["奧美拉唑"] },
  { generic: "pantoprazole", display: "Pantoprazole", className: "PPI", atc: "A02BC02",
    chineseNames: ["泮托拉唑"] },
  { generic: "ranitidine", display: "Ranitidine", className: "H2 blocker", atc: "A02BA02",
    chineseNames: ["雷尼替丁"] },

  // ───── Thyroid ─────
  { generic: "levothyroxine", display: "Levothyroxine", className: "Thyroid hormone", atc: "H03AA01",
    brands: ["Synthroid"], chineseNames: ["左旋甲狀腺素"] },
  { generic: "methimazole", display: "Methimazole", className: "Antithyroid", atc: "H03BB02",
    chineseNames: ["甲巰咪唑"] },

  // ───── Oncology — common oral ─────
  { generic: "tamoxifen", display: "Tamoxifen", className: "SERM / antiestrogen", atc: "L02BA01",
    chineseNames: ["他莫昔芬"] },
  { generic: "imatinib", display: "Imatinib", className: "Tyrosine kinase inhibitor", atc: "L01EA01",
    brands: ["Gleevec"], chineseNames: ["伊馬替尼"] },

  // ───── Common HK OTC / supplements (commonly co-administered) ─────
  { generic: "vitamin-k", display: "Vitamin K", className: "Vitamin", chineseNames: ["維生素K"] },
  { generic: "vitamin-d", display: "Vitamin D", className: "Vitamin", chineseNames: ["維生素D"] },
  { generic: "iron-supplement", display: "Iron supplement", className: "Supplement", chineseNames: ["鐵劑"] },

  // ───── Misc commonly interacting ─────
  { generic: "theophylline", display: "Theophylline", className: "Methylxanthine bronchodilator", atc: "R03DA04",
    chineseNames: ["茶鹼"] },
  { generic: "sildenafil", display: "Sildenafil", className: "PDE5 inhibitor", atc: "G04BE03",
    brands: ["Viagra"], chineseNames: ["西地那非", "偉哥"] },
  { generic: "estrogen", display: "Estrogen (HRT)", className: "Hormone replacement",
    chineseNames: ["雌激素"] },
  { generic: "lithium", display: "Lithium", className: "Mood stabilizer", atc: "N05AN01",
    chineseNames: ["鋰鹽"] },
];

const DRUG_INDEX = (() => {
  const m: Array<{ q: string; rec: DrugRecord }> = [];
  for (const d of DRUGS) {
    m.push({ q: d.generic.toLowerCase(), rec: d });
    m.push({ q: d.display.toLowerCase(), rec: d });
    m.push({ q: d.className.toLowerCase(), rec: d });
    for (const b of d.brands ?? []) m.push({ q: b.toLowerCase(), rec: d });
    for (const c of d.chineseNames ?? []) m.push({ q: c, rec: d });
  }
  return m;
})();

export function searchDrugs(query: string, limit = 10): DrugRecord[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  const seen = new Set<string>();
  const matches: Array<{ score: number; rec: DrugRecord }> = [];
  for (const entry of DRUG_INDEX) {
    if (seen.has(entry.rec.generic)) continue;
    if (entry.q.startsWith(q)) {
      seen.add(entry.rec.generic);
      matches.push({ score: 100, rec: entry.rec });
    } else if (entry.q.includes(q)) {
      seen.add(entry.rec.generic);
      matches.push({ score: 50, rec: entry.rec });
    }
  }
  matches.sort((a, b) => b.score - a.score || a.rec.display.localeCompare(b.rec.display));
  return matches.slice(0, limit).map((m) => m.rec);
}

export function getDrugByGeneric(generic: string): DrugRecord | undefined {
  return DRUGS.find((d) => d.generic === generic.toLowerCase());
}
