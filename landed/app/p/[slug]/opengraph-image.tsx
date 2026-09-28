import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { hkd } from "@/lib/format";
import { cheapestClaim } from "@/lib/claims";
import { retailerName } from "@/lib/supermarket/retailers";
import { PLATFORM_LABELS, type Platform } from "@/lib/types";

// The card that gets pasted into a WhatsApp group. It carries the same claim
// wording as the page: cheapest of N sources checked at a stated time.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "到手價 Landed";

/** ImageResponse embeds fonts itself; Chinese needs a real font file or it renders blank boxes. */
async function loadFont(): Promise<ArrayBuffer | null> {
  for (const file of ["NotoSansHK-Bold.otf", "NotoSansHK-Bold.ttf", "NotoSansTC-Bold.ttf"]) {
    try {
      const buf = await readFile(path.join(process.cwd(), "public", "fonts", file));
      return new Uint8Array(buf).buffer;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug }, include: { offers: { where: { inStock: true } } } });
  const font = await loadFont();
  const hasCjk = font !== null;

  const price = product?.bestLandedHkdCents ?? null;
  const best = product?.offers.find((o) => o.id === product.bestOfferId);
  const where = best ? (retailerName(best.platform) ?? PLATFORM_LABELS[best.platform as Platform] ?? best.platform) : null;
  // Without a CJK font, a Chinese title would render as boxes — show the English one.
  const title = (hasCjk ? product?.title : product?.titleEn || product?.title) ?? "到手價 Landed";
  const claim = product ? cheapestClaim(product.sourceCount, product.lastPricedAt ?? new Date()) : "";

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#047857", color: "white", padding: 64, justifyContent: "space-between", fontFamily: hasCjk ? "Noto" : "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 34, opacity: 0.9 }}>到手價 Landed · 送到香港嘅真實價錢</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 46, lineHeight: 1.2, maxHeight: 180, overflow: "hidden" }}>{title.slice(0, 80)}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
            <span style={{ fontSize: 96, fontWeight: 700 }}>{price != null ? hkd(price) : "—"}</span>
            {where ? <span style={{ fontSize: 34, opacity: 0.9 }}>@ {where}</span> : null}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.85 }}>{claim.slice(0, 90)}</div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "Noto", data: font, style: "normal", weight: 700 }] : undefined,
    },
  );
}
