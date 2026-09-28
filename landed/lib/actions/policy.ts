import { DEFAULT_POLICY, EARNED_AUTONOMY, POLICY_FLOOR, type ActionKind, type PolicyMode } from "./kinds";

// Pure policy resolution; tests/actions.test.ts. The DB loader lives in bus.ts.

const RANK: Record<PolicyMode, number> = { AUTO: 0, APPROVE: 1, BLOCK: 2 };

export function strictest(a: PolicyMode, b: PolicyMode): PolicyMode {
  return RANK[a] >= RANK[b] ? a : b;
}

export interface TrackRecord {
  approvedExecutions: number;
  recentFailures: number;
}

export interface PolicyDecision {
  mode: PolicyMode;
  floored: boolean;
  earnedAutonomyPending: boolean;
  reason: string;
}

export function decidePolicy(
  kind: ActionKind,
  dbMode: PolicyMode | null,
  track: TrackRecord,
): PolicyDecision {
  const raw = dbMode ?? DEFAULT_POLICY[kind];
  const floor = POLICY_FLOOR[kind];
  let mode = floor ? strictest(raw, floor) : raw;
  const floored = mode !== raw;

  let earnedAutonomyPending = false;
  const needed = EARNED_AUTONOMY[kind];
  if (mode === "AUTO" && needed != null && (track.approvedExecutions < needed || track.recentFailures > 0)) {
    mode = "APPROVE";
    earnedAutonomyPending = true;
  }

  const reason = floored
    ? `${kind} is floor-locked at ${floor} in code`
    : earnedAutonomyPending
      ? `AUTO not yet earned: ${track.approvedExecutions}/${needed} approved runs, ${track.recentFailures} recent failure(s)`
      : `${mode} (${dbMode ? "database" : "default"})`;
  return { mode, floored, earnedAutonomyPending, reason };
}
