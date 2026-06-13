import { prisma } from "@/lib/db/prisma";

export interface CommunityRWEResult {
  consentingProfiles: number;
  checkInsProcessed: number;
  meanOverallScore: number | null;
  meanEnergyScore: number | null;
  meanPainScore: number | null;
  meanSleepScore: number | null;
  topConditions: { name: string; count: number; meanSeverity: number | null }[];
  topTcmPatterns: { pattern: string; count: number }[];
  conditionOutcomes: { name: string; n: number; activePct: number; resolvedPct: number }[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function buildSelfReportCommunityRWE(): Promise<CommunityRWEResult> {
  const [profiles, checkIns, conditions] = await Promise.all([
    prisma.userHealthProfile.count({ where: { researchConsent: true } }),
    prisma.healthCheckIn.findMany({
      where: { profile: { researchConsent: true } },
      select: { overallScore: true, energyScore: true, painScore: true, sleepScore: true },
    }),
    prisma.userConditionLog.findMany({
      where: { profile: { researchConsent: true } },
      select: { westernName: true, tcmPatternFree: true, status: true, severity: true },
    }),
  ]);

  const n = checkIns.length;

  const avg = (arr: (number | null)[]) => {
    const valid = arr.filter((x): x is number => x !== null);
    return valid.length > 0 ? round1(valid.reduce((s, x) => s + x, 0) / valid.length) : null;
  };

  const meanOverallScore = n > 0 ? avg(checkIns.map(c => c.overallScore)) : null;
  const meanEnergyScore = avg(checkIns.map(c => c.energyScore));
  const meanPainScore = avg(checkIns.map(c => c.painScore));
  const meanSleepScore = avg(checkIns.map(c => c.sleepScore));

  // Top conditions
  const condMap = new Map<string, { count: number; severities: (number | null)[] }>();
  for (const c of conditions) {
    const entry = condMap.get(c.westernName) ?? { count: 0, severities: [] };
    entry.count++;
    entry.severities.push(c.severity);
    condMap.set(c.westernName, entry);
  }
  const topConditions = [...condMap.entries()]
    .map(([name, { count, severities }]) => ({
      name,
      count,
      meanSeverity: avg(severities),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top TCM patterns
  const patternMap = new Map<string, number>();
  for (const c of conditions) {
    if (c.tcmPatternFree) patternMap.set(c.tcmPatternFree, (patternMap.get(c.tcmPatternFree) ?? 0) + 1);
  }
  const topTcmPatterns = [...patternMap.entries()]
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Condition outcome rates
  const outcomeMap = new Map<string, { active: number; resolved: number; managed: number }>();
  for (const c of conditions) {
    const entry = outcomeMap.get(c.westernName) ?? { active: 0, resolved: 0, managed: 0 };
    if (c.status === "ACTIVE") entry.active++;
    else if (c.status === "RESOLVED") entry.resolved++;
    else if (c.status === "MANAGED") entry.managed++;
    outcomeMap.set(c.westernName, entry);
  }
  const conditionOutcomes = [...outcomeMap.entries()]
    .filter(([, v]) => v.active + v.resolved + v.managed >= 3)
    .map(([name, v]) => {
      const total = v.active + v.resolved + v.managed;
      return {
        name,
        n: total,
        activePct: round1((v.active / total) * 100),
        resolvedPct: round1((v.resolved / total) * 100),
      };
    })
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);

  return {
    consentingProfiles: profiles,
    checkInsProcessed: n,
    meanOverallScore,
    meanEnergyScore,
    meanPainScore,
    meanSleepScore,
    topConditions,
    topTcmPatterns,
    conditionOutcomes,
  };
}
