"use strict";
/**
 * Facebook Graph API client for Page posting.
 *
 * Required env vars:
 *   FB_PAGE_ID                 — numeric Page ID
 *   FB_PAGE_ACCESS_TOKEN       — long-lived Page Access Token
 *   FB_APP_ID                  — for token extension
 *   FB_APP_SECRET              — for token extension
 *
 * Setup: see SETUP-FB-AUTOMATION.md for token generation walkthrough.
 *
 * Graph API version: v19.0 (released 2024-01, stable through 2026-01)
 */
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.fbConfigured = fbConfigured;
exports.publish = publish;
exports.verifyToken = verifyToken;
exports.extendToLongLivedPageToken = extendToLongLivedPageToken;
var promises_1 = require("node:fs/promises");
var GRAPH_VERSION = (_a = process.env.FB_GRAPH_VERSION) !== null && _a !== void 0 ? _a : "v19.0";
var GRAPH_BASE = "https://graph.facebook.com/".concat(GRAPH_VERSION);
function fbConfigured() {
    return Boolean(process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN);
}
function requireConfig() {
    var pageId = process.env.FB_PAGE_ID;
    var token = process.env.FB_PAGE_ACCESS_TOKEN;
    if (!pageId || !token) {
        throw new Error("Facebook not configured. Set FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN in .env. See SETUP-FB-AUTOMATION.md.");
    }
    return { pageId: pageId, token: token };
}
/**
 * Post a text-only update to the Page feed.
 */
function postFeed(args) {
    return __awaiter(this, void 0, void 0, function () {
        var params;
        return __generator(this, function (_a) {
            params = new URLSearchParams({
                message: args.message,
                access_token: args.token,
            });
            if (args.scheduledFor) {
                params.set("published", "false");
                params.set("scheduled_publish_time", String(Math.floor(args.scheduledFor.getTime() / 1000)));
            }
            return [2 /*return*/, fetch("".concat(GRAPH_BASE, "/").concat(args.pageId, "/feed"), {
                    method: "POST",
                    body: params,
                })];
        });
    });
}
/**
 * Post a photo (with caption) to the Page.
 * Uses multipart upload of the local file.
 */
function postPhoto(args) {
    return __awaiter(this, void 0, void 0, function () {
        var fileBuf, filename, ext, mime, fd, blob;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, promises_1.default.readFile(args.imagePath)];
                case 1:
                    fileBuf = _d.sent();
                    filename = (_a = args.imagePath.split(/[/\\]/).pop()) !== null && _a !== void 0 ? _a : "image.png";
                    ext = (_c = (_b = filename.split(".").pop()) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== null && _c !== void 0 ? _c : "png";
                    mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
                    fd = new FormData();
                    fd.append("caption", args.message);
                    fd.append("access_token", args.token);
                    if (args.scheduledFor) {
                        fd.append("published", "false");
                        fd.append("scheduled_publish_time", String(Math.floor(args.scheduledFor.getTime() / 1000)));
                    }
                    blob = new Blob([new Uint8Array(fileBuf)], { type: mime });
                    fd.append("source", blob, filename);
                    return [2 /*return*/, fetch("".concat(GRAPH_BASE, "/").concat(args.pageId, "/photos"), {
                            method: "POST",
                            body: fd,
                        })];
            }
        });
    });
}
/**
 * Add a comment to an already-posted item.
 */
function postComment(args) {
    return __awaiter(this, void 0, void 0, function () {
        var params;
        return __generator(this, function (_a) {
            params = new URLSearchParams({
                message: args.message,
                access_token: args.token,
            });
            return [2 /*return*/, fetch("".concat(GRAPH_BASE, "/").concat(args.fbPostId, "/comments"), {
                    method: "POST",
                    body: params,
                })];
        });
    });
}
function publish(opts) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, pageId, token, res, _b, body, json, id, permalink, _c, err_1;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _a = requireConfig(), pageId = _a.pageId, token = _a.token;
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 13, , 14]);
                    if (!opts.imagePath) return [3 /*break*/, 3];
                    return [4 /*yield*/, postPhoto({ message: opts.message, imagePath: opts.imagePath, scheduledFor: opts.scheduledFor, token: token, pageId: pageId })];
                case 2:
                    _b = _e.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, postFeed({ message: opts.message, scheduledFor: opts.scheduledFor, token: token, pageId: pageId })];
                case 4:
                    _b = _e.sent();
                    _e.label = 5;
                case 5:
                    res = _b;
                    if (!!res.ok) return [3 /*break*/, 7];
                    return [4 /*yield*/, res.text().catch(function () { return ""; })];
                case 6:
                    body = _e.sent();
                    return [2 /*return*/, { ok: false, error: "HTTP ".concat(res.status, ": ").concat(body.slice(0, 500)) }];
                case 7: return [4 /*yield*/, res.json()];
                case 8:
                    json = (_e.sent());
                    id = (_d = json.post_id) !== null && _d !== void 0 ? _d : json.id;
                    if (!id) {
                        return [2 /*return*/, { ok: false, error: "No post ID in response: ".concat(JSON.stringify(json).slice(0, 200)) }];
                    }
                    permalink = "https://www.facebook.com/".concat(id);
                    if (!(opts.firstCommentLink && !opts.scheduledFor)) return [3 /*break*/, 12];
                    _e.label = 9;
                case 9:
                    _e.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, postComment({ fbPostId: id, message: opts.firstCommentLink, token: token })];
                case 10:
                    _e.sent();
                    return [3 /*break*/, 12];
                case 11:
                    _c = _e.sent();
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/, { ok: true, fbPostId: id, fbPermalink: permalink, raw: json }];
                case 13:
                    err_1 = _e.sent();
                    return [2 /*return*/, { ok: false, error: err_1 instanceof Error ? err_1.message : String(err_1) }];
                case 14: return [2 /*return*/];
            }
        });
    });
}
/**
 * Verify the token works + returns the Page's identity.
 */
function verifyToken() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, pageId, token, res, body, json, err_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = requireConfig(), pageId = _a.pageId, token = _a.token;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, fetch("".concat(GRAPH_BASE, "/").concat(pageId, "?fields=name,id&access_token=").concat(encodeURIComponent(token)))];
                case 2:
                    res = _b.sent();
                    if (!!res.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, res.text().catch(function () { return ""; })];
                case 3:
                    body = _b.sent();
                    return [2 /*return*/, { ok: false, error: "HTTP ".concat(res.status, ": ").concat(body.slice(0, 200)) }];
                case 4: return [4 /*yield*/, res.json()];
                case 5:
                    json = (_b.sent());
                    if (!json.id)
                        return [2 /*return*/, { ok: false, error: "no_id_in_response" }];
                    return [2 /*return*/, { ok: true, pageName: json.name }];
                case 6:
                    err_2 = _b.sent();
                    return [2 /*return*/, { ok: false, error: err_2 instanceof Error ? err_2.message : String(err_2) }];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Exchange a short-lived User Access Token for a long-lived Page Access Token
 * that never expires. Used once during setup.
 */
function extendToLongLivedPageToken(args) {
    return __awaiter(this, void 0, void 0, function () {
        var uTokRes, body, longUserToken, pTokRes, body, pageToken, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    return [4 /*yield*/, fetch("".concat(GRAPH_BASE, "/oauth/access_token?grant_type=fb_exchange_token&client_id=").concat(args.appId, "&client_secret=").concat(args.appSecret, "&fb_exchange_token=").concat(args.shortLivedUserToken))];
                case 1:
                    uTokRes = _a.sent();
                    if (!!uTokRes.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, uTokRes.text().catch(function () { return ""; })];
                case 2:
                    body = _a.sent();
                    return [2 /*return*/, { ok: false, error: "step1 HTTP ".concat(uTokRes.status, ": ").concat(body.slice(0, 300)) }];
                case 3: return [4 /*yield*/, uTokRes.json()];
                case 4:
                    longUserToken = (_a.sent()).access_token;
                    if (!longUserToken)
                        return [2 /*return*/, { ok: false, error: "step1: no access_token" }];
                    return [4 /*yield*/, fetch("".concat(GRAPH_BASE, "/").concat(args.pageId, "?fields=access_token&access_token=").concat(longUserToken))];
                case 5:
                    pTokRes = _a.sent();
                    if (!!pTokRes.ok) return [3 /*break*/, 7];
                    return [4 /*yield*/, pTokRes.text().catch(function () { return ""; })];
                case 6:
                    body = _a.sent();
                    return [2 /*return*/, { ok: false, error: "step2 HTTP ".concat(pTokRes.status, ": ").concat(body.slice(0, 300)) }];
                case 7: return [4 /*yield*/, pTokRes.json()];
                case 8:
                    pageToken = (_a.sent()).access_token;
                    if (!pageToken)
                        return [2 /*return*/, { ok: false, error: "step2: no access_token (you may lack pages_manage_posts permission)" }];
                    return [2 /*return*/, { ok: true, longLivedPageToken: pageToken }];
                case 9:
                    err_3 = _a.sent();
                    return [2 /*return*/, { ok: false, error: err_3 instanceof Error ? err_3.message : String(err_3) }];
                case 10: return [2 /*return*/];
            }
        });
    });
}
