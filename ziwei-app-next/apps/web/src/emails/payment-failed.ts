import { renderEmail } from './layout';
import { publicEnv } from '@/lib/env';

export function renderPaymentFailedEmail(params: {
  displayName?: string;
  attemptNumber: 1 | 2 | 3;
  retryDate?: Date;
}): { subject: string; html: string } {
  const name = params.displayName || '尊敬的會員';

  const messages: Record<1 | 2 | 3, { subject: string; preview: string; line: string; cta: string }> = {
    1: {
      subject: '💳 卡片扣款失敗 — 請更新支付方式',
      preview: '今次扣款失敗, 你的服務暫未中斷。',
      line: '今次扣款失敗 — 可能是卡片過期、額度不足或銀行暫拒交易。你的服務暫未中斷, 我們會在 3 日後再次嘗試。',
      cta: '更新支付方式 →',
    },
    2: {
      subject: '⚠️ 第 2 次扣款失敗 — 5 日後將暫停服務',
      preview: '請於 5 日內更新卡片, 否則訂閱暫停。',
      line: '已是第 2 次扣款失敗。如 5 日內仍未成功扣款, 我們將暫停你的訂閱。為表歉意, 可使用優惠碼 WELCOMEBACK20 享 8 折。',
      cta: '立即更新並使用優惠 →',
    },
    3: {
      subject: '😔 訂閱已暫停 — 我們仍為你保留資料',
      preview: '隨時回來, 50% 優惠重新訂閱。',
      line: '經 3 次嘗試後, 我們已暫停你的訂閱。但你的命盤、紀錄、追蹤都仍在。隨時回來, 可用 WELCOMEBACK50 享 半價 重新開始。',
      cta: '優惠回歸 →',
    },
  };

  const m = messages[params.attemptNumber];
  const body = `
    <p style="font-family:'Noto Serif TC',serif;font-size:22px;color:#E8C36A;margin:0 0 16px 0;">${name}, ${
      params.attemptNumber === 3 ? '我們會等你' : '需要你的協助'
    }</p>
    <p style="line-height:1.7;font-size:15px;color:#F5EFE0;margin:0 0 16px 0;">${m.line}</p>
    ${params.retryDate ? `<p style="line-height:1.7;font-size:13px;color:#C5C0B0;margin:0;">下次嘗試扣款: ${params.retryDate.toLocaleDateString('zh-Hant')}</p>` : ''}
  `;

  return {
    subject: m.subject,
    html: renderEmail({
      title: m.subject,
      preview: m.preview,
      body,
      ctaUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/account/billing`,
      ctaText: m.cta,
    }),
  };
}
