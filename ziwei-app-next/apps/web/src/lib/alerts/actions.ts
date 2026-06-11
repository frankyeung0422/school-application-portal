'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

/** Mark an alert read (ownership-checked). */
export async function markAlertReadAction(formData: FormData) {
  const session = await requireSession();
  const id = formData.get('id') as string;
  if (!id) return;
  await prisma.alert.updateMany({
    where: { id, userId: session.sub },
    data: { isRead: true },
  });
  revalidatePath('/dashboard/alerts');
}

/** Dismiss an alert (ownership-checked). */
export async function dismissAlertAction(formData: FormData) {
  const session = await requireSession();
  const id = formData.get('id') as string;
  if (!id) return;
  await prisma.alert.updateMany({
    where: { id, userId: session.sub },
    data: { isDismissed: true, isRead: true },
  });
  revalidatePath('/dashboard/alerts');
}
