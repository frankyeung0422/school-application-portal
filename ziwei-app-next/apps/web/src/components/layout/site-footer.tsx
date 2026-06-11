import Link from 'next/link';
import { InkDivider } from '@/components/chart';

export const SiteFooter = () => (
  <footer className="mt-24 border-t border-[var(--color-border)] bg-[var(--color-bg-deep)]">
    <div className="max-w-[var(--max-w-content)] mx-auto px-6 py-12">
      <div className="grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="font-display text-xl font-semibold text-gold-foil">紫微閣</div>
          <p className="mt-3 text-sm text-[var(--color-fg-muted)] max-w-md">
            結合千年命理智慧與當代人工智能。深度個人命盤、流年分析、命理預警 — 為認真追尋人生方向的您而設。
          </p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-3">產品</div>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link href="/sample" className="text-[var(--color-fg-muted)] hover:text-[var(--color-gold-bright)]">
                免費試讀
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="text-[var(--color-fg-muted)] hover:text-[var(--color-gold-bright)]">
                訂閱方案
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-3">支援</div>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link href="/about" className="text-[var(--color-fg-muted)] hover:text-[var(--color-gold-bright)]">
                關於我們
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-[var(--color-fg-muted)] hover:text-[var(--color-gold-bright)]">
                私隱政策
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-[var(--color-fg-muted)] hover:text-[var(--color-gold-bright)]">
                服務條款
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <InkDivider variant="subtle" />
      <div className="text-xs text-[var(--color-fg-subtle)] text-center">
        © {new Date().getFullYear()} 紫微閣 · aifortunetelling.org · 命理參考用途, 不構成任何醫療、財務或法律建議。
      </div>
    </div>
  </footer>
);
