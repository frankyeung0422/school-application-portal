import { renderEmail } from './layout';
import { publicEnv } from '@/lib/env';

export function renderMagicLinkEmail(params: { email: string; token: string }): {
  subject: string;
  html: string;
} {
  const url = `${publicEnv.NEXT_PUBLIC_APP_URL}/api/auth/magic?t=${params.token}`;

  const body = `
    <p style="font-family:'Noto Serif TC',serif;font-size:22px;color:#E8C36A;margin:0 0 16px 0;">點擊登入紫微閣</p>
    <p style="line-height:1.7;font-size:15px;color:#F5EFE0;margin:0 0 16px 0;">
      我們收到 <strong>${params.email}</strong> 的登入請求。點擊下方按鈕即可登入,不需密碼:
    </p>
    <p style="line-height:1.7;font-size:13px;color:#C5C0B0;margin:0 0 16px 0;">
      此連結 10 分鐘內有效,僅可使用一次。如果你沒有申請登入,請忽略此電郵。
    </p>
  `;

  return {
    subject: '紫微閣 — 點擊登入',
    html: renderEmail({
      title: '點擊登入',
      preview: '點擊連結即可登入紫微閣,無需密碼。連結 10 分鐘內有效。',
      body,
      ctaUrl: url,
      ctaText: '一鍵登入 →',
      footerNote: '如果按鈕無法使用,請複製此連結貼到瀏覽器: ' + url,
    }),
  };
}
