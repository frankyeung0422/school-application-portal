import "dotenv/config";
import { screenLuxuryOffers } from "../../lib/luxury/screen";
screenLuxuryOffers().then((r) => console.log(JSON.stringify(r, null, 1)));
