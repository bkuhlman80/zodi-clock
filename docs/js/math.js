// docs/js/math.js
export const mod = (n, m) => ((n % m) + m) % m;
export const norm360 = d => mod(d, 360);

/** Signed shortest angular diff a-b in degrees, in [-180,180]. */
export function angDiff(a, b) {
  let d = norm360(a) - norm360(b);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** 0..11 zodiac sign index from ecliptic longitude. */
export const signIndex = lon => Math.floor(norm360(lon) / 30);

/** "12°07’" formatting for degrees in a sign (0–30). */
export function toDegMin(x) {
  const d = Math.floor(x);
  const m = Math.floor((x - d) * 60);
  return `${d}°${String(m).padStart(2,"0")}’`;
}

/** Scene radians: 0° Aries at top, clockwise. */
export function toSceneRad(deg) {
  return (-(deg) - 90) * Math.PI/180;
}

/** Scene degrees: 0° Aries at top, clockwise. */
export function toSceneDeg(deg) {
  return (-(deg) - 90);
}

/** Ray-circle intersection on ring of radius R centered at (cx,cy). */
export function ringHit(cx, cy, R, sx, sy, angleRad) {
  const dx = Math.cos(angleRad), dy = Math.sin(angleRad);
  const ox = sx - cx, oy = sy - cy;
  const a = dx*dx + dy*dy;
  const b = 2*(ox*dx + oy*dy);
  const c = ox*ox + oy*oy - R*R;
  const disc = b*b - 4*a*c;
  const t = disc >= 0 ? (-b + Math.sqrt(disc)) / (2*a) : 0;
  return { x: sx + t*dx, y: sy + t*dy };
}

export const lerp = (a, b, t) => a + (b - a) * t;
