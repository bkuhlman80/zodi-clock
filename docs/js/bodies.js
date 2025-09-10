// docs/js/bodies.js
import { COLORS, RADIUS, SIGNS, SIGN_NAMES } from "./constants.js";
import { group, circle, line, polar } from "./svg.js";
import { toSceneDeg, norm360 } from "./math.js";
import { earthHelioLon, moonLonDeg } from "./engine.js";

function dirUnit(degScene){
  const a = (degScene - 90) * Math.PI/180;
  return [Math.cos(a), Math.sin(a)];
}
function fmtZodiac(lon){
  const L = norm360(lon);
  return { sign: SIGNS[Math.floor(L/30)], deg: Math.floor(L % 30) };
}
// svg <image> helper
function makeImg(href){
  const NS="http://www.w3.org/2000/svg", XL="http://www.w3.org/1999/xlink";
  const el=document.createElementNS(NS,"image");
  el.setAttributeNS(null,"preserveAspectRatio","xMidYMid meet");
  el.setAttributeNS(XL,"href", href);
  el.setAttribute("class","constellation");
  el.setAttribute("style","pointer-events:none");
  return el;
}

export function initBodies(ctx){
  ctx.layers ||= {};
  const L = ctx.layers;
  L.bodies ||= {};

  const root  = L.bodies.root  ??= group({ id:"bodies" });
  const constG= L.bodies.constG??= group({ class:"constellations" }); // night-sky overlay
  const rays  = L.bodies.rays  ??= group({ class:"rays" });
  const objs  = L.bodies.objs  ??= group({ class:"objs" });
  if (!root.parentNode){ ctx.svg.append(root); root.append(constG, rays, objs); }

  // ---- Constellations (one per sign; default hidden via CSS) ----
  const DIAM = 160; // tune 120–180
  const imgs = [];
  for (let i=0;i<12;i++){
    const name = SIGN_NAMES[i].toLowerCase();     // "aries", ...
    const href = `./img/${name}.png`;
    const im = makeImg(href);
    im.setAttribute("width", DIAM);
    im.setAttribute("height", DIAM);

    // center each image in the middle of its 30° slice
    const mid = toSceneDeg(i*30 + 15);
    const [cx, cy] = polar(0, 0, RADIUS.signLabel, mid);
    im.setAttribute("x", cx - DIAM/2);
    im.setAttribute("y", cy - DIAM/2);

    constG.appendChild(im);
    imgs.push(im);
  }
  L.bodies.constImgs = imgs;

  // ---- Sizes: Sun ≈ 4× Earth; Earth ≈ 2× Moon ----
  const R_SUN = 30, R_EARTH = 12, R_MOON = 6;

  // Sun at center
  const sunDot   = circle(0,0,R_SUN,{ fill: COLORS.sun || "#f5b301" });

  // Earth on heliocentric ring
  const earthDot = circle(0,0,R_EARTH,{ fill: COLORS.earth || "#3b82f6" });

  // Moon orbiting Earth (local dashed ring + dot)
  const moonDot  = circle(0,0,R_MOON,{ fill: COLORS.moon || "#cfd6df" });
  const moonOrb  = circle(0,0,RADIUS.moon,{
    fill:"none", stroke: COLORS.ring, "stroke-dasharray":"2 6", opacity:0.35
  });

  // Rays that START at Earth and point to Sun/Moon then to outer ring
  const sunRay  = line(0,0,0,0,{ stroke: COLORS.sun || "#f5b301", "stroke-width":1.2 });
  const moonRay = line(0,0,0,0,{ stroke: "#ffffff", "stroke-width":1.0, opacity:.95 });

  objs.append(sunDot, moonOrb, earthDot, moonDot);
  rays.append(sunRay, moonRay);

  function update(t){
    // Earth heliocentric longitude (Sun at origin)
    const eLon = earthHelioLon(t);                 // [0,360)
    const eScene = toSceneDeg(eLon);
    const [ux, uy] = dirUnit(eScene);
    const ex = ux*RADIUS.earth, ey = uy*RADIUS.earth;

    // position Earth and its local Moon orbit ring
    earthDot.setAttribute("cx", ex); earthDot.setAttribute("cy", ey);
    moonOrb.setAttribute("cx", ex);  moonOrb.setAttribute("cy", ey);

    // Sun ray: from Earth, through Sun (origin), out opposite side
    const [vx, vy] = dirUnit(toSceneDeg(eLon + 180));
    sunRay.setAttribute("x1", ex); sunRay.setAttribute("y1", ey);
    sunRay.setAttribute("x2", vx*RADIUS.outer); sunRay.setAttribute("y2", vy*RADIUS.outer);

    // Moon position: Earth + geocentric vector at mLon
    const mLon = moonLonDeg(t);                     // geocentric ecliptic longitude
    const [mxu, myu] = dirUnit(toSceneDeg(mLon));
    const mx = ex + mxu*RADIUS.moon, my = ey + myu*RADIUS.moon;
    moonDot.setAttribute("cx", mx); moonDot.setAttribute("cy", my);

    // Moon ray: from Earth along geocentric direction to outer ring
    const aMoon = toSceneDeg(mLon);
    const dx = Math.cos((aMoon - 90) * Math.PI/180), dy = Math.sin((aMoon - 90) * Math.PI/180);
    // intersect ray from Earth with outer ring (simple analytic)
    const B = ex*dx + ey*dy;
    const C = ex*ex + ey*ey - RADIUS.outer*RADIUS.outer;
    const D = B*B - C;
    if (D >= 0){
      const tHit = -B + Math.sqrt(D);
      moonRay.setAttribute("x1", ex); moonRay.setAttribute("y1", ey);
      moonRay.setAttribute("x2", ex + tHit*dx); moonRay.setAttribute("y2", ey + tHit*dy);
    }

    // Readouts (geocentric zodiac)
    const S = fmtZodiac((eLon + 180) % 360);      // Sun geocentric
    const M = fmtZodiac(mLon);

    if (ctx.readoutSunBadge && ctx.readoutSunDeg){
      ctx.readoutSunBadge.textContent = S.sign;
      ctx.readoutSunDeg.textContent   = S.deg;
    } else if (ctx.readoutSun){
      ctx.readoutSun.textContent = `Sun: ${S.deg}° ${S.sign}`;
    }
    if (ctx.readoutMoonBadge && ctx.readoutMoonDeg){
      ctx.readoutMoonBadge.textContent = M.sign;
      ctx.readoutMoonDeg.textContent   = M.deg;
    } else if (ctx.readoutMoon){
      ctx.readoutMoon.textContent = `Moon: ${M.deg}° ${M.sign}`;
    }

    // ---- Night-sky constellation (Sun + 180°) ----
    const sunGeo = (eLon + 180) % 360;
    const oppLon = (sunGeo + 180) % 360;                 // sign ruling the night sky
    const oppIdx = Math.floor(oppLon / 30);

    const arr = L.bodies.constImgs || [];
    for (let i=0;i<arr.length;i++){
      arr[i].classList.toggle("active", i === oppIdx);
    }
  }

  return { update };
}
