import "dotenv/config";
import { prisma } from "../lib/prisma";
import { openPlatformContext, profileDirFor } from "../lib/sources/browser";
import { PLATFORMS, type Platform } from "../lib/types";

// One-time headed QR login: npm run login -- taobao
// Opens the platform login page in a headed browser on the persistent profile;
// scan the QR with the phone app, and the session persists for future crawls.

const LOGIN_TARGETS: Partial<
  Record<Platform, { loginUrl: string; loggedInCheck: (url: string) => boolean }>
> = {
  TAOBAO: {
    loginUrl: "https://login.taobao.com/member/login.jhtml",
    loggedInCheck: (url) => !url.includes("login"),
  },
  ALI1688: {
    loginUrl: "https://login.1688.com/member/signin.htm",
    loggedInCheck: (url) => !url.includes("login") && !url.includes("signin"),
  },
  // JD normally works logged-out, but some IPs (datacenter ranges) get a
  // passport redirect on every search — a one-time login fixes it.
  JD: {
    loginUrl: "https://passport.jd.com/new/login.aspx",
    loggedInCheck: (url) => !url.includes("passport.jd.com"),
  },
  PDD: {
    loginUrl: "https://mobile.yangkeduo.com/login.html",
    loggedInCheck: (url) => !url.includes("login"),
  },
  // eBay search works logged-out, but the SOLD/completed-listing filter
  // (LH_Sold=1) redirects anonymous users to sign-in + captcha. Logging in once
  // unlocks the median-sold-price and sell-through data that the ranker uses.
  EBAY: {
    loginUrl: "https://signin.ebay.com/ws/eBayISAPI.dll?SignIn",
    loggedInCheck: (url) =>
      !url.includes("signin.ebay.com") && !url.includes("splashui/captcha"),
  },
};

const POLL_MS = 3000;
const TIMEOUT_MS = 5 * 60 * 1000;

async function main() {
  const arg = (process.argv[2] ?? "").toUpperCase().replace("1688", "ALI1688");
  const platform = PLATFORMS.find((p) => p === arg || p === `ALI${arg}`);
  if (!platform || !LOGIN_TARGETS[platform]) {
    console.error(
      `Usage: npm run login -- <platform>\nPlatforms with login flows: ${Object.keys(LOGIN_TARGETS).join(", ")}`,
    );
    process.exit(1);
  }
  const target = LOGIN_TARGETS[platform]!;

  console.log(`Opening headed browser for ${platform} login...`);
  console.log(`Profile: ${profileDirFor(platform)}`);
  const ctx = await openPlatformContext(platform, { headed: true });
  const page = await ctx.newPage();
  await page.goto(target.loginUrl, { waitUntil: "domcontentloaded" });
  console.log("Scan the QR code with your phone app now (5 minute window)...");

  const deadline = Date.now() + TIMEOUT_MS;
  let success = false;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const url = page.url();
    if (target.loggedInCheck(url)) {
      // navigated away from the login page — verify it sticks
      await page.waitForTimeout(2000);
      if (target.loggedInCheck(page.url())) {
        success = true;
        break;
      }
    }
  }

  await prisma.platformSession.upsert({
    where: { platform },
    create: {
      platform,
      status: success ? "LOGGED_IN" : "LOGGED_OUT",
      profileDir: profileDirFor(platform),
      lastCheckedAt: new Date(),
    },
    update: {
      status: success ? "LOGGED_IN" : "LOGGED_OUT",
      lastCheckedAt: new Date(),
    },
  });

  console.log(
    success
      ? `${platform} login captured — session persisted in the browser profile.`
      : `${platform} login NOT detected within the window.`,
  );
  await ctx.close();
  await prisma.$disconnect();
  process.exit(success ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
