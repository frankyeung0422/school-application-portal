import { chromium } from "playwright";
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p.goto(`http://localhost:6565${process.argv[2]}`, { waitUntil: "networkidle" });
  await p.screenshot({ path: process.argv[3], fullPage: true });
  await b.close();
})();
