// docs/js/engine.js
// Astronomy Engine bridge + fast approximations (keeps animated/frozen parity).

const DAY = 86400 * 1000;
const YEAR_DAYS = 365.24219;
const MOON_SYNODIC_DAYS = 29.530588853;
const NEW_MOON_REF = new Date(Date.UTC(2000, 0, 6, 18, 14, 0)); // J2000-era true new moon

function marchEquinoxApprox(y) {
  // Simple fixed UTC approximation used only for fast Sun longitude
  return new Date(Date.UTC(y, 2, 20, 21, 0, 0));
}

/** Precise geocentric ecliptic longitudes using Astronomy.Engine. */
export function preciseLongitudes(date) {
  const A = window.Astronomy;
  if (!A) return null;
  const t = new A.AstroTime(date);
  // geocentric position vectors with aberration correction
  const sunVec = A.GeoVector(A.Body.Sun, t, true);
  const moonVec = A.GeoVector(A.Body.Moon, t, true);
  // ecliptic of date
  const sunEcl = A.Ecliptic(sunVec);
  const moonEcl = A.Ecliptic(moonVec);
  return { sunLon: sunEcl.elon, moonLon: moonEcl.elon };
}

/** Fast approximate Sun longitude for animation. */
export function fastSunLon(d) {
  const y = d.getUTCFullYear();
  let eq = marchEquinoxApprox(y);
  if (d < eq) eq = marchEquinoxApprox(y - 1);
  const dtDays = (d - eq) / DAY;
  return ((dtDays / YEAR_DAYS) * 360) % 360;
}

/** Fast approximate Moon longitude from phase progression relative to Sun. */
export function fastMoonLon(d, sunLon) {
  const frac = moonPhaseAge(d) / MOON_SYNODIC_DAYS; // 0..1
  const lon = (sunLon + frac * 360) % 360;
  return (lon + 360) % 360;
}

/** Moon phase age in days since NEW_MOON_REF, wrapped to synodic month. */
export function moonPhaseAge(d) {
  const dtDays = (d - NEW_MOON_REF) / DAY;
  let age = dtDays % MOON_SYNODIC_DAYS;
  if (age < 0) age += MOON_SYNODIC_DAYS;
  return age;
}

/** Human-readable phase bucket used in cards. */
export function phaseName(ageDays) {
  const p = ageDays / MOON_SYNODIC_DAYS;
  if (p < 0.03) return "New";
  if (p < 0.22) return "Waxing Crescent";
  if (p < 0.28) return "First Quarter";
  if (p < 0.47) return "Waxing Gibbous";
  if (p < 0.53) return "Full";
  if (p < 0.72) return "Waning Gibbous";
  if (p < 0.78) return "Last Quarter";
  if (p < 0.97) return "Balsamic";
  return "New";
}

/** Seasons for a given year via Astronomy.Seasons with cross-build key safety. */
export function seasonsUTC(year) {
  const A = window.Astronomy;
  if (!A || !A.Seasons) return { MarEq:null, JunSol:null, SepEq:null, DecSol:null };
  const s = A.Seasons(year);
  const pick = (obj, names) => { for (const n of names) if (obj && obj[n] != null) return obj[n]; return null; };
  const toISO = (t) => (t && t.date instanceof Date) ? t.date.toISOString().replace(".000Z","Z") : null;
  return {
    MarEq:  toISO(pick(s, ["march_equinox","MarchEquinox"])),
    JunSol: toISO(pick(s, ["june_solstice","JuneSolstice"])),
    SepEq:  toISO(pick(s, ["september_equinox","SeptemberEquinox"])),
    DecSol: toISO(pick(s, ["december_solstice","DecemberSolstice"])),
  };
}

/** Next upcoming season relative to nowIso. Wraps to the first if all are past. */
export function nextSeason(nowIso, seasonsMap) {
  const now = new Date(nowIso);
  const entries = Object.entries(seasonsMap || {})
    .filter(([,iso]) => !!iso)
    .map(([k, iso]) => [k, new Date(iso)]);
  if (!entries.length) return { key:null, when:null, days: Infinity };
  const future = entries.filter(([,dt]) => dt > now).sort((a,b)=>a[1]-b[1]);
  const [key, when] = future.length ? future[0] : entries.sort((a,b)=>a[1]-b[1])[0];
  return { key, when, days: (when - now) / DAY };
}
