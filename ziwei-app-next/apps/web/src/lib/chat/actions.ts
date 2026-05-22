'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { solarToLunar, type Chart } from '@ziwei/engine';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';
import { generateChat, type ChatTurn } from '@/lib/ai/client';
import { getMasterChatQuota, hasActivePlan } from '@/lib/billing/access';
import { deriveArchetype, mingongStarsLine } from '@/lib/chart/archetype';

const askSchema = z.object({
  chartId: z.string().min(1),
  conversationId: z.string().optional().nullable(),
  question: z.string().trim().min(2, 'too short').max(800, 'too long'),
});

export type AskMasterResult =
  | { ok: true; conversationId: string; assistant: string }
  | { ok: false; error: 'unauthenticated' | 'chart-not-found' | 'quota-exceeded' | 'invalid' | 'ai-failed'; message?: string; quotaUsed?: number; quotaLimit?: number };

const MAX_TURNS_IN_CONTEXT = 10; // last 10 turns (5 user + 5 assistant) kept in flight

/**
 * Ask the AI 師傅 a question anchored to a specific saved chart.
 *
 * - Free tier: 3 user-messages per calendar month across all conversations.
 * - Paid tier: unlimited.
 * - Conversation history is persisted and the last 10 turns are sent on
 *   each call so Claude has memory of the thread.
 * - System prompt carries chart context as a cacheable block → repeat turns
 *   on the same chart hit Claude's prompt cache.
 */
export async function askMaster(input: z.infer<typeof askSchema>): Promise<AskMasterResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'unauthenticated' };

  const parsed = askSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'invalid', message: parsed.error.issues[0]?.message };
  }
  const { chartId, conversationId: incomingConvId, question } = parsed.data;

  // Load + auth-check the chart
  let chartRecord;
  try {
    chartRecord = await prisma.chart.findUnique({ where: { id: chartId } });
  } catch (err) {
    return { ok: false, error: 'invalid', message: (err as Error).message };
  }
  if (!chartRecord || chartRecord.userId !== session.sub) {
    return { ok: false, error: 'chart-not-found' };
  }

  // Quota gate
  const quota = await getMasterChatQuota(session.sub);
  if (!quota.unlimited && quota.remaining <= 0) {
    return {
      ok: false,
      error: 'quota-exceeded',
      quotaUsed: quota.used,
      quotaLimit: quota.limit,
    };
  }

  // Get-or-create the conversation
  let conversation;
  if (incomingConvId) {
    conversation = await prisma.chatConversation.findUnique({ where: { id: incomingConvId } });
    if (!conversation || conversation.userId !== session.sub || conversation.chartId !== chartId) {
      return { ok: false, error: 'invalid', message: 'conversation mismatch' };
    }
  } else {
    conversation = await prisma.chatConversation.create({
      data: {
        userId: session.sub,
        chartId,
        title: question.slice(0, 40),
      },
    });
  }

  // Build the messages array — load full history, append the new user question
  const priorMessages = await prisma.chatMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
  });

  const history: ChatTurn[] = priorMessages
    .slice(-MAX_TURNS_IN_CONTEXT)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  history.push({ role: 'user', content: question });

  // Build chart-context system vars
  const chart = chartRecord.chartJson as unknown as Chart;
  const birth = chartRecord.birthInfo as {
    year: number; month: number; day: number; hour: number; minute: number;
    gender: 'M' | 'F'; calendar: 'solar' | 'lunar';
  };
  const birthSummary = `${birth.year}年${birth.month}月${birth.day}日${birth.hour}時 (${birth.calendar === 'lunar' ? '農曆' : '陽曆'})`;
  const palacesSummary = chart.palaces.map((p) => {
    const stars = p.stars.length === 0
      ? '空宮'
      : p.stars.map((s) => `${s.name}${s.brightness ?? ''}${s.transformation ? '化' + s.transformation : ''}`).join('、');
    return `${p.name} (${p.branch}, ${p.ganzhi})${p.isMingong ? ' [命宮]' : ''}${p.isShenGong ? ' [身宮]' : ''}: ${stars}`;
  }).join('\n');

  const archetype = deriveArchetype(chart);
  const currentYear = new Date().getFullYear();
  let currentYearGanzhi: string;
  try {
    // Use mid-February — safely past 立春 for any year.
    currentYearGanzhi = solarToLunar(currentYear, 2, 15, 12, 0).ganzhi.yearGanzhi;
  } catch {
    currentYearGanzhi = '';
  }

  // Call the AI
  let assistantText: string;
  let inputTokens = 0;
  let outputTokens = 0;
  let modelUsed = '';
  try {
    const result = await generateChat({
      promptId: 'master-chat',
      userId: session.sub,
      systemVars: {
        label: chartRecord.label || '命主',
        gender: birth.gender === 'M' ? '男' : '女',
        birthSummary,
        bureau: chart.bureau.bureau,
        yearGanzhi: chart.yearGanzhi,
        mingongStars: mingongStarsLine(chart),
        archetype: `${archetype.label} — ${archetype.tagline}`,
        palaces: palacesSummary,
        currentYear,
        currentYearGanzhi,
      },
      messages: history,
    });
    assistantText = result.text.trim();
    inputTokens = result.inputTokens;
    outputTokens = result.outputTokens;
    modelUsed = result.model;
  } catch (err) {
    console.warn('[chat/askMaster] generateChat failed:', (err as Error).message);
    return { ok: false, error: 'ai-failed', message: (err as Error).message };
  }

  // Persist both turns
  try {
    await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: question,
        },
      }),
      prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: assistantText,
          inputTokens,
          outputTokens,
          model: modelUsed,
        },
      }),
      prisma.chatConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      }),
    ]);
  } catch (err) {
    console.warn('[chat/askMaster] persist failed:', (err as Error).message);
    // Don't fail the request — the user already saw the answer; we just lose memory.
  }

  revalidatePath(`/chart/${chartId}`);
  return { ok: true, conversationId: conversation.id, assistant: assistantText };
}

/**
 * Load the most recent conversation for a chart (for restoring on page load).
 * Returns null when none exists.
 */
export async function loadLatestConversation(chartId: string) {
  const session = await getSession();
  if (!session) return null;

  const conv = await prisma.chatConversation.findFirst({
    where: { userId: session.sub, chartId },
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!conv) return null;

  return {
    id: conv.id,
    title: conv.title,
    messages: conv.messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/**
 * Start a fresh conversation on this chart (clears the chat panel).
 * Old conversations remain in the DB for history features later.
 */
export async function newConversation(chartId: string) {
  const session = await getSession();
  if (!session) redirect('/login');
  // Just signal a reset — the next askMaster() call with no conversationId
  // will create one. We just bust the cache so the panel re-renders empty.
  revalidatePath(`/chart/${chartId}`);
}
