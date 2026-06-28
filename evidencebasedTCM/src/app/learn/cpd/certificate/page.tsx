export const metadata = { title: "CPD 進修證書 — EBTCM" };

interface Props {
  searchParams: Promise<{ name?: string; credits?: string; year?: string; activities?: string }>;
}

export default async function CertificatePage({ searchParams }: Props) {
  const sp = await searchParams;
  const name = sp.name ?? "持牌中醫師";
  const credits = Number(sp.credits ?? 0);
  const year = Number(sp.year ?? new Date().getFullYear());
  const activities = Number(sp.activities ?? 0);
  const today = new Date().toLocaleDateString("zh-HK", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <style>{`
        @media print {
          nav, header, footer, .no-print { display: none !important; }
          .cert-page { background: white !important; padding: 0 !important; }
          .cert { box-shadow: none !important; margin: 0 !important; }
          @page { size: A4 landscape; margin: 1.5cm; }
        }
        .cert-page { min-height: 100vh; background: #f0f4f0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; font-family: "Noto Serif TC", "Microsoft JhengHei", Georgia, serif; }
        .cert { background: white; border: 3px double #1a5f3f; padding: 60px; max-width: 900px; width: 100%; text-align: center; position: relative; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
        .cert::before { content: ""; position: absolute; inset: 8px; border: 1px solid #1a5f3f; pointer-events: none; }
        .cert-logo { font-size: 13px; color: #777; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 8px; }
        .cert-h1 { font-size: 36px; color: #1a5f3f; margin: 0 0 4px; letter-spacing: 6px; }
        .cert-h2 { font-size: 17px; color: #444; font-weight: normal; margin: 0 0 32px; letter-spacing: 2px; }
        .cert-divider { border: none; border-top: 1px solid #ccc; margin: 16px auto; width: 80%; }
        .cert-awarded { font-size: 15px; color: #666; margin-bottom: 12px; }
        .cert-recipient { font-size: 30px; font-weight: bold; color: #1a3320; border-bottom: 2px solid #1a5f3f; display: inline-block; padding-bottom: 4px; min-width: 280px; margin: 8px 0 20px; }
        .cert-body { font-size: 15px; color: #444; line-height: 1.8; margin: 16px 0; }
        .cert-credits-box { display: inline-block; border: 2px solid #1a5f3f; border-radius: 8px; padding: 12px 36px; margin: 16px 0; }
        .cert-credits-num { font-size: 52px; font-weight: bold; color: #1a5f3f; line-height: 1; }
        .cert-credits-label { font-size: 13px; color: #666; letter-spacing: 2px; margin-top: 4px; }
        .cert-footer { margin-top: 48px; display: flex; justify-content: space-around; }
        .cert-sig { text-align: center; }
        .cert-sig-line { border-top: 1px solid #333; width: 180px; margin: 0 auto 4px; }
        .cert-sig p { font-size: 12px; color: #666; margin: 0; line-height: 1.6; }
        .print-btn { display: block; margin: 0 auto 24px; padding: 10px 28px; background: #1a5f3f; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-family: inherit; }
        .print-btn:hover { background: #14472e; }
      `}</style>

      <div className="cert-page">
        <button
          className="print-btn no-print"
          suppressHydrationWarning
        >
          🖨 列印 / 儲存為 PDF
        </button>

        <div className="cert">
          <div className="cert-logo">Evidence-Based TCM Platform · 循證中醫臨床平台</div>
          <h1 className="cert-h1">進修證書</h1>
          <h2 className="cert-h2">Certificate of Continuing Professional Development</h2>
          <hr className="cert-divider" />

          <p className="cert-awarded">茲證明</p>
          <div className="cert-recipient">{name}</div>

          <p className="cert-body">
            於 {year} 年度在《循證中醫臨床平台》完成 {activities} 項持續進修活動，<br />
            包括研讀實證文獻、完成學習課程及提交臨床病案。
          </p>

          <div className="cert-credits-box">
            <div className="cert-credits-num">{credits}</div>
            <div className="cert-credits-label">CPD 學分 / Credits</div>
          </div>

          <p className="cert-body">發證日期：{today}</p>

          <div className="cert-footer">
            <div className="cert-sig">
              <div className="cert-sig-line"></div>
              <p>平台系統認證</p>
              <p>Platform Certification</p>
            </div>
            <div className="cert-sig">
              <div className="cert-sig-line"></div>
              <p>持牌醫師簽署</p>
              <p>Licensed Practitioner</p>
            </div>
          </div>
        </div>
      </div>

      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `document.querySelector('.print-btn')?.addEventListener('click', function(){ window.print(); });`,
        }}
      />
    </>
  );
}
