"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  if (totalPages <= 1) return null;

  function pageUrl(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `${pathname}?${params.toString()}`;
  }

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1 py-4">
      {currentPage > 1 && (
        <Link
          href={pageUrl(currentPage - 1)}
          className="rounded-md px-3 py-2 text-sm text-muted hover:bg-background"
        >
          {t("pagination.previous")}
        </Link>
      )}
      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-muted">...</span>
        ) : (
          <Link
            key={page}
            href={pageUrl(page)}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              page === currentPage
                ? "bg-primary text-white"
                : "text-muted hover:bg-background"
            }`}
          >
            {page}
          </Link>
        )
      )}
      {currentPage < totalPages && (
        <Link
          href={pageUrl(currentPage + 1)}
          className="rounded-md px-3 py-2 text-sm text-muted hover:bg-background"
        >
          {t("pagination.next")}
        </Link>
      )}
    </nav>
  );
}
