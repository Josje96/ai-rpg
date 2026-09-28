import type { Mystery } from "../mystery.js";
import { COUNTY_FAIR } from "./county-fair.js";
import { LOW_SIGNAL } from "./low-signal.js";
import { MANNEQUIN_SEASON } from "./mannequin-season.js";
import { MERCY_LAKE } from "./mercy-lake.js";
import { SILVER_THREADS } from "./silver-threads.js";
import { SWEETWATER } from "./sweetwater.js";

export { COUNTY_FAIR, LOW_SIGNAL, MANNEQUIN_SEASON, MERCY_LAKE, SILVER_THREADS, SWEETWATER };

export const BUILT_IN_MYSTERIES: readonly Mystery[] = [
  MERCY_LAKE, MANNEQUIN_SEASON, SILVER_THREADS, LOW_SIGNAL, SWEETWATER, COUNTY_FAIR,
];
