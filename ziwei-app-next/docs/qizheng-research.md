# 果老星宗 (七政四餘) — Unique Predictions & Three-System Synthesis

This document is both the research deliverable the integration was asked to produce and
the source-of-truth the `qizheng-reading` AI prompt draws from. It records (A) what 果老星宗
can predict that 紫微斗數 and 八字 cannot, and (B) how triangulating all three systems
produces insight no single one gives.

> **Provenance & verification.** Sections marked **[VERIFY]** are derived from domain
> knowledge and standard astronomy and should be confirmed against an authoritative
> 七政四餘 排盤 / primary texts before being treated as production-grade. The engine's
> correctness levers (ayanāṃśa, 距星 longitudes, 紫氣 epoch, house system) live in
> `packages/engine/src/qizheng/config.ts` and `.../data/` and are stamped onto every chart
> (`QizhengChart.config`) for reproducibility.

---

## 0. Why 果老 is structurally different

| | 八字 BaZi | 紫微斗數 ZiWei | 果老星宗 QiZheng |
|---|---|---|---|
| Input | 干支 calendar | lunar month/day/hour | **real ephemeris** (date+time+**place**) |
| "Stars" | none (五行 of 干支) | **virtual** (紫微…七殺 placed by rule) | **real** Sun/Moon/5 planets + 4 computed points |
| Frame | calendrical | 12 fixed branch palaces | **ecliptic longitude → 二十八宿 + 十二宮** |
| Ascendant | n/a | n/a | **命度** — changes with birthplace |
| Timing | 大運 (10-yr) | 大限/流年 (palace) | **行限 by degree + real planetary transits (to-the-day)** |

Only 果老 reads the **actual sky**: two people born the same hour in different cities get
**different charts** (different 命度). This is the root of every unique prediction below.

Engine pipeline (see `packages/engine/src/qizheng/index.ts`):
local time → JDE → geocentric ecliptic-of-date longitudes (astronomy-engine) → 四餘
(Meeus mean-node/apogee + synthetic 紫氣) → subtract ayanāṃśa → bin into 宿/宮 → ascendant
+ whole-sign 十二宮 → 廟旺落陷 + 命主星/身主星.

---

## Part A — 12 predictions only 果老 produces

Each item names the 曜/宮/技法 that generates it and why the calendar-based systems can't.

1. **相貌 / 氣質 (physical appearance & first impression)** — from the **命度 (ascendant
   sign)** + the condition of the **命主星**. ZiWei reads 相貌 only obliquely (命宮主星
   imagery); BaZi infers body type from 五行 balance. Only 果老 ties it to the *actual rising
   degree*, which is why it's birthplace-sensitive. *(Engine: `ascendant.sign`, `mingLord`.)*

2. **Dated event timing by real planetary transit** — a real planet crossing a natal point
   or house cusp gives a **calendar-precise** window. BaZi's 大運/流年 and ZiWei's 流年 resolve
   to a *year*; transits resolve to a *day*. *(Engine: natal `bodies[].lonSidereal`; transit
   layer is the Phase-C extension.)* **[VERIFY] transit rules**

3. **Monthly forecast from 太陽過宮 + solar return** — the Sun's ingress into each 宮 (≈monthly)
   and its annual return to natal longitude structure the year in a way neither other system
   has a moving Sun to do.

4. **Eclipse-sensitivity via 羅睺/計都** — the lunar nodes (real ascending/descending node)
   over natal points flag eclipse-activated periods. No nodal axis exists in BaZi/ZiWei.
   *(Engine: `bodies` 羅睺/計都.)*

5. **Talent & profession graded by planetary dignity (廟旺落陷)** — a planet in 廟/旺 shows a
   *naturally strong* faculty; in 落/陷 a *hard-won* one. e.g. dignified 水 (Mercury) →
   scholarship/commerce/speech; 金/火 strong → metal/military/craft. ZiWei has 廟陷 too, but on
   *virtual* stars by fixed palace, not a real planet in a real sign. *(Engine: `bodies[].dignity`
   via `data/dignities.ts`.)*

6. **Life-spine from the 命主星 (chart ruler)** — the domicile ruler of the ascendant sign,
   read by its own dignity + house, is the single thread of the life. *(Engine: `mingLord`.)*

7. **Degree-based 行限 age map** — progressing the chart by degrees-per-year yields a continuous
   age-by-age event map, finer than discrete 10-year pillars. **[VERIFY] 行限 rate**

8. **Aspect-based help/conflict (照拱夾守)** — angular relationships between *real* planetary
   longitudes (conjunction/opposition/trine) show who/what helps or obstructs.
   **[VERIFY] orb conventions**

9. **Birthplace-sensitive / twin-discriminating charts** — same instant, different latitude or
   longitude → different 命度 and house layout. The engine's hash includes lat/long for exactly
   this reason. *(Engine: `ascendant` depends on `birth.latitude/longitude`.)*

10. **Hidden-affliction reading via 月孛 (lunar apogee)** — the apsidal point marks concealed
    enmity / latent affliction; its house shows where. *(Engine: 月孛 in `bodies`.)*

11. **Nobility / literary-honor windows via 紫氣** — the synthetic benefic's house and transits
    mark scholarship/recognition. *(Engine: 紫氣 in `bodies`; epoch **[VERIFY] needs calibration**.)*

12. **Body-vs-spirit dual rulers (命主星 vs 身主星)** — 日 governs spirit/vitality, 月 governs
    form/body; the split between the ascendant ruler and the Moon-sign ruler reads the tension
    between inner drive and physical constitution. *(Engine: `mingLord` vs `shenLord`.)*

The `qizheng-reading.yaml` prompt deliberately leads with **1, 5, 6, 10** (and gates 2/3/4/7
for the paid tier) because those are the visibly "real-sky" outputs a BaZi/ZiWei app cannot fake.

---

## Part B — 三盤合參: triangulating BaZi + ZiWei + 果老

### B.1 Is combining them traditional?

Partly. The **星平合參** pairing is genuine and old: **《星平會海》** binds 子平/八字 ("平") and
五星/七政四餘 ("星") in one compendium, and 七政四餘 has three classical schools
(琴堂五星、果老星宗、天官五星), 果老 attributed to 張果老. **紫微斗數 sits *outside* this pairing**
— a separate lineage (attrib. 陳希夷/陳摶). So:

- **星 + 平 (果老 + 八字)** = documented tradition.
- **+ 紫微** = a genuine, *novel* third leg this product adds. The doc and prompts flag this so
  invented cross-patterns are never presented as canon. **[VERIFY] 星平會海 attribution**

### B.2 Comparative advantage (what each is *best* at)

- **八字** — 五行 balance & 用神 (what the chart *needs*), 大運 life-phase timing, personality &
  career via 十神. Best at *strategy* ("what element/direction serves this life").
- **紫微斗數** — granular life-domain mapping via 12 palaces, 四化飛星 linking palaces, 流年 palace
  activation. Best at *specificity* ("which domain lights up, and when, by year").
- **果老星宗** — real-sky dignity (廟旺落陷), 相貌/命度, and **to-the-day** transit timing. Best at
  *appearance/talent* and *precise timing*.

### B.3 Synthesis patterns (insight only triangulation gives)

> Mechanism: each system emits *themes* with a *polarity* (favourable/adverse) and a *time*.
> Agreement across systems = high confidence; disagreement = a nuance to surface, not hide.

1. **Triple-confirmed life strategy.** BaZi 用神 = 火 ∧ 果老 火星 廟 ∧ ZiWei 太陽/火星 well-placed
   → "fire-favourable" strategy stated with high confidence (3/3).
2. **Hard-period convergence (timing).** BaZi 大運 turning year ∧ ZiWei 流年化忌 hitting a palace ∧
   果老 土星/羅計 transit over a natal malefic → a high-confidence caution window, *dated* by the
   transit that the other two can only place to the year.
3. **Wealth window.** BaZi 財星 strong in a 大運 ∧ ZiWei 財帛宮 化祿 ∧ 果老 金/木 廟 in 財帛 → a
   confident "wealth peaks in mid-40s" with a 果老 month-of-year refinement.
4. **Career direction.** ZiWei 官祿宮 主星 ∧ 八字 十神 (官/印 vs 食傷) ∧ 果老 命主星 dignity + house
   → vocation that all three point at.
5. **Appearance/health complement.** 果老 命度+命主 (looks) and 疾厄宮 real planets ∧ ZiWei 疾厄宮 ∧
   BaZi 五行 body-system mapping → a fuller body/health picture than any one (see B.4).
6. **Relationship.** ZiWei 夫妻宮 四化 ∧ BaZi 配偶星/十神 ∧ 果老 金 (Venus) dignity + 夫妻宮 →
   convergent or divergent marriage signal.
7. **Talent specificity.** BaZi 食傷 (output/creativity) ∧ ZiWei 文昌文曲 ∧ 果老 水 (Mercury) 廟 →
   "intellectual/communicative gift" triple-stamped.
8. **Contradiction as nuance — strength.** BaZi day-master *strong* but 果老 命主星 *落陷*: read as
   "inner drive exceeds outward circumstance — effortful expression," not a verdict. Surface the
   tension; don't average it away.
9. **Contradiction — timing mismatch.** ZiWei flags a good 流年 but 果老 shows a malefic transit:
   read as "opportunity arrives under friction; timing within the year matters."
10. **Confidence-scored timeline.** Merge BaZi 大運 + ZiWei 流年 + 果老 transits into one timeline
    where each year/period carries a 1–3 agreement score.

### B.4 Convergence = confidence — defensible?

Yes, with care. The tradition's own **一事多斷 / 參斷 / 星平互參** practice cross-checks a single
judgment across methods and trusts a reading more when methods agree. The product formalizes this:
**N-system agreement → confidence band**; disagreement → an explicitly flagged nuance. This is the
foundation for the deferred **consensus engine** (Phase B), not shipped in this MVP.

### B.5 Appearance & health, three ways

- **果老** — 相貌宮 + 命度 (looks/constitution) and 疾厄宮 real planets (which organ-systems the
  malefics stress); dignity says how robust.
- **紫微** — 疾厄宮 主星 + 四化 (domain-level health events by year).
- **八字** — 五行 excess/deficiency mapped to organ systems (木肝 火心 土脾 金肺 水腎); the *balance*
  view.
Together: 果老 says *where in the body and when*, ZiWei says *which year it activates*, BaZi says
*the underlying elemental imbalance to correct*.

---

## Part C — Product surface (this MVP + what's next)

**Shipped (MVP):** a 果老 chart engine, `/qizheng/sample` → result with chart view + an AI reading
that leads with the Part-A unique predictions; saved charts at `/qizheng/[id]`.

**Next (deferred, foundation laid here):**
- **Consensus reading** — the Part-B agreement matrix across the user's BaZi/ZiWei/果老 charts.
- **Planetary-transit calendar** — the to-the-day timing (Part-A #2/#3/#4) BaZi/ZiWei can't give.
- **Appearance/talent profile** — Part-A #1/#5/#6 as a standalone shareable.

---

## Sources

- 《果老星宗》 (《新鐫張果星宗》, Ming) — core text.
- 萬民英 《星學大成》 (Ming) — encyclopedic 七政四餘 compendium (same author as BaZi's 《三命通會》).
- 《星平會海》 — the 星 (七政四餘) + 平 (子平) cross-reference compendium (ctext.org).
- 《七政四餘萬年曆》 — the ephemeris tables.
- J. Meeus, *Astronomical Algorithms* (2nd ed.), ch. 22 (obliquity), ch. 47 (mean node, apogee).
- astronomy-engine (Don Cross, MIT) — ephemeris used by the engine.
- Lahiri / Chitrapakṣa ayanāṃśa (角宿一/Spica-anchored) — sidereal frame for 二十八宿.

*Items marked **[VERIFY]** above should be confirmed via a live deep-research pass and against a
trusted 七政四餘 排盤 before any of the affected output is treated as authoritative.*
