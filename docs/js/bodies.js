// docs/js/bodies.js
import { COLORS, RADIUS, FONT_SYM, SIGNS } from "./constants.js";
import { group, circle, line, text, polar } from "./svg.js";
import { toSceneDeg, norm360 } from "./math.js";
import { solarLonDeg, fastMoonLon } from "./engine.js";

function fmtZodiac(lon){
  const L = norm360(lon);
  const signIdx = Math.floor(L/30);
  const deg = Math.floor(L % 30);
  return { sign: SIGNS[signIdx], deg };
}

export function initBodies(ctx){
  ctx.layers ||= {};
  const L = ctx.layers;
  L.bodies ||= {};

  const root = L.bodies.root ??= group({ id:"bodies" });
  const rays  = L.bodies.rays ??= group({ class:"rays" });
  const objs  = L.bodies.objs ??= group({ class:"objs" });
  if (!root.parentNode){ ctx.svg.append(root); root.append(rays, objs); }

  // glyphs (created once, updated in place)
  const sunDot  = circle(0, 0, 6, { fill: COLORS.sun || "#f7c948" });
  const sunRay  = line(0,0,0,0, { stroke: COLORS.sun || "#f7c948", "stroke-width": 2 });
  const moonRay = line(0,0,0,0, { stroke: "#fff", "stroke-width": 1.5, opacity: .9 });
  const moonDot = circle(0,0,4, { fill: COLORS.moon || "#9ec5ff" });

  rays.append(sunRay, moonRay);
  objs.append(sunDot, moonDot);

  function update(t){
    // longitudes (geocentric, ecliptic)
    const sLon = solarLonDeg(t);
    const mLon = fastMoonLon(t);

    // rays to outer ring
    const [sx, sy] = polar(0,0,RADIUS.outer, toSceneDeg(sLon));
    const [mx, my] = polar(0,0,RADIUS.outer, toSceneDeg(mLon));
    sunRay.setAttribute("x2", sx); sunRay.setAttribute("y2", sy);
    moonRay.setAttribute("x2", mx); moonRay.setAttribute("y2", my);

    // moon position on its inner orbit ring
    const [mx2, my2] = polar(0,0,RADIUS.moon, toSceneDeg(mLon));
    moonDot.setAttribute("cx", mx2); moonDot.setAttribute("cy", my2);

    // readout (if host provided spans)
    const rSun  = ctx.readoutSun, rMoon = ctx.readoutMoon;
    if (rSun || rMoon){
      const S = fmtZodiac(sLon), M = fmtZodiac(mLon);
      if (rSun)  rSun.textContent  = `Sun: ${S.deg}° ${S.sign}`;
      if (rMoon) rMoon.textContent = `Moon: ${M.deg}° ${M.sign}`;
    }
  }

  return { update };
}
