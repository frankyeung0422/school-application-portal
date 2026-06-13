# EBTCM — Evidence-Based Traditional Chinese Medicine

## Project Progress Tracker

### Overview

A clinical decision support platform that applies GRADE evidence ratings to Traditional Chinese Medicine (TCM), bridging ancient wisdom with modern evidence-based medicine. Similar in concept to evidence-based medicine platforms emerging from US AI firms, but focused specifically on TCM.

### Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Database:** PostgreSQL via Prisma v7
- **Styling:** Tailwind CSS v4
- **Auth:** NextAuth v5 (credentials + JWT)
- **Language:** TypeScript 5

---

## Phase 1: Foundation (Completed)

**Date:** Pre-2026-04-02

- [x] Project scaffolding (Next.js 16 + Tailwind + Prisma)
- [x] Comprehensive Prisma schema with 5 domains:
  - TCM Knowledge Base (Herbs, Formulas, Acupoints, Patterns)
  - Evidence Layer (GRADE ratings, CEBM levels)
  - Safety / Interactions (herb-drug, herb-herb, contraindications)
  - TCM-Western Medicine Bridge (ICD-10/ICD-11 condition mappings)
  - User / Auth (roles, bookmarks)
- [x] Seed data files (herbs, formulas, acupoints, conditions, patterns)
- [x] Shared component library (Badge, DetailTabs, EmptyState, LoadingState, Pagination)
- [x] Evidence grading utilities and TCM constant configs
- [x] Auth configuration (NextAuth with credentials provider)
- [x] Homepage with hero, stats, feature cards, GRADE explainer
- [x] Navbar with global search, navigation links, mobile menu
- [x] Herbs section — listing page with search/filter + detail page with tabs

## Phase 2: All Database Sections (Completed)

**Date:** 2026-04-02

- [x] **Formulas section** — `/formulas` listing + `/formulas/[id]` detail
  - FormulaCard component
  - Category filtering, search, pagination
  - Composition table with Jun/Chen/Zuo/Shi roles
  - Related patterns, evidence tab
  - API route: `GET /api/formulas`

- [x] **Acupuncture section** — `/acupuncture` listing + `/acupuncture/[id]` detail
  - AcupointCard component with WHO code badges
  - Meridian filtering (14 meridians), search, pagination
  - Location, actions, indications, contraindications
  - Related patterns, evidence tab
  - API route: `GET /api/acupuncture`

- [x] **Patterns section** — `/patterns` listing + `/patterns/[id]` detail
  - PatternCard component with pathology type coloring
  - Pathology type filtering (13 types), search, pagination
  - Key symptoms, tongue/pulse diagnosis, treatment principle
  - Recommended formulas and acupoints
  - Western condition mappings
  - Evidence tab
  - API route: `GET /api/patterns`

- [x] **Evidence section** — `/evidence` listing + `/evidence/[id]` detail
  - Grade & study type filtering
  - Full evidence detail: abstract, PICO, results, quality assessment
  - DOI and PubMed links
  - Linked herbs, formulas, acupoints, patterns
  - API route: `GET /api/evidence`

- [x] **Conditions section** — `/conditions` listing + `/conditions/[id]` detail
  - Search by condition name or ICD code
  - ICD-10, ICD-11, SNOMED code badges
  - Full TCM pattern differentiation view with tongue/pulse/symptoms
  - Pattern frequency ordering (Common/Occasional/Rare)
  - API route: `GET /api/conditions`

- [x] **Interaction Checker** — `/interactions`
  - Herb-drug interaction search
  - Herb-herb interaction search (classical types: Xiang Fan, Xiang Wei, etc.)
  - Severity ratings (Major/Moderate/Minor/Theoretical)
  - Clinical management guidance
  - Safety disclaimer

- [x] **Global Search** — `/search?q=...`
  - Searches across all 6 entity types simultaneously
  - Grouped results by category with counts
  - Top 10 results per category

---

## Phase 3: Auth, Bookmarks, Admin, Visualization (Completed)

**Date:** 2026-04-03

- [x] **Database seeding** — Unified `prisma/seed.ts` with `npm run seed`
  - Seeds users (admin + demo practitioner), herbs, formulas, acupoints, patterns, conditions
  - Creates all relationships: FormulaHerb, PatternFormula, PatternAcupoint, ConditionPatternMapping
  - Seeds evidence entries with herb/formula/acupoint links
  - Seeds herb-drug interactions, herb-herb interactions, contraindications
  - Idempotent (clears before seeding)

- [x] **Authentication UI** — Login/register pages, session management
  - `/login` — email/password sign-in with NextAuth credentials provider
  - `/register` — account creation with role selection (Public/Practitioner)
  - `POST /api/auth/register` — user registration endpoint with validation
  - SessionProvider wrapper in layout
  - Navbar shows auth state (login/logout, user name, role)

- [x] **User bookmarks** — Save/unsave any entity
  - `GET/POST/DELETE /api/bookmarks` — full CRUD API
  - `BookmarkButton` client component on detail pages
  - `/bookmarks` — listing page with type filtering and counts
  - Protected routes redirect to login

- [x] **Admin dashboard** — Full management interface
  - `/admin` — dashboard with stats cards, evidence grade distribution, recent entries
  - `/admin/herbs` — table listing with search, pagination, CRUD (create/edit/delete)
  - `/admin/formulas` — table listing with herb count
  - `/admin/acupuncture` — table listing by code/meridian
  - `/admin/patterns` — table listing with pathology type badges
  - `/admin/evidence` — table listing with grade badges
  - `/admin/conditions` — table listing with ICD codes, pattern count
  - `/admin/users` — user management table with roles, bookmark counts
  - `HerbForm` component — full create/edit form with multi-select for flavors/meridians
  - All admin routes protected (ADMIN/EDITOR roles only)
  - Admin API routes: `POST/PUT/DELETE /api/admin/{entity}/[id]`

- [x] **Data visualization** — Evidence analytics on homepage
  - Live database stats (counts for all entity types)
  - Evidence grade distribution bar chart (A/B/C/D with percentages)
  - Study type distribution chart (sorted by count)
  - Graceful fallback when database not yet seeded

---

## Gap-Fill Cycle (Completed)

**Date:** 2026-05-09 — 2026-05-10

After 100+ enrich-* batches grew totals to 685 evidence / 281 formulas, the
audit phase of the auto-improve engine flagged 147 formulas without herb
compositions and 172 evidence entries without any cross-links. This cycle
focused on closing those data-quality gaps rather than adding new orphans.

- [x] **Filled 147 orphan formula compositions** (`scripts/fill-orphan-formulas.ts`)
  - Textbook compositions for classical 傷寒論/金匱要略/溫病條辨 formulas with
    Jun/Chen/Zuo/Shi roles and dosages
  - Tonifying classics: 六味地黃丸 family, 四君子/四物/逍遙 family, 補中益氣湯 etc.
  - Heat-clearing, blood-activating, harmonizing, astringent, wind-extinguishing,
    and patent-medicine compositions (安宮牛黃丸, 紫雪丹, 至寶丹, 蘇合香丸 …)
  - Idempotent re-runs: top up partial fills as new herbs become available
  - **Result:** 1,033 new FormulaHerb links across 147 formulas

- [x] **Added 47 missing referenced herbs** (`scripts/add-missing-herbs.ts`)
  - Common formula constituents that were referenced but absent: 麝香, 牛黃,
    水牛角 (犀角 substitute), 粳米, 蔥白, 前胡, 竹葉, 茯神, 豆豉, 防己, 川烏,
    雄黃, 荊芥, 肉豆蔻, 天門冬, 老蔥, 冬瓜仁, 甘遂, 白前, 草豆蔻, 罌粟殼,
    茜草根, 秦皮, 黃蜀葵花, 雞子黃, 穿山甲 (王不留行 sub), 赤石脂, 牽牛子,
    蛇膽, 夜交藤, 花椒, 飴糖, 烏梅, 細辛, 蘆根, 葦莖, 木通, 鱉甲, 辛夷, 玳瑁,
    羚羊角, 寒水石, 磁石, 丁香, 硝石, 代赭石, 小茴香, 射干, 兩頭尖, 麻黃根,
    浮小麥, 烏靈菌絲體
  - Each entry: nature, flavour, meridians, dosage, classical use, modern
    pharmacology, and CITES/safety flags where relevant

- [x] **Linked 98 of 172 orphan evidence entries** (`scripts/link-orphan-evidence.ts`,
  `link-orphan-evidence-v3.ts`)
  - Pass 1 (substring matcher): 15 entries linked to formulas/herbs/acupoints
    by Chinese name; acupoints require an "acupuncture context" guard
  - Pass 2/3 (condition→pattern resolver): 83 entries linked via 145 keyword
    aliases mapping disease names (Chinese + English/abbreviation) to
    westernName substrings, then to ConditionMapping primary patterns
  - **Result:** 251 new evidence cross-links across 98 entries

- [x] **Deleted 60 generic bibliographic placeholders**
  (`scripts/delete-bibliographic-placeholders.ts`)
  - "中醫藥研究第131-190輯" entries auto-generated by an earlier batch had
    intervention="中醫藥干預" and no specific entity to link to
  - Removed to lift evidence count quality (685 → 625, all remaining entries
    are real research records)

- [x] **Closed both orphan-pattern gaps**
  - 涼燥犯肺 → 杏蘇散 (Xing Su San)
  - 營分證 → newly created 清營湯 (Qing Ying Tang, 溫病條辨), with full 9-herb
    composition

### Final database state (post-cycle)

```
Herbs:               536  (+47)
Formulas:            282  (+1, +1033 herb links)
Acupoints:           377
Patterns:             77  (0 still without formulas)
Evidence:            625  (-60 placeholders, +251 new links)
Course Lessons:      135
```

### Audit phase output (post-cycle)

```
herbs_missing_description    0
herbs_missing_pharmacology   0
formulas_without_herbs       0   (was 147)
evidence_without_links      14   (was 172)
patterns_without_formulas    0   (was   2)
patterns_without_acupoints   0
```

The 14 remaining evidence orphans are specialty topics with no matching DB
condition (NADA auricular protocol, ICD-11 standardisation milestone,
acupuncture practice surveys, herb attitude surveys, etc.) — they remain as
real bibliographic records but lack a clean entity to link to.

---

## Phase 4: Planned (Not Yet Started)

- [ ] **Advanced search** — Full-text search, multi-criteria filtering
- [ ] **Export/Print** — PDF reports for practitioners
- [ ] **API authentication** — Protect write endpoints, rate limiting
- [ ] **Responsive polish** — Mobile-optimized layouts for all pages
- [ ] **Accessibility** — ARIA labels, keyboard navigation, screen reader support
- [ ] **i18n** — Chinese language support (simplified + traditional)
- [ ] **PubMed integration** — Auto-fetch study metadata from PubMed API

---

## Architecture Notes

### Directory Structure

```
src/
  app/
    page.tsx              # Homepage with live stats + visualizations
    login/                # Login page
    register/             # Registration page
    bookmarks/            # User bookmarks listing
    herbs/                # Herb listing + detail
    formulas/             # Formula listing + detail
    acupuncture/          # Acupoint listing + detail
    patterns/             # Pattern listing + detail
    evidence/             # Evidence listing + detail
    conditions/           # Condition listing + detail
    interactions/         # Interaction checker
    search/               # Global search
    admin/                # Admin dashboard + CRUD pages
    api/                  # REST API endpoints
      auth/               # NextAuth + register
      bookmarks/          # Bookmark CRUD
      admin/              # Admin entity CRUD
  components/
    layout/Navbar.tsx     # Global nav with auth state
    auth/                 # SessionProvider, LoginForm, RegisterForm
    admin/                # DeleteButton, HerbForm
    herbs/                # Herb-specific components
    formulas/             # Formula-specific components
    acupuncture/          # Acupoint-specific components
    patterns/             # Pattern-specific components
    evidence/             # Evidence-specific components
    shared/               # Reusable (Badge, BookmarkButton, etc.)
  lib/
    db/prisma.ts          # Prisma client singleton
    auth/authOptions.ts   # NextAuth config
    utils/                # Evidence grades, TCM constants
  types/                  # TypeScript declarations
prisma/
  schema.prisma           # Database schema (27 models)
  seed.ts                 # Unified seed script
  seeds/                  # Seed data files
```

### Key Design Decisions

1. **Server Components by default** — All listing and detail pages are server components that fetch data directly via Prisma, no API calls needed for SSR.
2. **API routes for external consumers** — REST endpoints mirror the page data for potential mobile app or third-party integrations.
3. **GRADE evidence system** — Every therapy link includes a Grade A-D rating with CEBM level classification.
4. **Cross-referencing** — All entities are linked (herbs → formulas → patterns → conditions → evidence), enabling comprehensive clinical navigation.
