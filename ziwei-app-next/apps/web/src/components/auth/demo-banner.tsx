import { isDemoMode } from '@/lib/auth/db-mode';

/**
 * Renders only when the app is running against the placeholder DATABASE_URL
 * (Path A bootstrap). Tells the user that auth is synthetic and not persisted.
 * Server Component — no client JS.
 */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div
      className="mb-4 rounded-[var(--radius)] border border-[var(--color-gold)] bg-[var(--color-bg-elevated)] p-3 text-xs text-[var(--color-fg-muted)]"
      role="status"
    >
      <span className="font-semibold text-[var(--color-gold-bright)]">示範模式</span> —
      你正在使用 Path A 預覽,任何電郵與密碼均可登入,資料不會儲存。
      要啟用真實註冊,請參考 <code className="text-[var(--color-gold)]">README.md</code> 設定 Postgres。
    </div>
  );
}
