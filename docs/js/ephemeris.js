// docs/js/ephemeris.js
import { EPS } from "./constants.js";

let _cache = null;

/**
 * Load and normalize ephemeris.
 * Accepts either:
 *  - Array of rows: [{date, node_true_asc, node_true_desc, mar_eq, jun_sol, sep_eq, dec_sol}, ...]
 *  - Single object for today: { iso_date, node_asc_lon_deg, node_desc_lon_deg, ... }
 *
 * Returns: { [dateISO]: { dateISO, nodeAsc, nodeDesc, seasons?:{MarEq,JunSol,SepEq,DecSol} } }
 */
export async function loadEphemeris() {
  if (_cache) return _cache;

  const res = await fetch("./ephemeris_daily.json?v=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error(`ephemeris fetch failed: HTTP ${res.status}`);
  const data = await res.json();

  // Always materialize a date→record map
  const map = {};

  if (Array.isArray(data)) {
    for (const row of data) {
      const rec = normalizeRowFromArray(row);
      if (rec && rec.dateISO) map[rec.dateISO] = rec;
    }
  } else if (data && typeof data === "object") {
    const rec = normalizeRowFromSingle(data);
    if (rec && rec.dateISO) map[rec.dateISO] = rec;
  }

  _cache = map;
  return _cache;
}

/** Convenience: get ephem for a given ISO date string "YYYY-MM-DD". */
export function getEphemFor(ephemMap, dateISO) {
  if (!ephemMap) return null;
  const key = (dateISO || "").slice(0, 10);
  return ephemMap[key] || null;
}

// ---------- helpers ----------

function nudged360(x) {
  const v = Number(x);
  if (!Number.isFinite(v)) return null;
  // nudge away from exact seams to avoid 0/180 text-wrap or arc pathology
  return ((v + 360) % 360) + EPS;
}

function normalizeRowFromArray(row) {
  // expected keys: date, node_true_asc, node_true_desc, mar_eq, jun_sol, sep_eq, dec_sol
  const dateISO = String(row.date || "").slice(0, 10);
  if (!dateISO) return null;

  let asc = nudged360(row.node_true_asc);
  let desc = nudged360(row.node_true_desc);

  // Ensure opposition if one side is missing or off by >1°
  if (asc != null && desc == null) desc = (asc + 180) % 360;
  if (desc != null && asc == null) asc = (desc + 180) % 360;
  if (asc != null && desc != null) {
    const delta = Math.abs((((desc - asc) % 360) + 360) % 360 - 180);
    if (delta > 1) desc = (asc + 180) % 360;
  }

  return {
    dateISO,
    nodeAsc: asc,
    nodeDesc: desc,
    seasons: {
      MarEq: row.mar_eq || null,
      JunSol: row.jun_sol || null,
      SepEq: row.sep_eq || null,
      DecSol: row.dec_sol || null,
    },
  };
}

function normalizeRowFromSingle(obj) {
  // expected keys: iso_date, node_asc_lon_deg, node_desc_lon_deg, possibly next_season_* (ignored here)
  const dateISO = String(obj.iso_date || new Date().toISOString().slice(0, 10)).slice(0, 10);

  let asc = nudged360(obj.node_asc_lon_deg);
  let desc = nudged360(obj.node_desc_lon_deg);

  if (asc != null && desc == null) desc = (asc + 180) % 360;
  if (desc != null && asc == null) asc = (desc + 180) % 360;
  if (asc != null && desc != null) {
    const delta = Math.abs((((desc - asc) % 360) + 360) % 360 - 180);
    if (delta > 1) desc = (asc + 180) % 360;
  }

  return { dateISO, nodeAsc: asc, nodeDesc: desc };
}
