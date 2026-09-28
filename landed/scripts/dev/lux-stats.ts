import "dotenv/config";
import { prisma } from "../../lib/prisma";
async function main() {
  const offers = await prisma.offer.findMany({ where: { product: { segment: "LUXURY" } }, select: { id: true, platform: true, title: true, latestPrice: true, currency: true, product: { select: { brand: true, officialRef: true } } } });
  const hk = (o: { latestPrice: number; currency: string }) => Math.round(o.currency === "USD" ? o.latestPrice * 7.84 : o.currency === "CNY" ? o.latestPrice * 1.17 : o.latestPrice);
  const byBrand = new Map<string, number[]>();
  for (const o of offers) {
    const b = o.product?.brand ?? "?";
    byBrand.set(b, [...(byBrand.get(b) ?? []), hk(o)]);
  }
  console.log(`luxury offers: ${offers.length}`);
  for (const [b, arr] of [...byBrand.entries()].sort((a, b) => b[1].length - a[1].length)) {
    arr.sort((x, y) => x - y);
    console.log(`${b.padEnd(16)} n=${String(arr.length).padStart(3)} min=${arr[0]} p25=${arr[Math.floor(arr.length * 0.25)]} med=${arr[Math.floor(arr.length / 2)]} max=${arr[arr.length - 1]}`);
  }
  console.log("\ncheapest 15:");
  for (const c of offers.map((o) => ({ ...o, hkd: hk(o) })).sort((a, b) => a.hkd - b.hkd).slice(0, 15)) {
    console.log(`HK$${String(c.hkd).padStart(6)} | ${(c.product?.brand ?? "?").padEnd(14)} | ${c.platform.padEnd(10)} | ${c.title.slice(0, 66)}`);
  }
  await prisma.$disconnect();
}
main();
