/**
 * Resend email adapter. Configured via env:
 *   RESEND_API_KEY    — required (otherwise sends are no-ops + logged)
 *   EMAIL_FROM        — "EBTCM <hello@yourdomain.com>" (must be verified at Resend)
 *   EMAIL_REPLY_TO    — optional ("you@yourdomain.com")
 *   SITE_URL          — public site root, e.g. https://evidencebasedtcm.com
 *
 * To activate:
 *   1. npm i resend (done)
 *   2. Sign up at resend.com — free tier 100/day, 3K/month
 *   3. Verify your sending domain
 *   4. Set RESEND_API_KEY + EMAIL_FROM in .env
 *   5. Restart the dev server
 *
 * Before keys are set, every send is logged-and-skipped, never throws.
 */
import { Resend } from "resend";

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

let _client: Resend | null = null;

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_client) _client = new Resend(key);
  return _client;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(opts: SendOptions): Promise<SendResult> {
  const r = client();
  const from = process.env.EMAIL_FROM ?? "EBTCM <noreply@evidencebasedtcm.com>";
  const replyTo = opts.replyTo ?? process.env.EMAIL_REPLY_TO;

  if (!r) {
    console.log(`[email:skip] no RESEND_API_KEY — would send "${opts.subject}" to ${opts.to}`);
    return { ok: false, error: "no_api_key" };
  }

  try {
    const res = await r.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(replyTo ? { replyTo } : {}),
    });
    if ("error" in res && res.error) {
      console.error("[email:error]", res.error);
      return { ok: false, error: String(res.error) };
    }
    const id = "data" in res && res.data && typeof res.data === "object" && "id" in res.data
      ? String(res.data.id) : undefined;
    return { ok: true, id };
  } catch (err) {
    console.error("[email:throw]", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

function siteUrl(): string {
  return process.env.SITE_URL ?? "https://evidencebasedtcm.com";
}

/**
 * Cheatsheet welcome — sends a link to the printable preview page.
 * (Not an attachment — keeps email small + ensures latest content.)
 */
export async function sendCheatsheetWelcome(args: { to: string; name?: string | null; locale?: string | null }): Promise<SendResult> {
  const url = `${siteUrl()}/cheatsheet/herb-drug-2026/preview`;
  const isZh = (args.locale ?? "zh-Hant").startsWith("zh");
  const hi = args.name ? `${args.name} 您好` : "您好";

  const html = isZh
    ? `<div style="font-family:system-ui,-apple-system,'Source Han Sans TC',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.6">
        <h1 style="margin:0 0 12px;font-size:22px">您的中藥-西藥交互速查表</h1>
        <p>${hi}，</p>
        <p>感謝訂閱 EBTCM。您要求的 <strong>香港臨床醫師中藥-西藥交互速查表 Top 25</strong> 已可瀏覽：</p>
        <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">📄 開啟速查表</a></p>
        <p style="font-size:13px;color:#64748b">建議用桌面瀏覽器開啟，點選頁面上方「列印」即可儲存為 PDF。</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="font-size:13px">每兩週我會寄一封簡短電子報，分享新案例與臨床觀察。若您想直接查詢中藥-西藥交互（免登入）：<a href="${siteUrl()}/interactions" style="color:#10b981">${siteUrl()}/interactions</a></p>
        <p style="font-size:13px;color:#64748b">若有特定交互作用想加入資料庫，請直接回覆此電郵。</p>
        <p style="font-size:13px">— EBTCM 團隊</p>
      </div>`
    : `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.6">
        <h1 style="margin:0 0 12px;font-size:22px">Your Herb-Drug Interaction Cheat Sheet</h1>
        <p>${args.name ? `Hi ${args.name},` : "Hi,"}</p>
        <p>Thanks for subscribing to EBTCM. Your <strong>Top 25 Herb-Drug Interactions Cheat Sheet</strong> is ready:</p>
        <p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">📄 Open the Cheat Sheet</a></p>
        <p style="font-size:13px;color:#64748b">Best viewed on desktop. Use the "Print" button at the top to save as PDF.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="font-size:13px">I send a short newsletter every two weeks with new cases and clinical observations. To search interactions without login: <a href="${siteUrl()}/interactions" style="color:#10b981">${siteUrl()}/interactions</a></p>
        <p style="font-size:13px;color:#64748b">Reply to this email if there's a specific interaction you'd like added to the database.</p>
        <p style="font-size:13px">— The EBTCM Team</p>
      </div>`;

  return sendEmail({
    to: args.to,
    subject: isZh ? "您的中藥-西藥交互速查表 · EBTCM" : "Your Herb-Drug Interaction Cheat Sheet · EBTCM",
    html,
    text: `${isZh ? "速查表連結" : "Cheat sheet"}: ${url}`,
  });
}

/**
 * Internal alert when a new certification application arrives — sent to ops.
 */
export async function sendCertAppNotification(args: {
  clinicName: string;
  contactName: string;
  email: string;
  practitionerCount: number;
  district?: string | null;
}): Promise<SendResult> {
  const opsEmail = process.env.OPS_EMAIL;
  if (!opsEmail) return { ok: false, error: "no_ops_email" };

  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;padding:20px;line-height:1.6">
    <h2 style="margin:0 0 12px">🏅 新認證診所申請</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#64748b;width:120px">診所</td><td><strong>${args.clinicName}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">聯絡人</td><td>${args.contactName}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">電郵</td><td><a href="mailto:${args.email}">${args.email}</a></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">醫師人數</td><td>${args.practitionerCount}</td></tr>
      ${args.district ? `<tr><td style="padding:6px 0;color:#64748b">地區</td><td>${args.district}</td></tr>` : ""}
    </table>
    <p style="font-size:13px;color:#64748b;margin-top:16px">SLA: 3 個工作日內回覆。</p>
  </div>`;

  return sendEmail({
    to: opsEmail,
    subject: `🏅 新認證診所申請 — ${args.clinicName}`,
    html,
  });
}

/**
 * Applicant-side confirmation email.
 */
export async function sendCertAppConfirmation(args: {
  to: string;
  clinicName: string;
  contactName: string;
}): Promise<SendResult> {
  const html = `<div style="font-family:system-ui,-apple-system,'Source Han Sans TC',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.6">
    <h1 style="margin:0 0 12px;font-size:22px">您的認證申請已收到</h1>
    <p>${args.contactName} 您好，</p>
    <p>感謝 <strong>${args.clinicName}</strong> 申請成為 EBTCM 認證診所。我們已收到您的資料。</p>
    <h3 style="margin:20px 0 8px;font-size:16px">下一步</h3>
    <ol style="padding-left:20px;font-size:14px">
      <li>3 個工作日內，我們的團隊會以電郵回覆您，安排 30 分鐘線上會議。</li>
      <li>會議中我們會了解您的診所流程、回答任何問題、確認培訓時程。</li>
      <li>確認簽約後，您將收到培訓登入連結 + 帳號開通。</li>
    </ol>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
    <p style="font-size:13px;color:#64748b">在等待回覆期間，可先試用免費的中藥-西藥交互查詢工具：<a href="${siteUrl()}/interactions" style="color:#10b981">${siteUrl()}/interactions</a></p>
    <p style="font-size:13px">— EBTCM 認證計劃團隊</p>
  </div>`;

  return sendEmail({
    to: args.to,
    subject: `您的 EBTCM 認證診所申請 · ${args.clinicName}`,
    html,
  });
}
