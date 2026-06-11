import { renderEmail } from './layout';
import { publicEnv } from '@/lib/env';

export function renderPasswordResetEmail(params: { email: string; token: string }): {
  subject: string;
  html: string;
} {
  const resetUrl = `${publicEnv.NEXT_PUBLIC_APP_URL}/reset/${params.token}`;

  const body = `
    <p style="font-family:'Noto Serif TC',serif;font-size:22px;color:#E8C36A;margin:0 0 16px 0;">重設你的密碼</p>
    <p style="line-height:1.7;font-size:15px;color:#F5EFE0;margin:0 0 16px 0;">
      我們收到你為 <strong>${params.email}</strong> 申請重設密碼的請求。點擊下方按鈕設定新密碼:
    </p>
    <p style="line-height:1.7;font-size:13px;color:#C5C0B0;margin:0 0 16px 0;">
      此連結 1 小時內有效,僅可使用一次。如果你沒有申請重設密碼,可以安全地忽略此電郵 — 你的帳戶不會受影響。
    </p>
  `;

  return {
    subject: '紫微閣 — 重設密碼連結',
    html: renderEmail({
      title: '重設密碼',
      preview: '點擊連結重設你的紫微閣密碼。連結 1 小時內有效。',
      body,
      ctaUrl: resetUrl,
      ctaText: '重設密碼 →',
      footerNote: '此連結 1 小時內有效。如果按鈕無法使用,請複製此連結貼到瀏覽器: ' + resetUrl,
    }),
  };
}
