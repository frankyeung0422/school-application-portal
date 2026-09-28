import "dotenv/config";
import { syncStores } from "../../lib/stores/sync";
const t = Date.now();
syncStores().then((r) => console.log(JSON.stringify(r), `${((Date.now() - t) / 1000).toFixed(1)}s`)).catch((e) => { console.error(e.message); process.exit(1); });
