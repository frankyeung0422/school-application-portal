/**
 * BindingDB experimental-druggability client.
 *
 * BindingDB's public REST endpoint returns measured ligand affinities for a
 * protein target (by UniProt). It does NOT expose a PubChem CID per ligand, so
 * a clean compound-level (edge) join isn't possible — instead we annotate each
 * ProteinTarget with how many measured binders it has and its best (lowest)
 * affinity. A target with many nM-range binders is experimentally validated,
 * which raises confidence in any graph edge touching it. No fabricated values:
 * every number comes from BindingDB.
 */

const BASE = "https://bindingdb.org/rest/getLigandsByUniprots";

export interface TargetAffinity {
  count: number;
  bestType: string; // Ki | Kd | IC50 | EC50
  bestNm: number;
}

/** Canonical UniProt accessions for the genes in our graph (stable identifiers). */
export const UNIPROT_BY_GENE: Record<string, string> = {
  PTPN1: "P18031", AKT1: "P31749", PIK3CA: "P42336", INSR: "P06213", IRS1: "P35568",
  SLC2A4: "P14672", PPARG: "P37231", PRKAA1: "Q13131", TNF: "P01375", IL6: "P05231",
  NFKB1: "P19838", PTGS2: "P35354", NOS3: "P29474", VEGFA: "P15692", BCL2: "P10415",
  BAX: "Q07812", CASP3: "P42574", MMP9: "P14780", TGFB1: "P01137", STAT3: "P40763",
  NFE2L2: "Q16236", HMOX1: "P09601", GSK3B: "P49841", BDNF: "P23560", SLC6A4: "P31645",
  GABRA1: "P14867", HTR1A: "P08908", HTR2A: "P28223", HTR1B: "P28222", MAOA: "P21397",
  MAOB: "P27338", ACHE: "P22303", ESR1: "P03372", ESR2: "Q92731", AGTR1: "P30556",
  ACE: "P12821", REN: "P00797", EDN1: "P05305", ADRB1: "P08588", ADRB2: "P07550",
  CACNA1C: "Q13936", DPP4: "P27487", PCSK9: "Q8NBP7", HMGCR: "P04035", SREBF1: "P36956",
  PPARA: "Q07869", CYP3A4: "P08684", CYP2D6: "P10635", CYP2C9: "P11712", CYP1A2: "P05177",
  CYP2C19: "P33261", TLR4: "O00206", IL10: "P22301", IL1B: "P01584", IL17A: "Q16552",
  CXCL8: "P10145", MAPK1: "P28482", SIRT1: "Q96EB6", ADIPOQ: "Q15848", APP: "P05067",
  MAPT: "P10636", BACE1: "P56817", CALCA: "P01258", TRPV1: "Q8NER1", TRPA1: "O75762",
  GAD1: "Q99259", CRH: "P06850", TPH2: "Q8IWU9", ADORA1: "P30542", HTR3A: "P46098",
  TPH1: "P17752", XDH: "P47989", HMGB1: "P09429", NR3C1: "P04150", NR3C2: "P08235",
};

export async function fetchTargetAffinity(uniprot: string, cutoffNm = 10000): Promise<TargetAffinity | null> {
  const res = await fetch(`${BASE}?uniprot=${encodeURIComponent(uniprot)}&cutoff=${cutoffNm}&response=application/json`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { getLindsByUniprotsResponse?: { affinities?: { affinity_type?: string; affinity?: string }[] } };
  const arr = json?.getLindsByUniprotsResponse?.affinities ?? [];
  let count = 0;
  let bestNm = Infinity;
  let bestType = "";
  for (const a of arr) {
    const v = parseFloat(String(a.affinity ?? "").replace(/[<>~=]/g, "").trim());
    if (!Number.isFinite(v) || v <= 0) continue;
    count++;
    if (v < bestNm) { bestNm = v; bestType = a.affinity_type ?? ""; }
  }
  if (count === 0) return null;
  return { count, bestType, bestNm };
}
