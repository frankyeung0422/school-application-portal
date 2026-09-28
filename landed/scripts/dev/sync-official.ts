import "dotenv/config";
import { syncOfficialPrices } from "../../lib/official/sync";
const t = Date.now();
syncOfficialPrices().then((r) => console.log(JSON.stringify(r, null, 1), `${((Date.now() - t) / 1000).toFixed(0)}s`));
