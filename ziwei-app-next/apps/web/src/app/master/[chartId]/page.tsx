import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getMasterChatQuota } from '@/lib/billing/access';
import { loadLatestConversation } from '@/lib/chat/actions';
import { VoiceMaster } from '@/components/chat/voice-master';

export const metadata = { title: '面見師傅' };

/**
 * Immersive full-screen voice session with the AI 師傅. Anchors to a chart id;
 * if that chart belongs to a Subject, askMaster automatically reasons across
 * all three systems (紫微+八字+果老).
 */
export default async function MasterFacePage({ params }: { params: Promise<{ chartId: string }> }) {
  const { chartId } = await params;
  const session = await requireSession();

  const record = await prisma.chart.findUnique({ where: { id: chartId } });
  if (!record) notFound();
  if (record.userId !== session.sub) redirect('/dashboard');

  const birth = record.birthInfo as { year: number; month: number; day: number; hour: number };
  const backHref = record.subjectId ? `/reading/${record.subjectId}` : `/chart/${chartId}`;
  const [quota, latestConv] = await Promise.all([
    getMasterChatQuota(session.sub),
    loadLatestConversation(chartId),
  ]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[radial-gradient(ellipse_at_top,var(--color-bg-elevated),var(--color-bg-deep))]">
      <div className="absolute top-5 left-5">
        <Link href={backHref} className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-gold-bright)] transition-colors">← 返回命盤</Link>
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-6">
        面見師傅 · {record.label || `${birth.year}年${birth.month}月${birth.day}日`}
      </p>
      <VoiceMaster
        chartId={chartId}
        initialConversationId={latestConv?.id ?? null}
        avatarSize={300}
        quota={{
          unlimited: quota.unlimited,
          used: quota.used,
          limit: quota.unlimited ? -1 : quota.limit,
          remaining: quota.unlimited ? -1 : quota.remaining,
        }}
      />
    </main>
  );
}
