import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale-server";
import { ClinicalWorkflowClient } from "@/components/diagnose/ClinicalWorkflowClient";
import { getCurrentTier, tierAtLeast } from "@/lib/auth/tier";

export const metadata = { title: "臨床決策流程 — EBTCM" };

export default async function ClinicalWorkflowPage() {
  const locale = await getLocale();
  const zh = locale === "zh-Hant";
  const tier = await getCurrentTier();
  const isPro = tierAtLeast(tier, "professional");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/diagnose/symptoms" className="hover:text-primary">
          {zh ? "症狀辨證" : "Symptom Diagnosis"}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{zh ? "臨床決策流程" : "Clinical Workflow"}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {zh ? "🩺 臨床決策流程" : "🩺 Clinical Decision Workflow"}
        </h1>
        <p className="text-sm text-muted mt-1">
          {zh
            ? "整合辨證、選方、安全評估及患者資料的一站式臨床工作流程。"
            : "An integrated one-stop workflow: syndrome differentiation → formula selection → safety check → patient handout."}
        </p>
      </div>

      <ClinicalWorkflowClient locale={locale} isPro={isPro} />
    </div>
  );
}
