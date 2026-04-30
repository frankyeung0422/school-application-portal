import { runHgScrape } from "./hg-platform";
import type { ScrapeResult } from "./types";

/**
 * Crown (皇冠) sportsbook scraper. Same HG platform as winbao, just a different
 * skin and login URL. The mirror domain rotates — 838info.com lists hga030 /
 * hga035 / hga038 / hga050 / hga027 as currently active. We default to
 * hga030.com (verified reachable from this host 2026-04-30) and let the
 * operator override via CROWN_URL.
 *
 * Login form selectors match winbao's (the platform doc comment on
 * hg-platform.ts confirms both run the same engine). Imperva/Incapsula on the
 * Crown host 403s headless Chromium at the login POST, so forceHeaded mirrors
 * winbao's setting.
 */
export async function scrapeCrown(): Promise<ScrapeResult> {
  try {
    const odds = await runHgScrape({
      site: "crown",
      loginUrl: process.env.CROWN_URL || "https://hga030.com/",
      username: process.env.CROWN_USER || "",
      password: process.env.CROWN_PASS || "",
      // Crown's skin uses #usr/#pwd/#btn_login (verified via probe_crown_smoke
      // 2026-04-30); winbao's HG skin uses #username/#fr_password/input[name=fr_submit].
      // Same engine, different login-form IDs.
      userSel: "#usr",
      passSel: "#pwd",
      submitSel: "#btn_login",
      profileDir: "crown",
      proxy: process.env.CROWN_PROXY || undefined,
      forceHeaded: process.env.CROWN_HEADLESS !== "true",
      // Crown redirects post-login (after the PIN modal is dismissed) to an
      // IP-based URL whose TLS cert CN doesn't match — Chrome blocks the
      // navigation with NET::ERR_CERT_COMMON_NAME_INVALID and we end up on
      // chrome-error://chromewebdata/. Without these flags goToShowtype
      // can't find #today_page/#early_page/#live_page because we're not on
      // the actual app. Same flags hg-platform docs as needed for crown's
      // iovation iframe.
      allowInsecure: true,
    });
    return { site: "crown", ok: true, odds };
  } catch (e: any) {
    return { site: "crown", ok: false, error: String(e?.message || e), odds: [] };
  }
}
