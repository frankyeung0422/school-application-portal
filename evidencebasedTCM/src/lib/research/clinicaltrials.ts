/**
 * Minimal ClinicalTrials.gov v2 API client.
 *
 * Public JSON API (no key). We query by condition + a TCM/herbal/acupuncture
 * term so results are relevant to this platform, and parse the handful of
 * protocol fields we surface. See https://clinicaltrials.gov/data-api/api.
 */

const BASE = "https://clinicaltrials.gov/api/v2/studies";

export interface TrialRecord {
  nctId: string;
  title: string;
  status: string; // overallStatus
  phase: string | null;
  studyType: string | null;
  enrollment: number | null;
  conditions: string[];
  interventions: string[];
  leadSponsor: string | null;
  startDate: string | null;
  completionDate: string | null;
  url: string;
}

const FIELDS = [
  "protocolSection.identificationModule",
  "protocolSection.statusModule",
  "protocolSection.designModule",
  "protocolSection.conditionsModule",
  "protocolSection.armsInterventionsModule",
  "protocolSection.sponsorCollaboratorsModule",
].join(",");

const TCM_TERM = "traditional chinese medicine OR herbal medicine OR acupuncture OR chinese herbal";

interface RawStudy {
  protocolSection?: {
    identificationModule?: { nctId?: string; briefTitle?: string; officialTitle?: string };
    statusModule?: { overallStatus?: string; startDateStruct?: { date?: string }; completionDateStruct?: { date?: string } };
    designModule?: { studyType?: string; phases?: string[]; enrollmentInfo?: { count?: number } };
    conditionsModule?: { conditions?: string[] };
    armsInterventionsModule?: { interventions?: { name?: string }[] };
    sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } };
  };
}

function parse(study: RawStudy): TrialRecord | null {
  const p = study.protocolSection;
  const nctId = p?.identificationModule?.nctId;
  if (!nctId) return null;
  const phases = p?.designModule?.phases ?? [];
  return {
    nctId,
    title: p?.identificationModule?.briefTitle ?? p?.identificationModule?.officialTitle ?? nctId,
    status: p?.statusModule?.overallStatus ?? "UNKNOWN",
    phase: phases.length ? phases.join("/") : null,
    studyType: p?.designModule?.studyType ?? null,
    enrollment: p?.designModule?.enrollmentInfo?.count ?? null,
    conditions: p?.conditionsModule?.conditions ?? [],
    interventions: (p?.armsInterventionsModule?.interventions ?? []).map((i) => i.name).filter((x): x is string => !!x),
    leadSponsor: p?.sponsorCollaboratorsModule?.leadSponsor?.name ?? null,
    startDate: p?.statusModule?.startDateStruct?.date ?? null,
    completionDate: p?.statusModule?.completionDateStruct?.date ?? null,
    url: `https://clinicaltrials.gov/study/${nctId}`,
  };
}

/** Fetch + upsert trials for the whole catalog (reused by CLI + weekly cron). */
export async function refreshTrials(opts: { maxPerDisease?: number; diseaseIds?: string[] } = {}): Promise<{ upserted: number; perDisease: Record<string, number> }> {
  // Lazy imports to keep this module usable in non-DB contexts.
  const { prisma } = await import("@/lib/db/prisma");
  const { DISEASE_CATALOG } = await import("./disease-catalog");
  const maxPerDisease = opts.maxPerDisease ?? 8;
  const targets = opts.diseaseIds ? DISEASE_CATALOG.filter((d) => opts.diseaseIds!.includes(d.id)) : DISEASE_CATALOG;

  let upserted = 0;
  const perDisease: Record<string, number> = {};
  for (const disease of targets) {
    let trials: TrialRecord[];
    try {
      trials = await searchTrials(disease.nameEn, maxPerDisease);
    } catch {
      continue;
    }
    for (const t of trials) {
      const data = {
        title: t.title, status: t.status, phase: t.phase, studyType: t.studyType,
        enrollment: t.enrollment, conditions: t.conditions, interventions: t.interventions,
        leadSponsor: t.leadSponsor, startDate: t.startDate, completionDate: t.completionDate,
        url: t.url, diseaseId: disease.id, diseaseName: disease.nameZh,
      };
      await prisma.clinicalTrial.upsert({ where: { nctId: t.nctId }, create: { nctId: t.nctId, ...data }, update: data });
      upserted++;
    }
    perDisease[disease.id] = trials.length;
  }
  return { upserted, perDisease };
}

export async function searchTrials(condition: string, max = 10): Promise<TrialRecord[]> {
  const params = new URLSearchParams({
    "query.cond": condition,
    "query.term": TCM_TERM,
    pageSize: String(Math.min(max, 50)),
    fields: FIELDS,
    sort: "LastUpdatePostDate:desc",
  });
  const res = await fetch(`${BASE}?${params.toString()}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`ClinicalTrials.gov ${res.status}`);
  const json = (await res.json()) as { studies?: RawStudy[] };
  return (json.studies ?? []).map(parse).filter((t): t is TrialRecord => t !== null);
}
