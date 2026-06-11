import { renderEmail } from './layout';
import { publicEnv } from '@/lib/env';
import type { PreferenceKind } from '@/lib/email/unsubscribe';

const SCOPE_META: Record<'day' | 'month' | 'year', { label: string; path: string; kind: PreferenceKind }> = {
  day: { label: '今日運勢', path: '/dashboard/daily', kind: 'daily_fortune' },
  month: { label: '本月運勢', path: '/dashboard/monthly', kind: 'monthly_fortune' },
  year: { label: '流年運勢', path: '/dashboard/yearly', kind: 'yearly_fortune' },
};

/** Personalized 三盤合參 digest email for a given period scope. */
export function renderPeriodFortuneEmail(params: {
  scope: 'day' | 'month' | 'year';
  periodLabel: string;
  body: string;
  displayName?: string;
}): { subject: string; html: string; preferenceKind: PreferenceKind } {
  const meta = SCOPE_META[params.scope];
  const name = params.displayName || '尊敬的會員';
  const html = `
    <p style="font-family:'Noto Serif TC',serif;font-size:20px;color:#E8C36A;margin:0 0 6px 0;">${meta.label} · 三盤合參</p>
    <p style="line-height:1.7;font-size:13px;color:#C5C0B0;margin:0 0 18px 0;">${name} · ${params.periodLabel}</p>
    <div style="line-height:1.8;font-size:15px;color:#F5EFE0;">${params.body.replace(/\n/g, '<br/>')}</div>
  `;
  return {
    subject: `紫微閣 · ${meta.label}（${params.periodLabel}）`,
    html: renderEmail({
      title: `${meta.label} · ${params.periodLabel}`,
      preview: params.body.slice(0, 80),
      body: html,
      ctaUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}${meta.path}`,
      ctaText: '在網站查看完整內容 →',
      footerNote: '不想收到此類運勢電郵？帳戶設定中一鍵關閉。',
    }),
    preferenceKind: meta.kind,
  };
}
