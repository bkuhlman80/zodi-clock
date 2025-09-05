/** @typedef {Object} EphemerisDaily
 * @property {string} iso_date         // "YYYY-MM-DD"
 * @property {"MarEq"|"JunSol"|"SepEq"|"DecSol"|null} next_season_event
 * @property {string|null} next_season_utc // ISO UTC or null
 * @property {number|null} days_to_season
 * @property {number|null} node_asc_lon_deg // 0–360
 * @property {number|null} node_desc_lon_deg
 * @property {string|null} node_asc_sign    // "♈︎"…"♓︎"
 * @property {string|null} node_desc_sign
 */

let _cache = null;

function clamp360(x){ return ((x % 360) + 360) % 360; }
function signGlyphFromDeg(deg){
  const g = ["♈︎","♉︎","♊︎","♋︎","♌︎","♍︎","♎︎","♏︎","♐︎","♑︎","♒︎","♓︎"];
  return g[Math.floor(clamp360(deg)/30)];
}

/** @returns {Promise<EphemerisDaily>} */
export async function loadEphemerisDaily(){
  if (_cache) return _cache;

  let raw = null;
  try {
    const res = await fetch('/ephemeris_daily.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
  } catch (e) {
    // Hard fallback if file missing
    raw = {
      iso_date: new Date().toISOString().slice(0,10),
      next_season_event: null,
      next_season_utc: null,
      days_to_season: null,
      node_asc_lon_deg: null,
      node_desc_lon_deg: null,
      node_asc_sign: null,
      node_desc_sign: null,
    };
  }

  // Coerce types and fill implied fields
  let asc = typeof raw.node_asc_lon_deg === 'number' ? clamp360(raw.node_asc_lon_deg) : null;
  let desc = typeof raw.node_desc_lon_deg === 'number' ? clamp360(raw.node_desc_lon_deg) : null;

  if (asc == null && desc != null) asc = clamp360(desc + 180);
  if (desc == null && asc != null) desc = clamp360(asc + 180);

  let ascSign = raw.node_asc_sign || (asc != null ? signGlyphFromDeg(asc) : null);
  let descSign = raw.node_desc_sign || (desc != null ? signGlyphFromDeg(desc) : null);

  _cache = {
    iso_date: String(raw.iso_date || new Date().toISOString().slice(0,10)),
    next_season_event: raw.next_season_event ?? null,
    next_season_utc: raw.next_season_utc ?? null,
    days_to_season: typeof raw.days_to_season === 'number' ? raw.days_to_season : null,
    node_asc_lon_deg: asc,
    node_desc_lon_deg: desc,
    node_asc_sign: ascSign,
    node_desc_sign: descSign,
  };
  return _cache;
}
