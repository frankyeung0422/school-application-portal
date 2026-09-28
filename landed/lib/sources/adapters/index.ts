import type { Platform } from "../../types";
import type { PlatformAdapter } from "../types";
import { createFixtureAdapter } from "./fixture";

// Real adapters are loaded lazily so the Next.js server never pulls in
// playwright — only the worker process ever instantiates them.
const PLAYWRIGHT_LOADERS: Partial<
  Record<Platform, () => Promise<PlatformAdapter>>
> = {
  JD: () => import("./jd").then((m) => m.createJdAdapter()),
  ALI1688: () => import("./ali1688").then((m) => m.createAli1688Adapter()),
  ALIEXPRESS: () =>
    import("./aliexpress").then((m) => m.createAliexpressAdapter()),
  ALIBABA: () => import("./alibaba").then((m) => m.createAlibabaAdapter()),
  TAOBAO: () => import("./taobao").then((m) => m.createTaobaoAdapter()),
  AMAZON: () => import("./amazon").then((m) => m.createAmazonAdapter()),
  EBAY: () => import("./ebay").then((m) => m.createEbayAdapter()),
  PDD: () => import("./pdd").then((m) => m.createPddAdapter()),
};

function adapterKind(platform: Platform): string {
  if (process.env.ADAPTER_MODE === "fixture") return "fixture";
  const perPlatform = process.env[`ADAPTER_${platform}`];
  if (perPlatform) return perPlatform;
  return "playwright";
}

export async function getAdapter(platform: Platform): Promise<PlatformAdapter> {
  const kind = adapterKind(platform);
  if (kind === "fixture") return createFixtureAdapter(platform);
  const loader = PLAYWRIGHT_LOADERS[platform];
  if (!loader) {
    throw new Error(`No adapter implemented for platform ${platform}`);
  }
  return loader();
}
