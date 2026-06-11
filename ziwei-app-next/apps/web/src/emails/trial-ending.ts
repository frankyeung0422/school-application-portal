import { renderEmail } from './layout';
import { publicEnv } from '@/lib/env';

export function renderTrialEndingEmail(params: {
  displayName?: string;
  daysLeft: number;
  plan: 'monthly' | 'annual' | 'master';
  priceHKD: number;
}): { subject: string; html: string } {
  const name = params.displayName || '尊敬的會員';
  const body = `
    <p style="font-family:'Noto Serif TC',serif;font-size:22px;color:#E8C36A;margin:0 0 16px 0;">${name}, 你的試用還剩 ${params.daysLeft} 天</p>
    <p style="line-height:1.7;font-size:15px;color:#F5EFE0;margin:0 0 16px 0;">
      ${params.daysLeft <= 2 ? '即將自動轉為正式會員' : '時間正在流逝'} — HK$${params.priceHKD.toLocaleString()} 將於下次扣款日從你的卡上扣取。
    </p>
    <p style="line-height:1.7;font-size:14px;color:#C5C0B0;margin:0 0 16px 0;">
      過去 ${7 - params.daysLeft} 天, 我們為你準備了:
    </p>
    <ul style="line-height:1.7;font-size:14px;color:#C5C0B0;margin:0 0 24px 0;padding-left:20px;">
      <li>完整紫微命盤與十二宮位深度解讀</li>
      <li>每日精準運勢, 已送達 ${7 - params.daysLeft} 次</li>
      <li>命理預警系統, 提醒重大轉折</li>
    </ul>
    <p style="line-height:1.7;font-size:14px;color:#C5C0B0;margin:0;">
      如不打算繼續, 請於 ${params.daysLeft} 天內到帳戶中心取消即可, 不會被扣款。
    </p>
  `;
  return {
    subject: `⏳ 試用倒數 ${params.daysLeft} 天 — 紫微閣`,
    html: renderEmail({
      title: `試用倒數 ${params.daysLeft} 天`,
      preview: `試用即將結束,HK$${params.priceHKD} 將於 ${params.daysLeft} 天後扣款。`,
      body,
      ctaUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/account/billing`,
      ctaText: '管理我的訂閱 →',
      footerNote: '隨時可以在帳戶中心取消, 不留尾巴。',
    }),
  };
}
