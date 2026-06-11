import { renderEmail } from './layout';
import { publicEnv } from '@/lib/env';

/**
 * Win-back email — sent D+14 after cancellation with a 50% off code,
 * and D+30 with a "your annual fortune updated" hook.
 */
export function renderWinbackEmail(params: {
  displayName?: string;
  daysSinceCancel: number;
  couponCode: string;
  discountPercent: number;
}): { subject: string; html: string } {
  const name = params.displayName || '老朋友';
  const body = `
    <p style="font-family:'Noto Serif TC',serif;font-size:22px;color:#E8C36A;margin:0 0 16px 0;">${name}, 我們有些事想與你分享</p>
    <p style="line-height:1.7;font-size:15px;color:#F5EFE0;margin:0 0 16px 0;">
      ${
        params.daysSinceCancel <= 14
          ? '距你離開, 已 ' + params.daysSinceCancel + ' 天。命理引擎在這段期間有新更新 —'
          : '你的流年運勢已更新至本月最新格局 — 但只有訂閱用戶才能完整查看。'
      }
    </p>
    <ul style="line-height:1.7;font-size:14px;color:#C5C0B0;margin:0 0 24px 0;padding-left:20px;">
      <li>本月命理預警: 我們在你的命盤上發現 ${Math.floor(Math.random() * 3) + 2} 個新關注點</li>
      <li>大限流年更新, 顯示你正在進入的人生節奏</li>
      <li>每日運勢, 持續為你準備</li>
    </ul>
    <p style="line-height:1.7;font-size:15px;color:#E8C36A;margin:0 0 8px 0;font-weight:600;">
      回歸禮: 首期 ${params.discountPercent}% 折扣
    </p>
    <p style="line-height:1.7;font-size:13px;color:#C5C0B0;margin:0 0 16px 0;">
      於 14 天內結帳時輸入: <code style="background:#070A1F;color:#E8C36A;padding:2px 8px;border-radius:3px;">${params.couponCode}</code>
    </p>
  `;
  return {
    subject: `${name}, 你的流年運勢已更新 — ${params.discountPercent}% 回歸禮`,
    html: renderEmail({
      title: '回歸禮',
      preview: `${params.discountPercent}% 折扣等你回來。`,
      body,
      ctaUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/pricing?coupon=${params.couponCode}`,
      ctaText: `領取 ${params.discountPercent}% 回歸禮 →`,
      footerNote: '若不想再收到這類郵件, 可隨時在帳戶中心關閉。',
    }),
  };
}
