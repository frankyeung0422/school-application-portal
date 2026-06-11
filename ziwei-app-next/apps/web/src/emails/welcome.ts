import { renderEmail } from './layout';
import { publicEnv } from '@/lib/env';

export function renderWelcomeEmail(params: { displayName?: string }): { subject: string; html: string } {
  const name = params.displayName || '尊敬的會員';
  const body = `
    <p style="font-family:'Noto Serif TC',serif;font-size:22px;color:#E8C36A;margin:0 0 16px 0;">歡迎來到紫微閣, ${name}</p>
    <p style="line-height:1.7;font-size:15px;color:#F5EFE0;margin:0 0 16px 0;">
      你的 7 天免費試用已開啟。在這 7 天中, 你可以:
    </p>
    <ul style="line-height:1.7;font-size:14px;color:#C5C0B0;margin:0 0 24px 0;padding-left:20px;">
      <li>排出無限個紫微命盤, 完整十二宮位深度解讀</li>
      <li>啟用每日運勢電郵, 每天清晨送達</li>
      <li>查看 2026 年完整流年走勢與命理預警</li>
      <li>邀請好友, 雙方各獲 1 個月免費</li>
    </ul>
    <p style="line-height:1.7;font-size:14px;color:#C5C0B0;margin:0;">
      若這 7 天後你不繼續, 在帳戶中心一鍵取消即可, 不會自動扣款留下任何尾巴。
    </p>
  `;
  return {
    subject: '✦ 歡迎來到紫微閣 — 你的 7 天試用已開啟',
    html: renderEmail({
      title: '歡迎來到紫微閣',
      preview: '你的 7 天試用已開啟。立刻排出你的第一張命盤。',
      body,
      ctaUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/dashboard`,
      ctaText: '進入命盤儀表板 →',
    }),
  };
}
