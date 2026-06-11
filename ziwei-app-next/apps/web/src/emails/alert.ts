import { renderEmail } from './layout';
import { publicEnv } from '@/lib/env';

export interface AlertEmailItem {
  title: string;
  description: string;
  severity: number;
  recommendations?: string[];
}

const SEVERITY_LABEL: Record<number, string> = { 5: '極高', 4: '高', 3: '中', 2: '低', 1: '輕微' };

/** Urgent-tone email for one or more newly-detected high-severity alerts. */
export function renderAlertEmail(params: {
  displayName?: string;
  period: string;
  alerts: AlertEmailItem[];
}): { subject: string; html: string } {
  const name = params.displayName || '尊敬的會員';
  const items = params.alerts
    .map((a) => {
      const recs = (a.recommendations ?? [])
        .slice(0, 4)
        .map((r) => `<li style="margin:2px 0;">${r}</li>`)
        .join('');
      return `
        <div style="border-left:3px solid #d97706;padding:8px 0 8px 14px;margin:0 0 18px 0;">
          <p style="font-family:'Noto Serif TC',serif;font-size:16px;color:#E8C36A;margin:0 0 6px 0;">
            〔${SEVERITY_LABEL[a.severity] ?? a.severity}〕${a.title}
          </p>
          <p style="line-height:1.7;font-size:14px;color:#F5EFE0;margin:0 0 8px 0;">${a.description}</p>
          ${recs ? `<ul style="line-height:1.6;font-size:13px;color:#C5C0B0;margin:0;padding-left:18px;">${recs}</ul>` : ''}
        </div>`;
    })
    .join('');

  const body = `
    <p style="font-family:'Noto Serif TC',serif;font-size:20px;color:#E8C36A;margin:0 0 12px 0;">命理特別提醒</p>
    <p style="line-height:1.7;font-size:15px;color:#F5EFE0;margin:0 0 18px 0;">
      ${name}, 三盤合參於 <span style="color:#E8C36A;">${params.period}</span> 偵測到以下須特別留意之象。命理僅供參考, 趨吉避凶, 重在預防。
    </p>
    ${items}
    <p style="line-height:1.6;font-size:12px;color:#8A8576;margin:18px 0 0 0;">
      此為高嚴重度預警自動通知。可於帳戶設定關閉預警電郵。
    </p>
  `;

  return {
    subject: `⚠ 命理特別提醒 — ${params.period}`,
    html: renderEmail({
      title: '命理特別提醒',
      preview: params.alerts[0]?.title ?? '偵測到須留意之象',
      body,
      ctaUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/dashboard/alerts`,
      ctaText: '查看完整預警 →',
      footerNote: '不想收到預警電郵？帳戶設定中一鍵關閉。',
    }),
  };
}
