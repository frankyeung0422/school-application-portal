/**
 * 果老星宗 engine configuration — the correctness levers.
 *
 * These constants are the single biggest source of chart drift, so they live in
 * one place, are stamped onto every chart (QizhengChart.config), and are
 * snapshot-tested. See docs/qizheng-research.md for the rationale + the
 * [VERIFY] items to confirm against an authoritative 排盤 before production.
 */

export const QIZHENG_ENGINE_VERSION = '0.1.0' as const;

export const QIZHENG_CONFIG = {
  /**
   * Ayanāṃśa model. Default = Lahiri / Chitrapakṣa, which is anchored to
   * 角宿一 (Spica / α Vir) — exactly the 距星 the 果老 mansion sequence starts
   * from, making it the natural 距星-anchored choice for 二十八宿.
   */
  ayanamsa: 'lahiri',
  /** 羅睺 = 北交點 (ascending node); 計都 = 羅睺 + 180° (descending node). */
  luoCalcConvention: 'rahu=ascending-node, ketu=rahu+180',
  /**
   * 紫氣 is synthetic (no astronomical body): per 七政四餘 tradition it walks
   * one 宿 per year, one full circuit of the 28 mansions in 28 years (zh
   * wikipedia 七政四餘; likely modelled on the 太歲 convention, possibly tied
   * to the 19-year/7-leap-month cycle). Because it is non-astronomical there
   * is NO computable ground truth — schools disagree, and some modern
   * practitioners drop 紫氣 entirely. Calibration attempted 2026-06: Moira
   * ships binary-only, no open formula or dated anchor position was found in
   * 通書/曆書 sources online. The epoch longitude therefore REMAINS a
   * placeholder; treat 紫氣 placements as low-confidence (it is excluded from
   * the malefic set used by alerts, so this only affects display/chat).
   * [VERIFY] ziQiEpochLon — needs a paper 通書 four-remainder table or a
   * trusted desktop 排盤 (Moira) screenshot with a known date.
   */
  ziQiPeriodYears: 28,
  ziQiEpochJd: 2451545.0, // J2000.0
  ziQiEpochLon: 0, // [VERIFY] calibrate λ0 against a reference chart
} as const;

/** Default birthplace when none supplied — Hong Kong (matches the HKT tz default). */
export const DEFAULT_LATITUDE = 22.32;
export const DEFAULT_LONGITUDE = 114.17;
