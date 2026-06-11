import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generate } from '@/lib/ai/client';
import { sendEmail } from '@/lib/email/client';
import { renderEmail } from '@/emails/layout';
import { publicEnv } from '@/lib/env';
import { runPeriodSweep } from '@/lib/cron/period-sweep';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Vercel cron auth header
const CRON_SECRET = process.env.CRON_SECRET;

const ZODIAC = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
const ZODIAC_TO_YEAR_MOD = { 鼠: 4, 牛: 5, 虎: 6, 兔: 7, 龍: 8, 蛇: 9, 馬: 10, 羊: 11, 猴: 0, 雞: 1, 狗: 2, 豬: 3 } as const;

/**
 * Vercel cron handler (configured via vercel.json or vercel.toml):
 *   { "crons": [{ "path": "/api/cron/daily-fortune", "schedule": "30 23 * * *" }] }
 *   (23:30 UTC = 07:30 HKT)
 *
 * 1. Generate fortune copy for each of 12 zodiacs (Gemini batch)
 * 2. Find all opted-in users with birthYear set
 * 3. Send personalized email to each via SendGrid/Resend
 */
export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return new NextResponse('unauthorized', { status: 401 });
    }
  }

  const today = new Date().toLocaleDateString('zh-Hant-TW');
  const fortunes: Record<string, string> = {};

  // Generate 12 fortunes in parallel
  await Promise.all(
    ZODIAC.map(async (zodiac) => {
      try {
        const result = await generate({
          promptId: 'daily-fortune',
          vars: {
            date: today,
            lunarDate: '(略)', // TODO: compute lunar via @ziwei/engine
            ganzhi: '(略)',
            zodiac,
            yearElement: '火',
          },
        });
        fortunes[zodiac] = result.text;
      } catch (err) {
        console.error(`[cron/daily-fortune] failed for ${zodiac}:`, (err as Error).message);
        fortunes[zodiac] = '今日運勢生成暫時失敗, 請稍後到帳戶查看。';
      }
    }),
  );

  // Free zodiac pass — opted-in users who are NOT eligible for the personalized
  // premium pass (no active paid plan, or no saved 命主). Sweep-eligible users
  // are excluded here so they receive only the personalized email, not both.
  const subs = await prisma.emailPreference.findMany({
    where: {
      dailyFortuneEnabled: true,
      NOT: {
        user: {
          subscription: { plan: { in: ['MONTHLY', 'ANNUAL', 'MASTER'] }, status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE'] } },
          subjects: { some: { charts: { some: {} } } },
        },
      },
    },
    include: { user: true },
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    if (!sub.user.birthYear) continue; // need zodiac
    const zodiacIndex = (sub.user.birthYear - 1900 + 8) % 12; // 1900=鼠 offset
    const zodiac = ZODIAC[zodiacIndex];
    const fortuneText = fortunes[zodiac];

    try {
      await sendEmail({
        to: sub.user.email,
        subject: `紫微閣 · 今日 ${zodiac} 運勢`,
        html: renderEmail({
          title: `${zodiac} 今日運勢`,
          preview: fortuneText.slice(0, 80),
          body: `<p style="line-height:1.7;font-size:15px;">${fortuneText.replace(/\n/g, '<br/>')}</p>`,
          ctaUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/dashboard`,
          ctaText: '查看你的個人化命盤 →',
          footerNote: '不想收到每日運勢？帳戶中心一鍵關閉。',
        }),
        preferenceKind: 'daily_fortune',
      });
      await prisma.emailPreference.update({
        where: { userId: sub.userId },
        data: { lastSentDate: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`[cron/daily-fortune] send failed for ${sub.user.email}:`, (err as Error).message);
      failed++;
    }
  }

  // Premium pass — personalized 三盤合參 daily fortune + period alert sweep.
  let premium = { scope: 'day', candidates: 0, sent: 0, failed: 0, alertsEmailed: 0, skippedNoSubject: 0 };
  try {
    premium = await runPeriodSweep('day');
  } catch (err) {
    console.error('[cron/daily-fortune] premium sweep failed:', (err as Error).message);
  }

  return NextResponse.json({
    ok: true,
    zodiac: { generated: Object.keys(fortunes).length, sent, failed },
    premium,
  });
}
