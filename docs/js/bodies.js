// docs/js/bodies.js
import { COLORS, RADIUS, FONT_SYM, SIGNS } from "./constants.js";
import { group, circle, line, text, polar } from "./svg.js";
import { toSceneDeg, norm360 } from "./math.js";
import { fastSunLon, fastMoonLon } from "./engine.js";

function fmtZodiac(lon){
  if (!Number.isFinite(lon)) return null;
  const L = norm360(lon);
  return { sign: SIGNS[Math.floor(L/30)], deg: Math.floor(L % 30) };
}

export function initBodies(ctx){
  ctx.layers ||= {};
  const L = ctx.layers;
  L.bodies ||= {};

  const root = L.bodies.root ??= group({ id:"bodies" });
  const rays  = L.bodies.rays ??= group({ class:"rays" });
  const objs  = L.bodies.objs ??= group({ class:"objs" });
  if (!root.parentNode){ ctx.svg.append(root); root.append(rays, objs); }

  // dots
  const earthDot = circle(0,0,3.5,{ fill: COLORS.earth || "#3b82f6" });
  const sunDot   = circle(0,0,5,  { fill: COLORS.sun   || "#f5b301" });
  const moonDot  = circle(0,0,4,  { fill: COLORS.moon  || "#9aa3af" });

  // rays (Earth->Sun/Moon->outer ring)
  const sunRay  = line(0,0,0,0,{ stroke: COLORS.sun || "#f5b301", "stroke-width":2 });
  const moonRay = line(0,0,0,0,{ stroke: "#fff", "stroke-width":1.5, opacity:.9 });

  objs.append(earthDot, sunDot, moonDot);
  rays.append(sunRay, moonRay);

  let lastLog = 0;
  function update(t){
    const sLon = fastSunLon(t);
    const mLon = fastMoonLon(t);
    if (!Number.isFinite(sLon) || !Number.isFinite(mLon)) return; // avoid NaN spam
    const now = performance.now();
    if (now - lastLog > 1000) { /* console.log('lon', sLon, mLon); */ lastLog = now; }

    // Sun dot on Earth ring
    const [sx, sy] = polar(0,0,RADIUS.earth, toSceneDeg(sLon));
    sunDot.setAttribute("cx", sx); sunDot.setAttribute("cy", sy);

    // Moon dot on Moon ring
    const [mx, my] = polar(0,0,RADIUS.earth + RADIUS.moon, toSceneDeg(mLon));
    moonDot.setAttribute("cx", mx); moonDot.setAttribute("cy", my);

    // Rays to outer ring
    const [srx, sry] = polar(0,0,RADIUS.outer, toSceneDeg(sLon));
    sunRay.setAttribute("x2", srx); sunRay.setAttribute("y2", sry);
    const [mrx, mry] = polar(0,0,RADIUS.outer, toSceneDeg(mLon));
    moonRay.setAttribute("x2", mrx); moonRay.setAttribute("y2", mry);

    // readout
    const S = fmtZodiac(sLon), M = fmtZodiac(mLon);
    if (ctx.readoutSun && S)  ctx.readoutSun.textContent  = `Sun: ${S.deg}° ${S.sign}`;
    if (ctx.readoutMoon && M) ctx.readoutMoon.textContent = `Moon: ${M.deg}° ${M.sign}`;
  }

  return { update };
}
