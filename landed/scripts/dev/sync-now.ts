import "dotenv/config";
import { syncSupermarkets } from "../../lib/supermarket/sync";
const t = Date.now();
syncSupermarkets({ force: true }).then((r) => console.log(JSON.stringify(r), `${((Date.now() - t) / 1000).toFixed(1)}s`)).then(() => syncSupermarkets()).then((r) => console.log("second run:", JSON.stringify(r)));
