"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/types";

interface PatternOpt {
  id: string;
  chineseName: string;
  pinyinName: string;
  treatmentPrinciple: string | null;
}
interface FormulaOpt {
  id: string;
  chineseName: string;
  pinyinName: string;
  category: string;
  herbs: Array<{
    herbId: string;
    dosage: string;
    notes: string | null;
    chineseName: string;
    pinyinName: string;
  }>;
}
interface HerbOpt {
  id: string;
  chineseName: string;
  pinyinName: string;
  category: string;
  dosageRange: string | null;
}
interface RxRow {
  herbId: string;
  chineseName: string;
  pinyinName: string;
  dosage: string;
  preparation: string;
  notes: string;
}

interface Props {
  locale: Locale;
  patientId: string;
  patientWesternMeds: string | null;
  patterns: PatternOpt[];
  formulas: FormulaOpt[];
  herbs: HerbOpt[];
}

export function ConsultationForm({
  locale,
  patientId,
  patientWesternMeds,
  patterns,
  formulas,
  herbs,
}: Props) {
  const router = useRouter();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  // Visit basics
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [noteFormat, setNoteFormat] = useState<"TCM_FOUR_EXAM" | "SOAP">("TCM_FOUR_EXAM");

  // Four exams (TCM)
  const [inquiry, setInquiry] = useState("");
  const [inspection, setInspection] = useState("");
  const [auscultation, setAuscultation] = useState("");
  const [tongueBody, setTongueBody] = useState("");
  const [tongueCoat, setTongueCoat] = useState("");
  const [tongueNotes, setTongueNotes] = useState("");
  const [pulseLeft, setPulseLeft] = useState("");
  const [pulseRight, setPulseRight] = useState("");
  const [pulseNotes, setPulseNotes] = useState("");

  // SOAP (Western)
  const [soapS, setSoapS] = useState("");
  const [soapO, setSoapO] = useState("");
  const [soapA, setSoapA] = useState("");
  const [soapP, setSoapP] = useState("");

  // Vitals (visible in both modes)
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [temperatureC, setTemperatureC] = useState("");
  const [respRate, setRespRate] = useState("");
  const [spo2, setSpo2] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [fastingGlucose, setFastingGlucose] = useState("");
  const [hba1c, setHba1c] = useState("");
  const [vitalsNotes, setVitalsNotes] = useState("");

  // Western diagnosis (visible in both modes — useful alongside TCM pattern)
  const [westernDiagnosis, setWesternDiagnosis] = useState("");

  // Tongue photo
  const [tonguePhotoUrl, setTonguePhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Diagnosis
  const [patternId, setPatternId] = useState("");
  const [patternFreeText, setPatternFreeText] = useState("");
  const [treatmentPrinciple, setTreatmentPrinciple] = useState("");

  // Outcome
  const [scoreBefore, setScoreBefore] = useState<string>("");
  const [scoreAfter, setScoreAfter] = useState<string>("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [adverseEffects, setAdverseEffects] = useState("");
  const [nextVisitDate, setNextVisitDate] = useState<string>("");

  // Rx
  const [baseFormulaId, setBaseFormulaId] = useState("");
  const [dosesPerDay, setDosesPerDay] = useState<string>("1");
  const [daysSupply, setDaysSupply] = useState<string>("7");
  const [rxPrep, setRxPrep] = useState("水煎服");
  const [rxNotes, setRxNotes] = useState("");
  const [rx, setRx] = useState<RxRow[]>([]);
  const [herbSearch, setHerbSearch] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply formula → populate Rx
  function applyFormula(fid: string) {
    setBaseFormulaId(fid);
    const f = formulas.find((x) => x.id === fid);
    if (!f) return;
    setRx(
      f.herbs.map((h) => ({
        herbId: h.herbId,
        chineseName: h.chineseName,
        pinyinName: h.pinyinName,
        dosage: h.dosage,
        preparation: "",
        notes: h.notes ?? "",
      })),
    );
  }

  // Apply pattern → set treatment principle hint
  function applyPattern(pid: string) {
    setPatternId(pid);
    const p = patterns.find((x) => x.id === pid);
    if (p?.treatmentPrinciple && treatmentPrinciple.length === 0) {
      setTreatmentPrinciple(p.treatmentPrinciple);
    }
  }

  const rxHerbIds = useMemo(() => new Set(rx.map((r) => r.herbId)), [rx]);

  const filteredHerbs = useMemo(() => {
    const q = herbSearch.trim().toLowerCase();
    if (!q) return herbs.slice(0, 20);
    return herbs
      .filter(
        (h) =>
          h.chineseName.includes(herbSearch) ||
          h.pinyinName.toLowerCase().includes(q) ||
          h.category.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [herbs, herbSearch]);

  function addHerbToRx(h: HerbOpt) {
    if (rxHerbIds.has(h.id)) return;
    setRx((prev) => [
      ...prev,
      {
        herbId: h.id,
        chineseName: h.chineseName,
        pinyinName: h.pinyinName,
        dosage: h.dosageRange?.split("-")[0]?.trim() ?? "9g",
        preparation: "",
        notes: "",
      },
    ]);
  }
  function updateRx(idx: number, patch: Partial<RxRow>) {
    setRx((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function removeRx(idx: number) {
    setRx((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("photo", f);
      const res = await fetch("/api/patients/tongue-photo", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setError(j.error ?? T("照片上傳失敗", "Photo upload failed"));
        return;
      }
      setTonguePhotoUrl(j.url);
    } finally {
      setPhotoUploading(false);
    }
  }

  function clearPhoto() {
    setTonguePhotoUrl(null);
    if (photoRef.current) photoRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (chiefComplaint.trim().length === 0) {
      setError(T("主訴為必填", "Chief complaint is required"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        visitDate,
        chiefComplaint: chiefComplaint.trim(),
        noteFormat,
        inquiry,
        inspection,
        auscultation,
        tongueBody,
        tongueCoat,
        tongueNotes,
        tonguePhotoUrl,
        pulseLeft,
        pulseRight,
        pulseNotes,
        soapSubjective: soapS,
        soapObjective: soapO,
        soapAssessment: soapA,
        soapPlan: soapP,
        vitals: anyVitalSet() ? {
          bpSystolic: numOrNull(bpSystolic),
          bpDiastolic: numOrNull(bpDiastolic),
          heartRate: numOrNull(heartRate),
          temperatureC: floatOrNull(temperatureC),
          respirationRate: numOrNull(respRate),
          spo2: numOrNull(spo2),
          weightKg: floatOrNull(weightKg),
          heightCm: floatOrNull(heightCm),
          fastingGlucose: floatOrNull(fastingGlucose),
          hba1c: floatOrNull(hba1c),
          notes: vitalsNotes,
        } : null,
        patternId: patternId || null,
        patternFreeText,
        westernDiagnosis,
        treatmentPrinciple,
        symptomScoreBefore: scoreBefore.length > 0 ? Number(scoreBefore) : null,
        symptomScoreAfter: scoreAfter.length > 0 ? Number(scoreAfter) : null,
        outcomeNotes,
        adverseEffects,
        nextVisitDate: nextVisitDate.length > 0 ? nextVisitDate : null,
        prescription: rx.length > 0
          ? {
              formulaId: baseFormulaId || null,
              dosesPerDay: Number(dosesPerDay) || 1,
              daysSupply: Number(daysSupply) || 7,
              preparation: rxPrep,
              notes: rxNotes,
              herbs: rx.map((r) => ({
                herbId: r.herbId,
                dosage: r.dosage,
                preparation: r.preparation,
                notes: r.notes,
              })),
            }
          : null,
      };
      const res = await fetch(`/api/patients/${patientId}/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setError(j.error ?? T("儲存失敗", "Save failed"));
        setSaving(false);
        return;
      }
      router.push(`/patients/${patientId}/consultations/${j.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "network_error");
      setSaving(false);
    }
  }

  function numOrNull(v: string): number | null {
    const n = Number(v);
    return v.trim().length > 0 && Number.isFinite(n) ? Math.round(n) : null;
  }
  function floatOrNull(v: string): number | null {
    const n = Number(v);
    return v.trim().length > 0 && Number.isFinite(n) ? n : null;
  }
  function anyVitalSet(): boolean {
    return [bpSystolic, bpDiastolic, heartRate, temperatureC, respRate, spo2, weightKg, heightCm, fastingGlucose, hba1c]
      .some((v) => v.trim().length > 0);
  }

  const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
  const labelCls = "block text-xs font-medium text-muted mb-1";
  const sectionCls = "rounded-lg border border-border bg-surface p-5 space-y-4";
  const toggleBtnCls = (active: boolean) =>
    `px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
      active ? "bg-primary text-white" : "bg-background text-muted hover:text-foreground"
    }`;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Visit + Chief complaint */}
      <div className={sectionCls}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{T("就診日期", "Visit date")}</label>
            <input className={inputCls} type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{T("下次預約", "Next visit")}</label>
            <input className={inputCls} type="date" value={nextVisitDate} onChange={(e) => setNextVisitDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>{T("主訴 *", "Chief complaint *")}</label>
          <textarea
            className={inputCls}
            rows={2}
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder={T("如：頭痛 3 日，伴頸項僵硬、惡風", "e.g. headache for 3 days, with neck stiffness, aversion to wind")}
            required
          />
        </div>
      </div>

      {/* Note format toggle */}
      <div className="rounded-lg border border-border bg-surface p-3 flex items-center gap-3">
        <span className="text-xs text-muted">{T("記錄格式：", "Note format: ")}</span>
        <div className="flex gap-1 bg-background rounded-md p-1 border border-border">
          <button type="button" onClick={() => setNoteFormat("TCM_FOUR_EXAM")} className={toggleBtnCls(noteFormat === "TCM_FOUR_EXAM")}>
            {T("四診 (中醫)", "TCM 四診")}
          </button>
          <button type="button" onClick={() => setNoteFormat("SOAP")} className={toggleBtnCls(noteFormat === "SOAP")}>
            SOAP
          </button>
        </div>
        <span className="text-[10px] text-muted ml-auto">
          {T(
            "可隨時切換 — 已輸入的內容保留",
            "Switch any time — entered content is preserved",
          )}
        </span>
      </div>

      {/* SOAP section (Western) */}
      {noteFormat === "SOAP" && (
        <div className={sectionCls}>
          <h2 className="text-sm font-semibold">SOAP Note</h2>
          <div>
            <label className={labelCls}>S — Subjective {T("(患者主訴與病史)", "(history of present illness)")}</label>
            <textarea className={inputCls} rows={3} value={soapS} onChange={(e) => setSoapS(e.target.value)}
              placeholder={T("由患者口述的症狀、病史、ROS", "Patient-reported symptoms, history, ROS")} />
          </div>
          <div>
            <label className={labelCls}>O — Objective {T("(體徵、生命徵象、體格檢查、檢驗)", "(exam findings, vitals, labs)")}</label>
            <textarea className={inputCls} rows={3} value={soapO} onChange={(e) => setSoapO(e.target.value)}
              placeholder={T("體格檢查、生命徵象、實驗室結果", "Physical exam, vitals, lab/imaging findings")} />
          </div>
          <div>
            <label className={labelCls}>A — Assessment {T("(評估與診斷)", "(diagnosis / impression)")}</label>
            <textarea className={inputCls} rows={3} value={soapA} onChange={(e) => setSoapA(e.target.value)}
              placeholder={T("主要診斷、鑑別診斷、TCM 證型", "Primary dx, ddx, TCM pattern")} />
          </div>
          <div>
            <label className={labelCls}>P — Plan {T("(處置計劃)", "(treatment plan)")}</label>
            <textarea className={inputCls} rows={3} value={soapP} onChange={(e) => setSoapP(e.target.value)}
              placeholder={T("處方、轉介、檢查、衛教、複診", "Rx, referrals, follow-up, patient education")} />
          </div>
        </div>
      )}

      {/* Four exams (TCM) */}
      {noteFormat === "TCM_FOUR_EXAM" && (
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold">{T("四診 (望聞問切)", "Four Exams")}</h2>

        <div>
          <label className={labelCls}>{T("問診 — 病史與症狀詳述", "Inquiry (問) — history & symptoms")}</label>
          <textarea className={inputCls} rows={3} value={inquiry} onChange={(e) => setInquiry(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{T("望診 — 形體面色", "Inspection (望) — body & complexion")}</label>
            <textarea className={inputCls} rows={2} value={inspection} onChange={(e) => setInspection(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{T("聞診 — 聲息氣味", "Auscultation (聞)")}</label>
            <textarea className={inputCls} rows={2} value={auscultation} onChange={(e) => setAuscultation(e.target.value)} />
          </div>
        </div>

        {/* Tongue */}
        <div className="rounded-md border border-border bg-background p-4">
          <h3 className="text-xs font-semibold text-muted mb-3">{T("舌診", "Tongue (切舌)")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 mb-3">
            <div>
              <label className={labelCls}>{T("舌質", "Tongue body")}</label>
              <input
                className={inputCls}
                value={tongueBody}
                onChange={(e) => setTongueBody(e.target.value)}
                placeholder={T("淡紅 / 紅 / 紫暗 / 淡白", "Pale red / Red / Purplish dark")}
              />
            </div>
            <div>
              <label className={labelCls}>{T("舌苔", "Tongue coat")}</label>
              <input
                className={inputCls}
                value={tongueCoat}
                onChange={(e) => setTongueCoat(e.target.value)}
                placeholder={T("薄白 / 黃膩 / 少苔", "Thin white / Yellow greasy / Scant")}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className={labelCls}>{T("舌診備註", "Tongue notes")}</label>
            <input
              className={inputCls}
              value={tongueNotes}
              onChange={(e) => setTongueNotes(e.target.value)}
              placeholder={T("如：齒痕、裂紋、瘀斑", "e.g. tooth marks, fissures, ecchymoses")}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs cursor-pointer hover:bg-background">
              {photoUploading ? T("上傳中…", "Uploading…") : T("📷 上傳舌相", "📷 Upload tongue photo")}
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onPhotoSelected}
                className="hidden"
                disabled={photoUploading}
              />
            </label>
            {tonguePhotoUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tonguePhotoUrl} alt="tongue" className="h-16 w-16 object-cover rounded border border-border" />
                <button type="button" onClick={clearPhoto} className="text-xs text-muted hover:text-red-500">
                  {T("✕ 移除", "✕ Remove")}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Pulse */}
        <div className="rounded-md border border-border bg-background p-4">
          <h3 className="text-xs font-semibold text-muted mb-3">{T("脈診 — 左右寸關尺", "Pulse (切脈)")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{T("左脈", "Left")}</label>
              <input
                className={inputCls}
                value={pulseLeft}
                onChange={(e) => setPulseLeft(e.target.value)}
                placeholder={T("如：弦細 / 沉細", "e.g. wiry thin")}
              />
            </div>
            <div>
              <label className={labelCls}>{T("右脈", "Right")}</label>
              <input
                className={inputCls}
                value={pulseRight}
                onChange={(e) => setPulseRight(e.target.value)}
                placeholder={T("如：濡緩 / 滑數", "e.g. slippery rapid")}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className={labelCls}>{T("脈診備註", "Pulse notes")}</label>
            <input className={inputCls} value={pulseNotes} onChange={(e) => setPulseNotes(e.target.value)} />
          </div>
        </div>
      </div>
      )}

      {/* Vitals (Western objective signs) — visible in both modes */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold">{T("生命徵象 / 體格", "Vitals & Anthropometrics")}</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div>
            <label className={labelCls}>{T("收縮壓 (mmHg)", "Systolic BP")}</label>
            <input className={inputCls} type="number" min={50} max={260} value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{T("舒張壓 (mmHg)", "Diastolic BP")}</label>
            <input className={inputCls} type="number" min={30} max={160} value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{T("心率 (bpm)", "Heart rate")}</label>
            <input className={inputCls} type="number" min={30} max={220} value={heartRate} onChange={(e) => setHeartRate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{T("體溫 (℃)", "Temp (℃)")}</label>
            <input className={inputCls} type="number" step="0.1" min={32} max={43} value={temperatureC} onChange={(e) => setTemperatureC(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{T("呼吸 (次/分)", "Resp rate")}</label>
            <input className={inputCls} type="number" min={6} max={60} value={respRate} onChange={(e) => setRespRate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>SpO₂ (%)</label>
            <input className={inputCls} type="number" min={50} max={100} value={spo2} onChange={(e) => setSpo2(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{T("體重 (kg)", "Weight (kg)")}</label>
            <input className={inputCls} type="number" step="0.1" min={1} max={400} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{T("身高 (cm)", "Height (cm)")}</label>
            <input className={inputCls} type="number" step="0.1" min={30} max={250} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{T("空腹血糖 (mmol/L)", "Fasting glucose")}</label>
            <input className={inputCls} type="number" step="0.1" min={1} max={40} value={fastingGlucose} onChange={(e) => setFastingGlucose(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>HbA1c (%)</label>
            <input className={inputCls} type="number" step="0.1" min={3} max={20} value={hba1c} onChange={(e) => setHba1c(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>{T("生命徵象備註", "Vitals notes")}</label>
          <input className={inputCls} value={vitalsNotes} onChange={(e) => setVitalsNotes(e.target.value)} />
        </div>
      </div>

      {/* Diagnosis */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold">{T("辨證論治", "Pattern Diagnosis")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{T("證型", "TCM Pattern")}</label>
            <select className={inputCls} value={patternId} onChange={(e) => applyPattern(e.target.value)}>
              <option value="">— {T("自由文字 / 未選", "Free text / none")} —</option>
              {patterns.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.chineseName} ({p.pinyinName})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{T("自擬證型 (選填)", "Custom pattern (optional)")}</label>
            <input
              className={inputCls}
              value={patternFreeText}
              onChange={(e) => setPatternFreeText(e.target.value)}
              placeholder={T("資料庫無對應證型時填寫", "If no DB pattern fits")}
              maxLength={200}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>{T("治法", "Treatment principle")}</label>
          <input
            className={inputCls}
            value={treatmentPrinciple}
            onChange={(e) => setTreatmentPrinciple(e.target.value)}
            placeholder={T("如：疏肝健脾，化濕和胃", "e.g. soothe Liver, strengthen Spleen")}
          />
        </div>
        <div>
          <label className={labelCls}>{T("西醫診斷 (選填)", "Western diagnosis (optional)")}</label>
          <input
            className={inputCls}
            value={westernDiagnosis}
            onChange={(e) => setWesternDiagnosis(e.target.value)}
            placeholder={T("如：原發性高血壓 (I10) / Allergic rhinitis", "e.g. Hypertension (I10) / Allergic rhinitis")}
            maxLength={200}
          />
        </div>
      </div>

      {/* Outcome (typically filled on next visit) */}
      <div className={sectionCls}>
        <h2 className="text-sm font-semibold">{T("療效評估 (本次或下次填寫)", "Outcome (this or next visit)")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>{T("治療前 VAS (0–10)", "Score before (VAS 0–10)")}</label>
            <input className={inputCls} type="number" min={0} max={10} value={scoreBefore} onChange={(e) => setScoreBefore(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{T("治療後 VAS (0–10)", "Score after (VAS 0–10)")}</label>
            <input className={inputCls} type="number" min={0} max={10} value={scoreAfter} onChange={(e) => setScoreAfter(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>{T("療效備註", "Outcome notes")}</label>
          <textarea className={inputCls} rows={2} value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>{T("不良反應", "Adverse effects")}</label>
          <input className={inputCls} value={adverseEffects} onChange={(e) => setAdverseEffects(e.target.value)} />
        </div>
      </div>

      {/* Prescription */}
      <div className={sectionCls}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">{T("處方", "Prescription")}</h2>
          {patientWesternMeds && (
            <span className="text-xs text-yellow-700 dark:text-yellow-300">
              ⚠ {T("已記錄西藥", "Western meds on file")}: {patientWesternMeds}
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{T("套用方劑 (可選)", "Base formula (optional)")}</label>
            <select className={inputCls} value={baseFormulaId} onChange={(e) => applyFormula(e.target.value)}>
              <option value="">— {T("不套用 / 自擬", "None / custom")} —</option>
              {formulas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.chineseName} · {f.category}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>{T("每日服", "Doses/day")}</label>
              <input className={inputCls} type="number" min={1} max={6} value={dosesPerDay} onChange={(e) => setDosesPerDay(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{T("天數", "Days")}</label>
              <input className={inputCls} type="number" min={1} max={90} value={daysSupply} onChange={(e) => setDaysSupply(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{T("煎服法", "Prep")}</label>
              <input className={inputCls} value={rxPrep} onChange={(e) => setRxPrep(e.target.value)} placeholder="水煎服" />
            </div>
          </div>
        </div>

        {/* Herb picker */}
        <div className="rounded-md border border-border bg-background p-3">
          <input
            className={inputCls + " mb-2"}
            placeholder={T("搜尋藥材加入處方…", "Search herbs to add…")}
            value={herbSearch}
            onChange={(e) => setHerbSearch(e.target.value)}
          />
          <div className="grid gap-1 sm:grid-cols-2 md:grid-cols-3 max-h-44 overflow-y-auto">
            {filteredHerbs.map((h) => {
              const on = rxHerbIds.has(h.id);
              return (
                <button
                  type="button"
                  key={h.id}
                  onClick={() => !on && addHerbToRx(h)}
                  disabled={on}
                  className={`text-left text-xs rounded border px-2 py-1.5 transition-colors ${
                    on
                      ? "border-primary/40 bg-primary/5 text-muted cursor-not-allowed"
                      : "border-border bg-surface hover:border-primary-light"
                  }`}
                >
                  <div className="font-medium text-sm">{h.chineseName}</div>
                  <div className="text-[10px] text-muted">
                    {h.pinyinName} · {h.category}
                    {h.dosageRange && ` · ${h.dosageRange}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rx rows */}
        {rx.length > 0 && (
          <div className="rounded-md border border-border bg-background overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs text-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">{T("藥材", "Herb")}</th>
                  <th className="text-left px-3 py-2 font-medium w-24">{T("劑量", "Dosage")}</th>
                  <th className="text-left px-3 py-2 font-medium w-28">{T("煎法", "Prep")}</th>
                  <th className="text-left px-3 py-2 font-medium">{T("備註", "Notes")}</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rx.map((r, idx) => (
                  <tr key={r.herbId} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.chineseName}</div>
                      <div className="text-[10px] text-muted">{r.pinyinName}</div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded border border-border bg-surface px-2 py-1 text-xs"
                        value={r.dosage}
                        onChange={(e) => updateRx(idx, { dosage: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded border border-border bg-surface px-2 py-1 text-xs"
                        value={r.preparation}
                        onChange={(e) => updateRx(idx, { preparation: e.target.value })}
                        placeholder="先煎/後下"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded border border-border bg-surface px-2 py-1 text-xs"
                        value={r.notes}
                        onChange={(e) => updateRx(idx, { notes: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRx(idx)}
                        className="text-xs text-muted hover:text-red-500"
                        aria-label="remove"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <label className={labelCls}>{T("處方備註", "Rx notes")}</label>
          <textarea className={inputCls} rows={2} value={rxNotes} onChange={(e) => setRxNotes(e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-400/40 bg-red-50/60 dark:bg-red-900/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          ❌ {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary text-white px-5 py-2 text-sm font-medium hover:bg-primary-light disabled:opacity-50"
        >
          {saving ? T("儲存中…", "Saving…") : T("儲存就診紀錄", "Save consultation")}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-surface"
        >
          {T("取消", "Cancel")}
        </button>
      </div>
    </form>
  );
}
