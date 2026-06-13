/**
 * One-time setup: convert a short-lived User Access Token (from Graph API
 * Explorer) to a long-lived **Page Access Token** that never expires.
 *
 * Usage:
 *   1. Put FB_APP_ID + FB_APP_SECRET + FB_PAGE_ID in .env
 *   2. Run: npx tsx scripts/extend-fb-token.ts <SHORT_LIVED_USER_TOKEN>
 *   3. Copy the printed token into .env as FB_PAGE_ACCESS_TOKEN
 *
 * Background: Page tokens derived from a long-lived user token do not expire
 * (https://developers.facebook.com/docs/facebook-login/access-tokens/refreshing/).
 * So you do this dance once, then never again — unless you revoke perms.
 */
import "dotenv/config";
import { extendToLongLivedPageToken } from "../src/lib/facebook/client";

async function main() {
  const shortToken = process.argv[2];
  if (!shortToken) {
    console.error("Usage: npx tsx scripts/extend-fb-token.ts <SHORT_LIVED_USER_TOKEN>");
    console.error("\nGet the short-lived User Access Token from:");
    console.error("  https://developers.facebook.com/tools/explorer/");
    console.error("Select your App → Get User Access Token →");
    console.error("permissions: pages_show_list, pages_manage_posts, pages_read_engagement");
    process.exit(2);
  }

  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  const pageId = process.env.FB_PAGE_ID;

  if (!appId || !appSecret || !pageId) {
    console.error("Set FB_APP_ID + FB_APP_SECRET + FB_PAGE_ID in .env first.");
    process.exit(2);
  }

  console.log("[extend-fb-token] exchanging short-lived user token for long-lived Page token…");
  const result = await extendToLongLivedPageToken({
    shortLivedUserToken: shortToken,
    appId,
    appSecret,
    pageId,
  });

  if (!result.ok) {
    console.error("✕ Failed:", result.error);
    process.exit(1);
  }

  console.log("\n✅ Long-lived Page Access Token:");
  console.log(result.longLivedPageToken);
  console.log("\nPaste this into .env as:");
  console.log(`FB_PAGE_ACCESS_TOKEN="${result.longLivedPageToken}"`);
  console.log("\nThis token does NOT expire (unless you revoke permissions).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
