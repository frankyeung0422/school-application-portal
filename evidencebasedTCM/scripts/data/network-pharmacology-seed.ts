/**
 * Curated network-pharmacology seed data.
 *
 * These are well-established, widely-published herb→compound→target,
 * target→pathway, and disease→gene relationships drawn from the canonical
 * TCM network-pharmacology literature (TCMSP / HERB / SymMap-style data and
 * the primary mechanism papers behind them). They are intentionally a
 * high-confidence core set — the ingestion scripts can layer additional
 * lower-confidence edges (e.g. LLM-proposed) on top.
 *
 * Gene symbols are HGNC. Pathway codes are KEGG (hsa…).
 */

export interface CompoundSeed {
  name: string;
  pubchemCid?: string;
  mechanism: string; // Traditional Chinese, mirrors HerbActiveCompound.mechanismOfAction
  targets: string[]; // HGNC gene symbols
}

export interface HerbCompoundSeed {
  // Match against Herb.latinName (case-insensitive substring). Most stable key
  // because the DB mixes simplified/traditional Chinese and duplicate pinyin.
  latin: string;
  zh: string; // for log readability only
  compounds: CompoundSeed[];
}

export const HERB_COMPOUND_SEED: HerbCompoundSeed[] = [
  {
    latin: "Coptis chinensis",
    zh: "黃連",
    compounds: [
      {
        name: "Berberine",
        pubchemCid: "2353",
        mechanism: "激活 AMPK（PRKAA1）促進葡萄糖攝取，抑制 PTP1B（PTPN1）增強胰島素信號，下調 PCSK9 降脂，抑制 NF-κB 炎症通路。",
        targets: ["PRKAA1", "PTPN1", "PCSK9", "INSR", "SLC2A4", "NFKB1", "TNF", "IL6", "HMGCR", "DPP4"],
      },
    ],
  },
  {
    latin: "Astragalus membranaceus",
    zh: "黃芪",
    compounds: [
      {
        name: "Astragaloside IV",
        pubchemCid: "13943297",
        mechanism: "經 PI3K/Akt 通路抑制細胞凋亡，調節 NF-κB 減輕炎症，上調 VEGFA/HIF1A 促進血管新生與心肌保護。",
        targets: ["AKT1", "PIK3CA", "NFKB1", "TNF", "IL6", "VEGFA", "HIF1A", "NOS3", "BAX", "BCL2"],
      },
      {
        name: "Astragalus polysaccharide",
        mechanism: "作為益生元調節腸道菌群與短鏈脂肪酸，經 TLR4/NF-κB 平衡 Treg/Th17 免疫，提升 IL-10、抑制 TNF。",
        targets: ["TLR4", "NFKB1", "IL10", "TNF", "IL6", "FOXP3"],
      },
    ],
  },
  {
    latin: "Scutellaria baicalensis",
    zh: "黃芩",
    compounds: [
      {
        name: "Baicalin",
        pubchemCid: "64982",
        mechanism: "抑制 NF-κB 與 COX-2（PTGS2）減輕炎症，抑制黃嘌呤氧化酶，下調 MMP9 保護血管內皮。",
        targets: ["NFKB1", "TNF", "IL6", "PTGS2", "MMP9", "XDH", "AKT1", "CASP3"],
      },
    ],
  },
  {
    latin: "Salvia miltiorrhiza",
    zh: "丹參",
    compounds: [
      {
        name: "Tanshinone IIA",
        pubchemCid: "164676",
        mechanism: "抑制 NF-κB/COX-2 炎症，上調 HMOX1 抗氧化，調節 VEGFA/NOS3 改善微循環與血瘀。",
        targets: ["NFKB1", "PTGS2", "VEGFA", "MMP9", "HMOX1", "BCL2", "TNF", "NOS3"],
      },
      {
        name: "Salvianolic acid B",
        pubchemCid: "11629084",
        mechanism: "強抗氧化，激活 Nrf2（NFE2L2）/HMOX1，保護內皮 NOS3 功能，抑制血小板聚集。",
        targets: ["NFE2L2", "HMOX1", "NOS3", "VEGFA", "MMP9"],
      },
    ],
  },
  {
    latin: "Panax ginseng",
    zh: "人參",
    compounds: [
      {
        name: "Ginsenoside Rg1",
        pubchemCid: "441923",
        mechanism: "經 PI3K/Akt 與 GSK3B 通路抗凋亡、促神經可塑性，上調 BDNF，調節糖皮質激素受體（NR3C1）抗疲勞。",
        targets: ["AKT1", "PIK3CA", "GSK3B", "BDNF", "NR3C1", "NOS3", "BCL2", "PPARG"],
      },
    ],
  },
  {
    latin: "Panax notoginseng",
    zh: "三七",
    compounds: [
      {
        name: "Notoginsenoside R1",
        pubchemCid: "441934",
        mechanism: "上調 VEGFA/NOS3 促血管新生，抑制 NF-κB 炎症與 BAX/BCL2 凋亡，改善腦缺血後神經保護。",
        targets: ["VEGFA", "NOS3", "BCL2", "BAX", "NFKB1", "TNF", "HIF1A"],
      },
    ],
  },
  {
    latin: "Angelica sinensis",
    zh: "當歸",
    compounds: [
      {
        name: "Z-Ligustilide",
        pubchemCid: "529865",
        mechanism: "抑制 COX-2/NF-κB 抗炎鎮痛，調節 TGFB1 抗纖維化，舒張血管改善血虛血瘀。",
        targets: ["PTGS2", "NFKB1", "TNF", "IL6", "NOS3", "VEGFA", "TGFB1"],
      },
      {
        name: "Ferulic acid",
        pubchemCid: "445858",
        mechanism: "清除自由基、激活 Nrf2 抗氧化，抑制血小板聚集與炎症因子。",
        targets: ["NFE2L2", "HMOX1", "PTGS2", "NFKB1", "TNF"],
      },
    ],
  },
  {
    latin: "Ligusticum chuanxiong",
    zh: "川芎",
    compounds: [
      {
        name: "Tetramethylpyrazine",
        pubchemCid: "14296",
        mechanism: "鈣通道（CACNA1C）拮抗舒張血管，上調 NOS3，抑制 COX-2/TNF，改善腦及微循環。",
        targets: ["CACNA1C", "NOS3", "PTGS2", "VEGFA", "TNF", "NFKB1"],
      },
    ],
  },
  {
    latin: "Pueraria",
    zh: "葛根",
    compounds: [
      {
        name: "Puerarin",
        pubchemCid: "5281807",
        mechanism: "激活 PPARG 與 GLUT4（SLC2A4）改善胰島素抵抗，經 Akt 通路保護內皮，β受體調節降壓。",
        targets: ["PPARG", "SLC2A4", "AKT1", "NOS3", "ADRB2", "NFKB1", "INSR"],
      },
    ],
  },
  {
    latin: "Curcuma longa",
    zh: "薑黃",
    compounds: [
      {
        name: "Curcumin",
        pubchemCid: "969516",
        mechanism: "多靶點抑制 NF-κB/STAT3/COX-2 炎症，激活 Nrf2 抗氧化，調節 PPARG 改善代謝，誘導凋亡。",
        targets: ["NFKB1", "PTGS2", "TNF", "IL6", "STAT3", "PPARG", "NFE2L2", "MAPK1", "BCL2", "VEGFA"],
      },
    ],
  },
  {
    latin: "Lycium barbarum",
    zh: "枸杞子",
    compounds: [
      {
        name: "Lycium barbarum polysaccharide",
        mechanism: "抗氧化激活 Nrf2，抑制 TNF/IL-6 炎症，改善胰島素敏感性與視網膜保護。",
        targets: ["NFE2L2", "TNF", "IL6", "BCL2", "HMOX1", "INSR"],
      },
    ],
  },
  {
    latin: "Glycyrrhiza uralensis",
    zh: "甘草",
    compounds: [
      {
        name: "Glycyrrhizin",
        pubchemCid: "14982",
        mechanism: "抑制 HMGB1/NF-κB 炎症，調節鹽皮質激素受體（NR3C2），保肝抗病毒，調和諸藥。",
        targets: ["HMGB1", "NFKB1", "PTGS2", "TNF", "IL6", "NR3C2", "AKT1"],
      },
    ],
  },
  {
    latin: "Ganoderma lucidum",
    zh: "靈芝",
    compounds: [
      {
        name: "Ganoderma polysaccharide",
        mechanism: "經 TLR4 調節免疫，平衡 Th 細胞，抑制 NF-κB 炎症，抗腫瘤輔助與抗疲勞。",
        targets: ["TLR4", "NFKB1", "TNF", "IL6", "IL10", "BCL2", "CASP3", "FOXP3"],
      },
    ],
  },
  {
    latin: "Gastrodia elata",
    zh: "天麻",
    compounds: [
      {
        name: "Gastrodin",
        pubchemCid: "115067",
        mechanism: "增強 GABA 能神經傳遞（GABRA1/GAD1），上調 BDNF，抑制 MAO-B 與 NF-κB，息風止痙、安神降壓。",
        targets: ["GABRA1", "GAD1", "BDNF", "MAOB", "NOS3", "NFKB1"],
      },
    ],
  },
  {
    latin: "Ziziphus jujuba var. spinosa",
    zh: "酸棗仁",
    compounds: [
      {
        name: "Jujuboside A",
        pubchemCid: "9888118",
        mechanism: "增強 GABA-A 受體與 5-HT1A 信號，調節 TPH2/SLC6A4 血清素系統，鎮靜安神改善失眠。",
        targets: ["GABRA1", "HTR1A", "SLC6A4", "TPH2", "BDNF"],
      },
    ],
  },
  {
    latin: "Polygala tenuifolia",
    zh: "遠志",
    compounds: [
      {
        name: "Tenuifolin",
        pubchemCid: "15937962",
        mechanism: "抑制乙醯膽鹼酯酶（ACHE），上調 BDNF/NGF 促神經營養，抑制 GSK3B 與 MAO-B，益智安神。",
        targets: ["ACHE", "BDNF", "NGF", "GSK3B", "MAOB"],
      },
    ],
  },
  {
    latin: "Ophiopogon japonicus",
    zh: "麥冬",
    compounds: [
      {
        name: "Ophiopogonin D",
        pubchemCid: "91450419",
        mechanism: "上調 NOS3 保護內皮，抑制 NF-κB 炎症與凋亡，養陰潤燥、保護心肌。",
        targets: ["NOS3", "BCL2", "VEGFA", "TNF", "NFKB1"],
      },
    ],
  },
  {
    latin: "Schisandra chinensis",
    zh: "五味子",
    compounds: [
      {
        name: "Schisandrin B",
        pubchemCid: "108130",
        mechanism: "激活 Nrf2/HMOX1 抗氧化保肝，調節 CYP3A4，抑制 ACHE，斂肺生津、寧心安神。",
        targets: ["NFE2L2", "HMOX1", "GPX1", "CYP3A4", "ACHE", "BCL2"],
      },
    ],
  },
  {
    latin: "Anemarrhena asphodeloides",
    zh: "知母",
    compounds: [
      {
        name: "Mangiferin",
        pubchemCid: "5281647",
        mechanism: "激活 PPARG/Akt 與抑制 PTP1B 改善胰島素抵抗，抑制 NF-κB，清熱瀉火、滋陰潤燥。",
        targets: ["PPARG", "AKT1", "NFKB1", "PTPN1", "INSR", "TNF"],
      },
    ],
  },
  {
    latin: "Cinnamomum cassia",
    zh: "桂枝",
    compounds: [
      {
        name: "Cinnamaldehyde",
        pubchemCid: "637511",
        mechanism: "激活 PPARG/GLUT4 改善糖代謝，抑制 PTP1B，調節 TRPA1，溫經通陽。",
        targets: ["PPARG", "SLC2A4", "PTPN1", "NFKB1", "INSR"],
      },
    ],
  },
  {
    latin: "Carthamus tinctorius",
    zh: "紅花",
    compounds: [
      {
        name: "Hydroxysafflor yellow A",
        pubchemCid: "6443665",
        mechanism: "上調 VEGFA/NOS3 促血管新生，抑制 NF-κB/COX-2 與 MMP9，活血化瘀、腦缺血保護。",
        targets: ["VEGFA", "NOS3", "NFKB1", "PTGS2", "MMP9", "BCL2"],
      },
    ],
  },
  {
    latin: "Paeonia",
    zh: "芍藥",
    compounds: [
      {
        name: "Paeoniflorin",
        pubchemCid: "442534",
        mechanism: "抑制 NF-κB/COX-2 抗炎免疫調節，調節腺苷 A1 受體鎮痛，抗纖維化（TGFB1），柔肝止痛。",
        targets: ["NFKB1", "TNF", "IL6", "PTGS2", "TGFB1", "AKT1", "ADORA1"],
      },
    ],
  },
  {
    latin: "Lonicera japonica",
    zh: "金銀花",
    compounds: [
      {
        name: "Chlorogenic acid",
        pubchemCid: "1794427",
        mechanism: "抑制 NF-κB/COX-2 與細胞黏附分子（ICAM1），清熱解毒抗炎抗病毒。",
        targets: ["NFKB1", "PTGS2", "TNF", "IL6", "ICAM1"],
      },
      {
        name: "Luteolin",
        pubchemCid: "5280445",
        mechanism: "多靶點抑制 NF-κB/STAT3，抑制肥大細胞與 IgE 介導過敏反應，抗炎抗過敏。",
        targets: ["NFKB1", "PTGS2", "TNF", "IL4", "IL13", "STAT3"],
      },
    ],
  },
  {
    latin: "Rheum palmatum",
    zh: "大黃",
    compounds: [
      {
        name: "Emodin",
        pubchemCid: "3220",
        mechanism: "抑制 NF-κB 炎症與 TGFB1 纖維化，調節 PPARG 脂代謝，誘導凋亡，瀉下攻積。",
        targets: ["NFKB1", "TNF", "IL6", "CASP3", "MMP9", "PPARG", "TGFB1"],
      },
    ],
  },
  {
    latin: "Atractylodes macrocephala",
    zh: "白朮",
    compounds: [
      {
        name: "Atractylenolide I",
        pubchemCid: "5321018",
        mechanism: "抑制 NF-κB/TNF 炎症，調節腸道動力與免疫，健脾益氣、燥濕利水。",
        targets: ["NFKB1", "TNF", "IL6", "IL10", "FOXP3"],
      },
    ],
  },
  {
    latin: "Bupleurum chinense",
    zh: "柴胡",
    compounds: [
      {
        name: "Saikosaponin D",
        pubchemCid: "107793",
        mechanism: "調節糖皮質激素受體（NR3C1），抑制 NF-κB 與 TGFB1 抗炎保肝抗纖維化，疏肝解鬱。",
        targets: ["NR3C1", "NFKB1", "TNF", "TGFB1", "BAX", "BCL2"],
      },
    ],
  },

  // ── Expansion batch (high-frequency herbs by formula membership) ──
  {
    latin: "Poria cocos",
    zh: "茯苓",
    compounds: [
      { name: "Pachymic acid", pubchemCid: "467472", mechanism: "抑制 NF-κB/NLRP3 炎症，調節 AQP2 水通道利水滲濕，抑制 TGFB1 抗纖維化。", targets: ["NFKB1", "TNF", "IL6", "TGFB1", "BCL2"] },
      { name: "Poria polysaccharide", mechanism: "免疫調節，經 TLR4 平衡細胞因子，健脾安神。", targets: ["TLR4", "IL10", "TNF", "FOXP3"] },
    ],
  },
  {
    latin: "Pinellia ternata",
    zh: "半夏",
    compounds: [
      { name: "Pinellia alkaloids", mechanism: "經 TRPV1 與中樞止嘔，抑制 NF-κB/COX-2 炎症，燥濕化痰。", targets: ["TRPV1", "NFKB1", "PTGS2", "TNF"] },
    ],
  },
  {
    latin: "Citrus reticulata",
    zh: "陳皮",
    compounds: [
      { name: "Hesperidin", pubchemCid: "10621", mechanism: "抑制 NF-κB/COX-2 炎症，激活 PPARG 改善代謝，保護血管內皮，理氣健脾。", targets: ["NFKB1", "PTGS2", "TNF", "IL6", "PPARG", "AKT1"] },
      { name: "Nobiletin", pubchemCid: "72344", mechanism: "多靶點抗炎抗代謝紊亂，調節 AMPK 與脂代謝。", targets: ["PRKAA1", "PPARG", "NFKB1", "MAPK1"] },
    ],
  },
  {
    latin: "Rehmannia glutinosa",
    zh: "地黃（生/熟）",
    compounds: [
      { name: "Catalpol", pubchemCid: "91520", mechanism: "經 PI3K/Akt 與 Nrf2 抗氧化神經保護，上調 BDNF，改善胰島素信號，滋陰補腎。", targets: ["AKT1", "NFE2L2", "BDNF", "NFKB1", "INSR", "BCL2"] },
    ],
  },
  {
    latin: "Dioscorea opposita",
    zh: "山藥",
    compounds: [
      { name: "Dioscin", pubchemCid: "119245", mechanism: "激活 PPARG/GLUT4 改善胰島素抵抗，抑制 NF-κB，健脾補肺益腎。", targets: ["PPARG", "SLC2A4", "INSR", "NFKB1", "AKT1"] },
    ],
  },
  {
    latin: "Forsythia suspensa",
    zh: "連翹",
    compounds: [
      { name: "Forsythiaside A", pubchemCid: "5281773", mechanism: "抑制 NF-κB/COX-2 與細胞黏附分子，抗炎抗病毒，清熱解毒。", targets: ["NFKB1", "PTGS2", "TNF", "IL6", "ICAM1"] },
    ],
  },
  {
    latin: "Alisma orientale",
    zh: "澤瀉",
    compounds: [
      { name: "Alisol B", pubchemCid: "10470273", mechanism: "抑制 HMGCR 與 SREBP-1 降脂，激活 LXR/PPARα 改善脂肪肝，利水滲濕。", targets: ["HMGCR", "SREBF1", "PPARA", "NR1H3", "TNF"] },
    ],
  },
  {
    latin: "Phellodendron amurense",
    zh: "黃柏",
    compounds: [
      { name: "Berberine", pubchemCid: "2353", mechanism: "激活 AMPK、抑制 PTP1B 改善代謝，抑制 NF-κB 清熱燥濕。", targets: ["PRKAA1", "PTPN1", "NFKB1", "TNF", "IL6", "PTGS2"] },
    ],
  },
  {
    latin: "Cornus officinalis",
    zh: "山茱萸",
    compounds: [
      { name: "Loganin", pubchemCid: "87691", mechanism: "改善胰島素信號與神經保護，激活 Nrf2 抗氧化，抑制 NF-κB，補益肝腎。", targets: ["INSR", "AKT1", "NFE2L2", "NFKB1", "BCL2"] },
    ],
  },
  {
    latin: "Gardenia jasminoides",
    zh: "梔子",
    compounds: [
      { name: "Geniposide", pubchemCid: "107848", mechanism: "經 GLP-1R 與 NF-κB 抗炎、保肝利膽、改善代謝，清熱瀉火。", targets: ["NFKB1", "TNF", "IL6", "PTGS2", "NFE2L2", "GLP1R"] },
    ],
  },
  {
    latin: "Platycodon grandiflorus",
    zh: "桔梗",
    compounds: [
      { name: "Platycodin D", pubchemCid: "162859", mechanism: "抑制 NF-κB/COX-2 與 MMP9 化痰排膿、抗炎，宣肺利咽。", targets: ["NFKB1", "TNF", "IL6", "PTGS2", "MMP9"] },
    ],
  },
  {
    latin: "Magnolia officinalis",
    zh: "厚朴",
    compounds: [
      { name: "Honokiol", pubchemCid: "72303", mechanism: "增強 GABA-A 受體抗焦慮，抑制 NF-κB/COX-2 炎症，誘導凋亡，行氣燥濕。", targets: ["GABRA1", "NFKB1", "TNF", "PTGS2", "BCL2"] },
      { name: "Magnolol", pubchemCid: "72300", mechanism: "抗氧化抗炎，激活 PPARγ，調節腸道與平喘。", targets: ["PPARG", "NFKB1", "NFE2L2", "PTGS2"] },
    ],
  },
  {
    latin: "Ephedra sinica",
    zh: "麻黃",
    compounds: [
      { name: "Ephedrine", pubchemCid: "9294", mechanism: "激動 β-腎上腺素受體舒張支氣管，上調 NOS3，發汗平喘。", targets: ["ADRB2", "ADRB1", "NOS3"] },
    ],
  },
  {
    latin: "Aconitum carmichaelii",
    zh: "附子",
    compounds: [
      { name: "Higenamine", pubchemCid: "114840", mechanism: "β受體激動強心、擴血管，抑制 NF-κB 炎症，回陽救逆、溫腎助陽。", targets: ["ADRB1", "ADRB2", "NOS3", "NFKB1", "TNF"] },
    ],
  },
  {
    latin: "Scrophularia ningpoensis",
    zh: "玄參",
    compounds: [
      { name: "Harpagoside", pubchemCid: "5481542", mechanism: "抑制 NF-κB/COX-2 抗炎鎮痛，清熱涼血、滋陰解毒。", targets: ["NFKB1", "TNF", "IL6", "PTGS2"] },
    ],
  },
  {
    latin: "Saposhnikovia divaricata",
    zh: "防風",
    compounds: [
      { name: "Prim-O-glucosylcimifugin", pubchemCid: "14604787", mechanism: "抑制 NF-κB 與 Th2 細胞因子（IL-4/IL-13）抗炎抗過敏，祛風解表。", targets: ["NFKB1", "TNF", "PTGS2", "IL4", "IL13"] },
    ],
  },
  {
    latin: "Angelica dahurica",
    zh: "白芷",
    compounds: [
      { name: "Imperatorin", pubchemCid: "10212", mechanism: "抑制 COX-2/NF-κB、調節 CGRP 與 NOS3 鎮痛（頭痛/偏頭痛），祛風止痛。", targets: ["PTGS2", "NFKB1", "NOS3", "CALCA"] },
    ],
  },
  {
    latin: "Prunus persica",
    zh: "桃仁",
    compounds: [
      { name: "Amygdalin", pubchemCid: "656516", mechanism: "抑制 NF-κB/TGFB1 抗炎抗纖維化，調節 VEGFA/MMP9，活血祛瘀。", targets: ["NFKB1", "TNF", "PTGS2", "VEGFA", "MMP9", "TGFB1"] },
    ],
  },
  {
    latin: "Achyranthes bidentata",
    zh: "牛膝",
    compounds: [
      { name: "Ecdysterone", pubchemCid: "5459840", mechanism: "經雌激素受體與 NOS3 改善骨與血管，抗炎，活血通絡、補肝腎。", targets: ["ESR1", "NOS3", "VEGFA", "BCL2"] },
    ],
  },
  {
    latin: "Atractylodes lancea",
    zh: "蒼朮",
    compounds: [
      { name: "Atractylodin", pubchemCid: "5281234", mechanism: "抑制 NF-κB/TNF 炎症，調節 PPARγ 與腸道，燥濕健脾、祛風散寒。", targets: ["NFKB1", "TNF", "IL6", "PPARG"] },
    ],
  },
  {
    latin: "Coix lacryma-jobi",
    zh: "薏苡仁",
    compounds: [
      { name: "Coixol", pubchemCid: "13526", mechanism: "抑制 NF-κB/COX-2 抗炎，調節 PPARγ 與免疫，利水滲濕、健脾。", targets: ["NFKB1", "TNF", "PTGS2", "PPARG"] },
    ],
  },
  {
    latin: "Eucommia ulmoides",
    zh: "杜仲",
    compounds: [
      { name: "Pinoresinol diglucoside", pubchemCid: "5734393", mechanism: "拮抗 AGTR1、上調 NOS3 降壓，經雌激素受體護骨，補肝腎、強筋骨。", targets: ["AGTR1", "NOS3", "ESR1"] },
    ],
  },
  {
    latin: "Citrus aurantium",
    zh: "枳實/枳殼",
    compounds: [
      { name: "Synephrine", pubchemCid: "7172", mechanism: "經 β-腎上腺素受體促胃腸動力與代謝，理氣寬中、行滯消脹。", targets: ["ADRB2", "ADRB1", "NFKB1"] },
    ],
  },
  {
    latin: "Asarum sieboldii",
    zh: "細辛",
    compounds: [
      { name: "Asarinin", pubchemCid: "164708", mechanism: "經 TRPA1 與 COX-2 鎮痛，抑制 NF-κB，溫經散寒、通竅止痛。", targets: ["TRPA1", "PTGS2", "NFKB1", "NOS3"] },
    ],
  },
  {
    latin: "Prunus armeniaca",
    zh: "杏仁",
    compounds: [
      { name: "Amygdalin", pubchemCid: "656516", mechanism: "抑制 COX-2/NF-κB 與 TGFB1，鎮咳平喘、潤肺。", targets: ["PTGS2", "NFKB1", "TNF", "TGFB1"] },
    ],
  },
];

// ── Disease → gene sets ───────────────────────────────────────────────
// Keys MUST match DISEASE_CATALOG[].id (existing 8 + the 8 added in Phase 5).

export interface DiseaseGeneSeed {
  name: string;
  genes: string[];
}

export const DISEASE_GENE_SEED: Record<string, DiseaseGeneSeed> = {
  t2dm: {
    name: "2型糖尿病",
    genes: ["PPARG", "INSR", "IRS1", "AKT1", "SLC2A4", "TNF", "IL6", "PTPN1", "DPP4", "PCSK9", "PRKAA1", "ADIPOQ", "TCF7L2", "NFKB1", "SIRT1"],
  },
  hypertension: {
    name: "原發性高血壓",
    genes: ["ACE", "AGT", "AGTR1", "NOS3", "EDN1", "REN", "ADRB1", "ADRB2", "CACNA1C", "NPPA", "CYP11B2", "NR3C2", "PTGS2", "VEGFA"],
  },
  insomnia: {
    name: "慢性失眠",
    genes: ["GABRA1", "GAD1", "SLC6A4", "HTR2A", "HTR1A", "ADORA1", "BDNF", "TPH2", "MAOA", "NR3C1"],
  },
  ibs: {
    name: "腸易激綜合徵",
    genes: ["TNF", "IL6", "IL10", "TPH1", "SLC6A4", "HTR3A", "TLR4", "NFKB1", "CRH", "TGFB1", "FOXP3"],
  },
  migraine: {
    name: "偏頭痛",
    genes: ["CALCA", "HTR1B", "HTR1A", "NOS3", "EDN1", "PTGS2", "TNF", "CACNA1C", "GABRA1"],
  },
  menopause: {
    name: "圍絕經期綜合徵",
    genes: ["ESR1", "ESR2", "NR3C1", "IL6", "TNF", "BDNF", "SLC6A4", "NOS3", "CALCA", "AKT1"],
  },
  cfs: {
    name: "慢性疲勞綜合徵",
    genes: ["TNF", "IL6", "IL10", "NR3C1", "BDNF", "HMOX1", "NFE2L2", "PRKAA1", "GPX1", "CRH"],
  },
  anxiety: {
    name: "廣泛性焦慮症",
    genes: ["SLC6A4", "HTR1A", "GABRA1", "BDNF", "MAOA", "NR3C1", "CRH", "TPH2", "GAD1"],
  },
  ra: {
    name: "類風濕性關節炎",
    genes: ["TNF", "IL6", "IL1B", "IL17A", "PTGS2", "MMP9", "MMP3", "NFKB1", "STAT3", "TNFSF11", "VEGFA", "IL10", "FOXP3"],
  },
  copd: {
    name: "慢性阻塞性肺病",
    genes: ["TNF", "CXCL8", "IL6", "MMP9", "MMP12", "SERPINA1", "NFE2L2", "HMOX1", "TGFB1", "NFKB1", "PTGS2"],
  },
  nafld: {
    name: "非酒精性脂肪肝病",
    genes: ["PPARA", "PPARG", "SREBF1", "FASN", "TNF", "IL6", "AKT1", "PRKAA1", "NFE2L2", "SIRT1", "ADIPOQ", "TGFB1"],
  },
  "post-stroke": {
    name: "中風後遺症",
    genes: ["NOS3", "VEGFA", "BDNF", "CASP3", "BCL2", "BAX", "TNF", "IL6", "MMP9", "HIF1A", "NFE2L2", "NGF"],
  },
  "cancer-support": {
    name: "癌症扶正支持治療",
    genes: ["TNF", "IL6", "IL10", "VEGFA", "NFKB1", "STAT3", "BCL2", "CASP3", "HIF1A", "MMP9", "NFE2L2", "FOXP3"],
  },
  depression: {
    name: "抑鬱症",
    genes: ["SLC6A4", "BDNF", "HTR1A", "HTR2A", "MAOA", "NR3C1", "CRH", "TNF", "IL6", "TPH2", "GSK3B"],
  },
  alzheimer: {
    name: "阿茲海默病",
    genes: ["APP", "MAPT", "BACE1", "ACHE", "NFE2L2", "TNF", "IL1B", "GSK3B", "BDNF", "CASP3", "NGF", "MAOB"],
  },
  rhinitis: {
    name: "過敏性鼻炎",
    genes: ["IL4", "IL5", "IL13", "IL10", "TNF", "NFKB1", "PTGS2", "GATA3", "FOXP3", "STAT3"],
  },
};

// ── KEGG pathways → member genes ──────────────────────────────────────
// Used to build TargetPathway links and runtime pathway enrichment.

export interface PathwaySeed {
  code: string;
  name: string;
  source: "KEGG";
  category?: string;
  genes: string[];
}

export const PATHWAY_SEED: PathwaySeed[] = [
  { code: "hsa04151", name: "PI3K-Akt signaling pathway", source: "KEGG", category: "Signal transduction", genes: ["AKT1", "PIK3CA", "INSR", "IRS1", "VEGFA", "BCL2", "BAX", "NOS3", "HIF1A", "GSK3B"] },
  { code: "hsa04152", name: "AMPK signaling pathway", source: "KEGG", category: "Signal transduction", genes: ["PRKAA1", "SLC2A4", "PPARG", "SREBF1", "FASN", "ADIPOQ", "SIRT1", "INSR"] },
  { code: "hsa04668", name: "TNF signaling pathway", source: "KEGG", category: "Immune", genes: ["TNF", "NFKB1", "IL6", "PTGS2", "MMP9", "MMP3", "CXCL8", "MAPK1", "CASP3"] },
  { code: "hsa04620", name: "Toll-like receptor signaling pathway", source: "KEGG", category: "Immune", genes: ["TLR4", "NFKB1", "TNF", "IL6", "IL10", "CXCL8", "MAPK1"] },
  { code: "hsa04060", name: "Cytokine-cytokine receptor interaction", source: "KEGG", category: "Immune", genes: ["TNF", "IL6", "IL1B", "IL10", "IL4", "IL5", "IL13", "IL17A", "VEGFA", "TNFSF11", "CXCL8"] },
  { code: "hsa04931", name: "Insulin resistance", source: "KEGG", category: "Endocrine/Metabolic", genes: ["INSR", "IRS1", "AKT1", "PRKAA1", "PTPN1", "SLC2A4", "TNF", "NFKB1", "PCSK9"] },
  { code: "hsa03320", name: "PPAR signaling pathway", source: "KEGG", category: "Endocrine/Metabolic", genes: ["PPARA", "PPARG", "FASN", "ADIPOQ"] },
  { code: "hsa04727", name: "GABAergic synapse", source: "KEGG", category: "Nervous system", genes: ["GABRA1", "GAD1"] },
  { code: "hsa04726", name: "Serotonergic synapse", source: "KEGG", category: "Nervous system", genes: ["SLC6A4", "HTR1A", "HTR2A", "HTR1B", "HTR3A", "TPH1", "TPH2", "MAOA", "PTGS2"] },
  { code: "hsa04614", name: "Renin-angiotensin system", source: "KEGG", category: "Endocrine", genes: ["ACE", "AGT", "AGTR1", "REN", "CYP11B2", "NR3C2"] },
  { code: "hsa04022", name: "cGMP-PKG signaling pathway", source: "KEGG", category: "Cardiovascular", genes: ["NOS3", "EDN1", "AGTR1", "CACNA1C", "ADRB1", "ADRB2", "NPPA"] },
  { code: "hsa05010", name: "Alzheimer disease", source: "KEGG", category: "Neurodegeneration", genes: ["APP", "MAPT", "BACE1", "GSK3B", "CASP3", "ACHE", "BCL2", "BDNF"] },
  { code: "hsa04915", name: "Estrogen signaling pathway", source: "KEGG", category: "Endocrine", genes: ["ESR1", "ESR2", "NOS3", "AKT1", "MMP9"] },
  { code: "hsa04657", name: "IL-17 signaling pathway", source: "KEGG", category: "Immune", genes: ["IL17A", "TNF", "IL6", "PTGS2", "MMP9", "NFKB1", "CXCL8"] },
  { code: "hsa05208", name: "Chemical carcinogenesis - reactive oxygen species", source: "KEGG", category: "Oxidative stress", genes: ["NFE2L2", "HMOX1", "GPX1", "SOD2", "CYP3A4", "MAPK1"] },
  { code: "hsa04668b", name: "Apoptosis", source: "KEGG", category: "Cell growth/death", genes: ["BAX", "BCL2", "CASP3", "TNF", "NFKB1"] },
];
