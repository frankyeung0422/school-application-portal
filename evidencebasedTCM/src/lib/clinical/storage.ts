"use client";

// Local-only persistence for clinical tools (prescriptions, cases).
// Uses localStorage — no server round-trip, survives page reloads.

export interface SelectedAcupoint {
  id: string;
  code: string;
  name: string;
  meridian: string;
}

export interface SelectedHerb {
  id: string;
  name: string;
  chineseName: string;
  dosage?: string;
}

export interface CaseNotebook {
  id: string;
  createdAt: string;
  updatedAt: string;
  patientInitials: string;
  chiefComplaint: string;
  diagnosis: string;
  patternIds: string[];
  formulaIds: string[];
  acupointIds: string[];
  herbIds: string[];
  notes: string;
}

const PRESCRIPTION_KEY = "ebtcm.prescription.draft";
const CASES_KEY = "ebtcm.cases";

export interface PrescriptionDraft {
  acupoints: SelectedAcupoint[];
  herbs: SelectedHerb[];
  patientInitials: string;
  notes: string;
  updatedAt: string;
}

export function loadPrescription(): PrescriptionDraft {
  if (typeof window === "undefined") return emptyPrescription();
  try {
    const raw = localStorage.getItem(PRESCRIPTION_KEY);
    return raw ? (JSON.parse(raw) as PrescriptionDraft) : emptyPrescription();
  } catch {
    return emptyPrescription();
  }
}

export function savePrescription(p: PrescriptionDraft) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PRESCRIPTION_KEY,
    JSON.stringify({ ...p, updatedAt: new Date().toISOString() })
  );
}

export function emptyPrescription(): PrescriptionDraft {
  return { acupoints: [], herbs: [], patientInitials: "", notes: "", updatedAt: new Date().toISOString() };
}

export function loadCases(): CaseNotebook[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CASES_KEY);
    return raw ? (JSON.parse(raw) as CaseNotebook[]) : [];
  } catch {
    return [];
  }
}

export function saveCases(cases: CaseNotebook[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CASES_KEY, JSON.stringify(cases));
}

export function newCase(): CaseNotebook {
  const now = new Date().toISOString();
  return {
    id: `case_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    patientInitials: "",
    chiefComplaint: "",
    diagnosis: "",
    patternIds: [],
    formulaIds: [],
    acupointIds: [],
    herbIds: [],
    notes: "",
  };
}
