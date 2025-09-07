// docs/js/bodies.js
import { COLORS, RADIUS, SIGNS } from "./constants.js";
import { group, circle, line, text } from "./svg.js";
import { toSceneDeg, norm360 } from "./math.js";
import { earthHelioLon, moonLonDeg } from "./engine.js";

// scene → unit direction
function dirUnit(degScene){
  const a = (degScene - 90) * Math.PI/180;
  return [Math.cos(a), Math.sin(a)];
}
function fmtZodiac(lon){
  const L = norm360(lon);
  return { sign: SIGNS[Math.floor(L/30)], deg: Math.floor(L % 30) };
}
// intersect ray from (ex,ey) along scene-angle aScene with circle r at origin
function rayHitOuter(ex, ey, aScene, r){
  const [dx, dy] = dirUnit(aScene);
  const B = ex*dx + ey*dy;
  const C = ex*ex + ey*ey - r*r;
  const D = B*B - C; if (D < 0) return null;
  const t1 = -B + Math.sqrt(D), t2 = -B - Math.sqrt(D);
  const t = Math.max(t1, t2); if (t < 0) return null;
  return [ex + t*dx, ey + t*dy];
}

export function initBodies(ctx){
  ctx.layers ||= {};
  const L = ctx.layers;
  L.bodies ||= {};

  const root  = L.bodies.root  ??= group({ id:"bodies" });
  const rays  = L.bodies.rays  ??= group({ class:"rays" });
  const objs  = L.bodies.objs  ??= group({ class:"objs" });
  if (!root.parentNode){ ctx.svg.append(root); root.append(rays, objs); }

  // Sun at center
  const sunDot   = circle(0,0,6,{ fill: COLORS.sun || "#f5b301" });

  // Earth on heliocentric ring
  const earthDot = circle(0,0,4,{ fill: COLORS.earth || "#3b82f6" });

  // Moon orbiting Earth
  const moonDot  = circle(0,0,3.5,{ fill: COLORS.moon || "#cfd6df" });
  const moonOrb  = circle(0,0,RADIUS.moon,{
    fill:"none", stroke: COLORS.ring, "stroke-dasharray":"2 5", opacity:0.35
  });

  // Rays that START at Earth and point to Sun/Moon then to outer ring
  const sunRay  = line(0,0,0,0,{ stroke: COLORS.sun || "#f5b301", "stroke-width":2 });
  const moonRay = line(0,0,0,0,{ stroke: "#fff", "stroke-width":1.5, opacity:.95 });

  objs.append(sunDot, moonOrb, earthDot, moonDot);
  rays.append(sunRay, moonRay);

  function update(t){
    // Earth heliocentric longitude (Sun at origin)
    const eLon = earthHelioLon(t);                 // [0,360)
    const eScene = toSceneDeg(eLon);
    const [ex, ey] = (() => {
      const [ux, uy] = dirUnit(eScene);
      return [ux*RADIUS.earth, uy*RADIUS.earth];
    })();

    // position Earth and its local Moon orbit ring
    earthDot.setAttribute("cx", ex); earthDot.setAttribute("cy", ey);
    moonOrb.setAttribute("cx", ex);  moonOrb.setAttribute("cy", ey);

    // Sun ray: from Earth, through Sun (origin), out opposite side
    const endSun = [ ...dirUnit(toSceneDeg(eLon + 180)) ];
    const sx = endSun[0]*RADIUS.outer, sy = endSun[1]*RADIUS.outer;
    sunRay.setAttribute("x1", ex); sunRay.setAttribute("y1", ey);
    sunRay.setAttribute("x2", sx); sunRay.setAttribute("y2", sy);

    // Moon position: Earth + geocentric vector at mLon
    const mLon = moonLonDeg(t);                     // geocentric ecliptic longitude
    const [mxu, myu] = dirUnit(toSceneDeg(mLon));
    const mx = ex + mxu*RADIUS.moon, my = ey + myu*RADIUS.moon;
    moonDot.setAttribute("cx", mx); moonDot.setAttribute("cy", my);

    // Moon ray: from Earth along geocentric direction to outer ring
    const hit = rayHitOuter(ex, ey, toSceneDeg(mLon), RADIUS.outer);
    if (hit){
      moonRay.setAttribute("x1", ex); moonRay.setAttribute("y1", ey);
      moonRay.setAttribute("x2", hit[0]); moonRay.setAttribute("y2", hit[1]);
    }

    // Readouts (geocentric zodiac)
    if (ctx.readoutSun){
      const S = fmtZodiac((eLon + 180) % 360);      // Sun geocentric
      ctx.readoutSun.textContent = `Sun: ${S.deg}° ${S.sign}`;
    }
    if (ctx.readoutMoon){
      const M = fmtZodiac(mLon);
      ctx.readoutMoon.textContent = `Moon: ${M.deg}° ${M.sign}`;
    }
  }

  return { update };
}
