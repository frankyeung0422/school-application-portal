# @ziwei/engine — RULES.md

This document is the **canonical reference** for every calculation in `packages/engine`. Every rule must cite its source. When two schools disagree, we pin the primary school and surface the alternative via the `school` parameter where applicable.

## Sources

| Code | Author | Title | Edition | Use |
|------|--------|-------|---------|-----|
| ZY   | 紫雲   | 紫微斗數導讀     | 商周出版, 2008 | **Primary** — palace + main-star + 四化 |
| LWJ  | 了無居士 | 紫微斗數新詮     | 時報出版, 1999 | Tiebreaker on disputed placements |
| SWH  | 邵偉華 | 鐵板神數秘訣解註 | 中州古籍, 2014 | Primary — 鐵板神數 verses |

## Standing rules

1. **Calendar**: All input birth times in solar calendar at user's local zone (default HKT +08:00). Convert to lunar via `lunar-javascript`. Year boundary uses 立春節氣 not 大年初一 (per ZY ch.2 §3, page 24).
2. **Mingong**: 命宮在寅宮加生月減生時 (counter-clockwise). See `palaces.ts:locateMingongBranch`. Source: ZY ch.3 page 38.
3. **Palace stems**: 五虎遁 from year stem. See `palaces.ts:stemOfBranch`. Source: ZY ch.3 page 45.
4. **五行局**: derived from 命宮 stem + branch via 納音五行 lookup. Source: ZY ch.4 page 51. **Not yet implemented**.
5. **紫微 placement**: by 五行局 and 生日. Source: ZY ch.4 table 4-2 page 56. **Not yet implemented**.
6. **14 main stars**: 紫微系 + 天府系 placement. Source: ZY ch.5 pages 62-78. **Not yet implemented**.
7. **Brightness (廟旺得利平閒陷)**: per-star × per-branch table. Source: ZY appendix B pages 312-318. **Not yet implemented**.
8. **四化**: year-stem activation table. See `transformations.ts:FOUR_TRANSFORMATIONS`. Source: ZY ch.9 table 9-1 page 134. **Note**: 紫雲派 table; 中州派 differs on 戊 and 庚 — see issue #1.
9. **Iron Plate verse set**: per 邵偉華 system. Source: SWH ch.2 pages 35-310. **Not yet implemented**.

## Disputed placements

| Star | Branch | ZY says | LWJ says | Engine uses | Issue |
|------|--------|---------|----------|-------------|-------|
| (none yet) | | | | | |

Fill this table as P3 corpus tests surface disagreements.

## Versioning

The engine emits `chart.engineVersion` on every result. When a rule changes (e.g., switching 四化 from 紫雲 to 中州 default), bump the minor version. Charts cached at older versions are NOT auto-invalidated; the calc-audit admin page lets us re-run any cached chart against the current version.

| Version | Date | Change |
|---------|------|--------|
| 0.1.0-dev | 2026-05-16 | Initial skeleton. Palace + 四化 table only; main stars + Iron Plate pending P3. |
