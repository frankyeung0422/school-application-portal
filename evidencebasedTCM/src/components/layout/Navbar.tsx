"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSession, signOut } from "next-auth/react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

interface NavGroup {
  labelKey: string;
  links: { href: string; labelKey: string }[];
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isPatient = userRole === "PATIENT";
  const isResearcher = userRole === "RESEARCHER";
  const isPractitionerOrAbove = userRole === "PRACTITIONER" || userRole === "ADMIN" || userRole === "EDITOR";

  // Grouped navigation
  const navGroups: NavGroup[] = [
    {
      labelKey: "nav.knowledgeBase",
      links: [
        { href: "/herbs", labelKey: "nav.herbs" },
        { href: "/formulas", labelKey: "nav.formulas" },
        { href: "/acupuncture", labelKey: "nav.acupuncture" },
        { href: "/patterns", labelKey: "nav.patterns" },
        { href: "/doctors", labelKey: "nav.doctors" },
        { href: "/conditions", labelKey: "nav.conditions" },
        { href: "/food-therapy", labelKey: "nav.foodTherapy" },
        { href: "/evidence", labelKey: "nav.evidence" },
        { href: "/interactions", labelKey: "nav.interactions" },
      ],
    },
    {
      labelKey: "nav.clinicalTools",
      links: [
        { href: "/practitioner", labelKey: "nav.practitionerHome" },
        { href: "/patients", labelKey: "nav.patients" },
        { href: "/clinic", labelKey: "nav.clinic" },
        { href: "/certified-clinic", labelKey: "nav.certifiedClinic" },
        { href: "/referrals", labelKey: "nav.referrals" },
        { href: "/diagnose/symptoms", labelKey: "nav.diagnose" },
        { href: "/diagnose/constitution", labelKey: "nav.constitution" },
        { href: "/diagnose/prescription", labelKey: "nav.prescriptionScan" },
        { href: "/prescription", labelKey: "nav.prescription" },
        { href: "/safety/check", labelKey: "nav.safety" },
        { href: "/cases", labelKey: "nav.cases" },
      ],
    },
    {
      labelKey: "nav.researchLabel",
      links: [
        { href: "/research", labelKey: "nav.research" },
        { href: "/research/dashboard", labelKey: "nav.dashboard" },
        { href: "/improve", labelKey: "nav.improve" },
      ],
    },
    {
      labelKey: "nav.learn",
      links: [
        { href: "/learn", labelKey: "nav.learn" },
        { href: "/principles", labelKey: "nav.principles" },
      ],
    },
  ];

  // Smarter active-link check: exact match or starts-with but not a sibling
  const isActive = (href: string) => {
    if (pathname === href) return true;
    // For grouped paths like /research vs /research/dashboard, require exact for root
    if (href === "/research" && pathname.startsWith("/research/")) return false;
    if (href === "/learn" && pathname.startsWith("/learn/")) return true;
    return pathname.startsWith(href + "/");
  };

  const isGroupActive = (group: NavGroup) => group.links.some((l) => isActive(l.href));

  const toggleGroup = (key: string) =>
    setOpenDropdown((prev) => (prev === key ? null : key));
  const closeAll = () => setOpenDropdown(null);

  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => {
    setPortalReady(true);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface shadow-sm">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">
              EB
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-primary text-lg">EBTCM</span>
              <span className="hidden lg:inline text-xs text-muted ml-1">
                {t("nav.tagline")}
              </span>
            </div>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="min-w-0 max-w-md flex-1">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("nav.searchPlaceholder")}
                className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
              />
            </div>
          </form>

          {/* Desktop nav — dropdown groups */}
          <nav className="relative z-10 hidden shrink-0 items-center gap-1 lg:flex">
            {navGroups.map((group) => {
              // Single-link groups render as direct links
              if (group.links.length === 1) {
                const link = group.links[0];
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:text-foreground hover:bg-background"
                    }`}
                  >
                    {t(link.labelKey)}
                  </Link>
                );
              }

              // Multi-link groups render as dropdowns
              const isOpen = openDropdown === group.labelKey;
              return (
                <div
                  key={group.labelKey}
                  className={`relative ${isOpen ? "z-50" : "z-0"}`}
                  data-dropdown
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="menu"
                    onClick={() => toggleGroup(group.labelKey)}
                    className={`relative z-10 rounded-md px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                      isGroupActive(group) || isOpen
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:text-foreground hover:bg-background"
                    }`}
                  >
                    {t(group.labelKey)}
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div
                      role="menu"
                      className="absolute top-full left-0 z-20 mt-1 w-48 rounded-lg border border-border bg-surface shadow-lg py-1"
                    >
                      {group.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          role="menuitem"
                          onClick={closeAll}
                          className={`block px-4 py-2 text-sm transition-colors ${
                            isActive(link.href)
                              ? "bg-primary/10 text-primary"
                              : "text-muted hover:text-foreground hover:bg-background"
                          }`}
                        >
                          {t(link.labelKey)}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Auth + language */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            {session?.user ? (
              <>
                {/* Role-specific hub links */}
                {isPatient && (
                  <Link
                    href="/my-health"
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      pathname.startsWith("/my-health") ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground hover:bg-background"
                    }`}
                  >
                    🌿 My Health
                  </Link>
                )}
                {isResearcher && (
                  <Link
                    href="/researcher"
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      pathname.startsWith("/researcher") ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground hover:bg-background"
                    }`}
                  >
                    🔬 Research Hub
                  </Link>
                )}
                {isPractitionerOrAbove && (
                  <>
                    <Link
                      href="/subscription"
                      className="rounded-md px-2 py-2 text-sm text-muted hover:text-foreground hover:bg-background transition-colors"
                      title={t("nav.subscription")}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </Link>
                  </>
                )}
                <Link
                  href="/bookmarks"
                  className="rounded-md px-2 py-2 text-sm text-muted hover:text-foreground hover:bg-background transition-colors"
                  title={t("nav.bookmarks")}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </Link>
                {(userRole === "ADMIN" || userRole === "EDITOR") && (
                  <Link
                    href="/admin"
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      pathname.startsWith("/admin")
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:text-foreground hover:bg-background"
                    }`}
                  >
                    {t("nav.admin")}
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-md px-3 py-1.5 text-xs font-medium border border-border text-muted hover:text-foreground hover:bg-background transition-colors"
                >
                  {t("nav.signOut")}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/for-patients"
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-background transition-colors"
                >
                  Track Health
                </Link>
                <Link
                  href="/for-researchers"
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-background transition-colors"
                >
                  For Researchers
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
                >
                  {t("nav.signIn")}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden rounded-md p-2 text-muted hover:text-foreground hover:bg-background"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {portalReady &&
        openDropdown !== null &&
        createPortal(
          <div
            role="presentation"
            aria-hidden
            className="fixed inset-0 z-[45]"
            onPointerDown={() => setOpenDropdown(null)}
          />,
          document.body
        )}

      {mobileMenuOpen && (
        <nav className="lg:hidden border-t border-border bg-surface px-4 py-2 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-end py-2">
            <LanguageSwitcher />
          </div>
          {navGroups.map((group) => (
            <div key={group.labelKey} className="mb-2">
              {group.links.length > 1 && (
                <div className="px-3 py-1.5 text-xs font-semibold text-muted uppercase tracking-wider">
                  {t(group.labelKey)}
                </div>
              )}
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-md px-3 py-2 text-sm font-medium ${
                    isActive(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:text-foreground hover:bg-background"
                  }`}
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2">
            {session?.user ? (
              <>
                {isPatient && (
                  <Link href="/my-health" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-foreground">
                    🌿 My Health
                  </Link>
                )}
                {isResearcher && (
                  <Link href="/researcher" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-foreground">
                    🔬 Research Hub
                  </Link>
                )}
                <Link href="/bookmarks" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-foreground">
                  {t("nav.bookmarks")}
                </Link>
                {(userRole === "ADMIN" || userRole === "EDITOR") && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-foreground">
                    {t("nav.adminPanel")}
                  </Link>
                )}
                <button
                  onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                  className="block w-full text-left rounded-md px-3 py-2 text-sm font-medium text-red-500 hover:bg-background"
                >
                  {t("nav.signOut")} ({session.user.name || session.user.email})
                </button>
              </>
            ) : (
              <>
                <Link href="/for-patients" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-foreground">
                  Track My Health
                </Link>
                <Link href="/for-researchers" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-foreground">
                  For Researchers
                </Link>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-primary">
                  {t("nav.signIn")}
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
