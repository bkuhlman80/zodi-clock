// docs/js/bodies.js
import { COLORS, RADIUS, SIGNS, SIGN_NAMES } from "./constants.js";
import { group, circle, line, polar, svgEl } from "./svg.js";
import { toSceneDeg, norm360 } from "./math.js";
import { earthHelioLon, moonLonDeg } from "./engine.js";
import { ensureDefs, ensurePhaseDefs } from "./icons.js"; 

const XLINK = "http://www.w3.org/1999/xlink";

function dirUnit(degScene){
  const a = (degScene - 90) * Math.PI/180;
  return [Math.cos(a), Math.sin(a)];
}
function fmtZodiac(lon){
  const L = norm360(lon);
  return { sign: SIGNS[Math.floor(L/30)], deg: Math.floor(L % 30) };
}
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

  // ----- CONSTELLATIONS LAYER (separate, placed behind the wheel) -----
  const constG = ctx.layers.constellations ??= group({ id:"constellations" });
  if (!constG.parentNode){
    const wheel = ctx.svg.querySelector("#wheel");
    // insert before the wheel → rendered underneath wheel + labels + pins
    if (wheel) ctx.svg.insertBefore(constG, wheel);
    else ctx.svg.insertBefore(constG, ctx.svg.firstChild);
  }

  const defs = ensureDefs(ctx.svg);
  ensurePhaseDefs(ctx.svg);
  if (!defs.querySelector("#constGlow")){
    const NS = "http://www.w3.org/2000/svg";
    const f = document.createElementNS(NS,"filter");
    f.setAttribute("id","constGlow");
    f.setAttribute("color-interpolation-filters","sRGB");

    const inv = document.createElementNS(NS,"feComponentTransfer");
    inv.setAttribute("result","inv");
    const mk = (n)=>{ const x=document.createElementNS(NS,n); x.setAttribute("type","table"); x.setAttribute("tableValues","1 0"); return x; };
    const r=mk("feFuncR"), g=mk("feFuncG"), b=mk("feFuncB");
    const a=document.createElementNS(NS,"feFuncA"); a.setAttribute("type","table"); a.setAttribute("tableValues","0 1");
    inv.append(r,g,b,a);

    const blur = document.createElementNS(NS,"feGaussianBlur");
    blur.setAttribute("in","inv"); blur.setAttribute("stdDeviation","2"); blur.setAttribute("result","glow");

    const merge = document.createElementNS(NS,"feMerge");
    const m1=document.createElementNS(NS,"feMergeNode"); m1.setAttribute("in","glow");
    const m2=document.createElementNS(NS,"feMergeNode"); m2.setAttribute("in","inv");
    merge.append(m1,m2);

    f.append(inv, blur, merge);
    defs.appendChild(f);
  }

  // after you build #constGlow
  if (!defs.querySelector("#constDim")){
    const NS="http://www.w3.org/2000/svg";
    const f = document.createElementNS(NS,"filter");
    f.id = "constDim";
    f.setAttribute("color-interpolation-filters","sRGB");

    // Map RGB to a constant mid-gray; keep alpha untouched
    const ct = document.createElementNS(NS,"feComponentTransfer");
    const mk = c => { const fn=document.createElementNS(NS,"feFunc"+c);
                      fn.setAttribute("type","linear"); fn.setAttribute("slope","0"); fn.setAttribute("intercept","0.70"); return fn; };
    ct.append(mk("R"), mk("G"), mk("B"));
    const fa=document.createElementNS(NS,"feFuncA"); fa.setAttribute("type","identity");
    ct.append(fa);

    f.append(ct);
    defs.appendChild(f);
  }


  // build 12 images
  const DIAM = 128;                 // shrunk from 160
  const imgs = [];
  if (!constG.hasChildNodes()){
    for (let i=0;i<12;i++){
      const name = SIGN_NAMES[i].toLowerCase();
      const href = `./img/${name}.png`;
      const im = makeImg(href);
      im.setAttribute("width", DIAM);
      im.setAttribute("height", DIAM);
      const mid = toSceneDeg(i*30 + 15);
      const [cx, cy] = polar(0, 0, RADIUS.signLabel, mid);
      im.setAttribute("x", cx - DIAM/2);
      im.setAttribute("y", cy - DIAM/2);
      im.style.opacity = 0;
      constG.appendChild(im);
      imgs.push(im);
    }
    L.constImgs = imgs;
  } else {
    L.constImgs = Array.from(constG.querySelectorAll("image.constellation"));
  }

  // ----- BODIES LAYER -----
  const root  = L.bodies.root  ??= group({ id:"bodies" });
  const rays  = L.bodies.rays  ??= group({ class:"rays" });
  const objs  = L.bodies.objs  ??= group({ class:"objs" });
  if (!root.parentNode){ ctx.svg.append(root); root.append(rays, objs); }

  const R_SUN = 30, R_EARTH = 12, R_MOON = 6;
  const sunDot   = circle(0,0,R_SUN,{ fill: COLORS.sun || "#f5b301" });
  const earthDot = circle(0,0,R_EARTH,{ fill: COLORS.earth || "#3b82f6" });
  const moonDot  = circle(0,0,R_MOON,{ fill: COLORS.moon || "#cfd6df" });
  const moonOrb  = circle(0,0,RADIUS.moon,{
    fill:"none", stroke: COLORS.ring, "stroke-dasharray":"2 6", opacity:0.35
  });
  const sunRay  = line(0,0,0,0,{ stroke: COLORS.sun || "#f5b301", "stroke-width":1.2 });
  const moonRay = line(0,0,0,0,{ stroke: "#ffffff", "stroke-width":1.0, opacity:.95 });

  objs.append(sunDot, moonOrb, earthDot, moonDot);
  rays.append(sunRay, moonRay);

  const phaseGroup = L.bodies.phaseGroup ??= group({ class:"moon-phase" });
  const phaseAlign = L.bodies.phaseAlign ??= group();
  const phaseMirror = L.bodies.phaseMirror ??= group();
  const phaseUse = L.bodies.phaseUse ??= svgEl("use");
  const phaseBox = R_MOON * 2;

  if (!phaseGroup.contains(phaseAlign)) phaseGroup.appendChild(phaseAlign);
  if (!phaseAlign.contains(phaseMirror)) phaseAlign.appendChild(phaseMirror);
  if (!phaseMirror.contains(phaseUse)) phaseMirror.appendChild(phaseUse);
  if (!phaseGroup.parentNode) objs.appendChild(phaseGroup);

  phaseUse.setAttribute("x", -R_MOON);
  phaseUse.setAttribute("y", -R_MOON);
  phaseUse.setAttribute("width", phaseBox);
  phaseUse.setAttribute("height", phaseBox);
  phaseUse.setAttribute("filter", "url(#phase-glow)");
  phaseUse.setAttribute("href", "#phase-new");
  phaseUse.setAttributeNS(XLINK, "href", "#phase-new");
  phaseUse.setAttribute("pointer-events", "none");

  function update(t){
    const eLon = earthHelioLon(t);
    const eScene = toSceneDeg(eLon);
    const [ux, uy] = dirUnit(eScene);
    const ex = ux*RADIUS.earth, ey = uy*RADIUS.earth;

    earthDot.setAttribute("cx", ex); earthDot.setAttribute("cy", ey);
    moonOrb.setAttribute("cx", ex);  moonOrb.setAttribute("cy", ey);

    const [vx, vy] = dirUnit(toSceneDeg(eLon + 180));
    sunRay.setAttribute("x1", ex); sunRay.setAttribute("y1", ey);
    sunRay.setAttribute("x2", vx*RADIUS.outer); sunRay.setAttribute("y2", vy*RADIUS.outer);

    const mLon = moonLonDeg(t);
    const [mxu, myu] = dirUnit(toSceneDeg(mLon));
    const mx = ex + mxu*RADIUS.moon, my = ey + myu*RADIUS.moon;
    moonDot.setAttribute("cx", mx); moonDot.setAttribute("cy", my);

    const aMoon = toSceneDeg(mLon);
    const dx = Math.cos((aMoon - 90) * Math.PI/180), dy = Math.sin((aMoon - 90) * Math.PI/180);
    const B = ex*dx + ey*dy;
    const C = ex*ex + ey*ey - RADIUS.outer*RADIUS.outer;
    const D = B*B - C;
    if (D >= 0){
      const tHit = -B + Math.sqrt(D);
      moonRay.setAttribute("x1", ex); moonRay.setAttribute("y1", ey);
      moonRay.setAttribute("x2", ex + tHit*dx); moonRay.setAttribute("y2", ey + tHit*dy);
    }

    const sunLon = norm360(eLon + 180);
    const elong = norm360(mLon - sunLon);
    const waning = elong > 180;
    const phaseAngle = waning ? 360 - elong : elong;

    let phaseId = "full";
    if (phaseAngle < 12)       phaseId = "new";
    else if (phaseAngle < 70)  phaseId = "crescent";
    else if (phaseAngle < 110) phaseId = "quarter";
    else if (phaseAngle < 170) phaseId = "gibbous";

    const href = `#phase-${phaseId}`;
    if (phaseUse.getAttribute("href") !== href){
      phaseUse.setAttribute("href", href);
      phaseUse.setAttributeNS(XLINK, "href", href);
    }

    if (waning) phaseMirror.setAttribute("transform", "scale(-1 1)");
    else phaseMirror.removeAttribute("transform");

    phaseGroup.setAttribute("transform", `translate(${mx} ${my})`);

    const sunVec = dirUnit(toSceneDeg(sunLon));
    const sunAngle = Math.atan2(sunVec[1], sunVec[0]) * 180/Math.PI;
    phaseAlign.setAttribute("transform", `rotate(${sunAngle})`);

    const S = fmtZodiac((eLon + 180) % 360);
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

    // Night ruler index (opposite the Sun)
    const oppIdx = Math.floor((eLon % 360) / 30);
    // Day sign index (where the Sun ray points)
    const sunIdx = Math.floor(((eLon + 180) % 360) / 30);

    const arr = L.constImgs || [];
    for (let i=0;i<arr.length;i++){
      const isOpp = i === oppIdx;
      const isSun = i === sunIdx && !isOpp;   // avoid double-styling

      // opacity: bright (1), dim (~0.28), or hidden (0)
      arr[i].style.opacity = isOpp ? 1 : isSun ? 0.28 : 0;

      // filters: glow for opposite, soft gray for sun-hit
      if (isOpp)        arr[i].setAttribute("filter","url(#constGlow)");
      else if (isSun)   arr[i].setAttribute("filter","url(#constDim)");
      else              arr[i].removeAttribute("filter");

      // keep class for non-Safari paths
      arr[i].classList.toggle("active", isOpp);
    }
  }
  return { update };
}
