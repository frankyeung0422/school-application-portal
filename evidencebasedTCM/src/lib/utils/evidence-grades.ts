export const EVIDENCE_GRADE_CONFIG = {
  A: { label: "High", color: "bg-green-100 text-green-800 border-green-300", dot: "bg-green-500" },
  B: { label: "Moderate", color: "bg-blue-100 text-blue-800 border-blue-300", dot: "bg-blue-500" },
  C: { label: "Low", color: "bg-orange-100 text-orange-800 border-orange-300", dot: "bg-orange-500" },
  D: { label: "Very Low", color: "bg-red-100 text-red-800 border-red-300", dot: "bg-red-500" },
} as const;

export const EVIDENCE_LEVEL_LABELS: Record<string, string> = {
  LEVEL_1A: "1a — Systematic Review of RCTs",
  LEVEL_1B: "1b — Individual RCT",
  LEVEL_2A: "2a — Systematic Review of Cohort Studies",
  LEVEL_2B: "2b — Individual Cohort Study",
  LEVEL_3A: "3a — Systematic Review of Case-Control Studies",
  LEVEL_3B: "3b — Individual Case-Control Study",
  LEVEL_4: "4 — Case Series",
  LEVEL_5: "5 — Expert Opinion",
};

export const STUDY_TYPE_LABELS: Record<string, string> = {
  SYSTEMATIC_REVIEW: "Systematic Review",
  META_ANALYSIS: "Meta-Analysis",
  RCT: "Randomized Controlled Trial",
  COHORT: "Cohort Study",
  CASE_CONTROL: "Case-Control Study",
  CASE_SERIES: "Case Series",
  CASE_REPORT: "Case Report",
  EXPERT_OPINION: "Expert Opinion",
  TRADITIONAL_USE: "Traditional Use",
};

export const INTERACTION_SEVERITY_CONFIG = {
  MAJOR: { label: "Major", color: "bg-red-100 text-red-800 border-red-300" },
  MODERATE: { label: "Moderate", color: "bg-orange-100 text-orange-800 border-orange-300" },
  MINOR: { label: "Minor", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  THEORETICAL: { label: "Theoretical", color: "bg-gray-100 text-gray-800 border-gray-300" },
} as const;
