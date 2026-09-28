import path from "node:path";
import { mkdir } from "node:fs/promises";
import type { BrowserContext } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import type { Platform } from "../types";
import { cleanProfile } from "./browser-cleanup";
import { withRetry } from "./rate-limit";

chromium.use(stealth());

// Chinese anti-bot platforms detect headless Chromium even with stealth —
// default them to headed; JD/Amazon/eBay tolerate headless.
const HEADED_PLATFORMS: Platform[] = ["TAOBAO", "ALI1688", "PDD"];

// Western storefronts geo/locale-negotiate their content. A zh-CN context makes
// AliExpress serve 中文 titles and non-USD prices, which breaks both the English
// blocking tokens and the FX assumptions — so pin those platforms to en-US.
const WESTERN_PLATFORMS: Platform[] = [
  "ALIEXPRESS",
  "ALIBABA",
  "AMAZON",
  "EBAY",
];

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export function profileDirFor(platform: Platform): string {
  return path.join(process.cwd(), ".browser_profiles", platform.toLowerCase());
}

export interface OpenContextOptions {
  headed?: boolean;
}

// Every context this process opened and has not closed. The worker's watchdog
// closes them all when a job overruns, which makes the hung call reject.
const openContexts = new Set<BrowserContext>();

export async function closeAllContexts(): Promise<number> {
  const all = [...openContexts];
  openContexts.clear();
  await Promise.all(all.map((c) => closeQuietly(c)));
  return all.length;
}

export async function openPlatformContext(
  platform: Platform,
  opts: OpenContextOptions = {},
): Promise<BrowserContext> {
  const profileDir = profileDirFor(platform);
  await mkdir(profileDir, { recursive: true });

  const envHeadless = process.env.HEADLESS;
  const headless =
    opts.headed === true
      ? false
      : envHeadless !== undefined && envHeadless !== ""
        ? envHeadless === "true"
        : !HEADED_PLATFORMS.includes(platform);

  const western = WESTERN_PLATFORMS.includes(platform);

  const ctx = await withRetry(
    async () => {
      try {
        return await chromium.launchPersistentContext(profileDir, {
          headless,
          viewport: { width: 1440, height: 900 },
          userAgent: DESKTOP_UA,
          locale: western ? "en-US" : "zh-CN",
          timezoneId: western ? "America/New_York" : "Asia/Shanghai",
          args: [
            "--disable-blink-features=AutomationControlled",
            "--no-first-run",
            "--no-default-browser-check",
          ],
          timeout: 60000,
        });
      } catch (e) {
        // A crashed previous run leaves the profile locked — clean and rethrow
        // so withRetry launches again on a clean profile.
        await cleanProfile(profileDir);
        throw e;
      }
    },
    { attempts: 3, baseDelayMs: 2000 },
  );
  openContexts.add(ctx);
  ctx.on("close", () => openContexts.delete(ctx));
  return ctx;
}

export async function closeQuietly(ctx: BrowserContext | null | undefined) {
  try {
    await ctx?.close();
  } catch {
    // ignore
  }
}
