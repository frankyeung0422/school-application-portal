"use client";

interface Props {
  name: string;
  totalCredits: number;
  year: number;
  activityCount: number;
}

export function CpdCertificateDownload({ name, totalCredits, year, activityCount }: Props) {
  const handlePrint = () => {
    const params = new URLSearchParams({
      name,
      credits: String(totalCredits),
      year: String(year),
      activities: String(activityCount),
    });
    window.open(`/learn/cpd/certificate?${params.toString()}`, "_blank", "width=900,height=700");
  };

  return (
    <button
      onClick={handlePrint}
      className="shrink-0 rounded-lg border border-emerald-400 bg-white px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
    >
      🖨 下載證書
    </button>
  );
}
