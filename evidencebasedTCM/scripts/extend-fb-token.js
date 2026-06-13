"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
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
require("dotenv/config");
var client_1 = require("../src/lib/facebook/client");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var shortToken, appId, appSecret, pageId, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    shortToken = process.argv[2];
                    if (!shortToken) {
                        console.error("Usage: npx tsx scripts/extend-fb-token.ts <SHORT_LIVED_USER_TOKEN>");
                        console.error("\nGet the short-lived User Access Token from:");
                        console.error("  https://developers.facebook.com/tools/explorer/");
                        console.error("Select your App → Get User Access Token →");
                        console.error("permissions: pages_show_list, pages_manage_posts, pages_read_engagement");
                        process.exit(2);
                    }
                    appId = process.env.FB_APP_ID;
                    appSecret = process.env.FB_APP_SECRET;
                    pageId = process.env.FB_PAGE_ID;
                    if (!appId || !appSecret || !pageId) {
                        console.error("Set FB_APP_ID + FB_APP_SECRET + FB_PAGE_ID in .env first.");
                        process.exit(2);
                    }
                    console.log("[extend-fb-token] exchanging short-lived user token for long-lived Page token…");
                    return [4 /*yield*/, (0, client_1.extendToLongLivedPageToken)({
                            shortLivedUserToken: shortToken,
                            appId: appId,
                            appSecret: appSecret,
                            pageId: pageId,
                        })];
                case 1:
                    result = _a.sent();
                    if (!result.ok) {
                        console.error("✕ Failed:", result.error);
                        process.exit(1);
                    }
                    console.log("\n✅ Long-lived Page Access Token:");
                    console.log(result.longLivedPageToken);
                    console.log("\nPaste this into .env as:");
                    console.log("FB_PAGE_ACCESS_TOKEN=\"".concat(result.longLivedPageToken, "\""));
                    console.log("\nThis token does NOT expire (unless you revoke permissions).");
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (err) {
    console.error(err);
    process.exit(1);
});
