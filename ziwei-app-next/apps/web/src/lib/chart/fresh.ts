import { computeChart, ENGINE_VERSION, type Chart } from '@ziwei/engine';
import { prisma } from '@/lib/db/prisma';

/**
 * Read a ziwei chart from ChartCache, transparently recomputing + persisting
 * when the cached row was produced by an older engine. Chart JSON carries its
 * own birthInfo, so stale rows can always be refreshed in place. Use this in
 * every route that renders cached chartJson (reports, OG cards) — serving a
 * pre-0.5 row would show the old, incorrect star placements.
 */
export async function freshChartFromCache(
  chartHash: string,
  opts: { persist?: boolean } = {},
): Promise<Chart | null> {
  const cached = await prisma.chartCache.findUnique({ where: { chartHash } });
  if (!cached) return null;
  let chart = cached.chartJson as unknown as Chart;
  if (chart?.engineVersion !== ENGINE_VERSION && chart?.birthInfo) {
    chart = computeChart(chart.birthInfo);
    if (opts.persist !== false) {
      try {
        await prisma.chartCache.update({
          where: { chartHash },
          data: { chartJson: chart as unknown as object, engineVersion: ENGINE_VERSION },
        });
      } catch {
        // best-effort persistence; serving the fresh chart is what matters
      }
    }
  }
  return chart;
}
