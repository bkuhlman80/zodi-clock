// docs/js/nodes.js
import { COLORS, RADIUS, ECLIPSE_CORRIDOR_DEG, FONT_SYM, SIGNS } from "./constants.js";
import { group, text, path, polar } from "./svg.js";
import { angDiff, toSceneDeg, norm360 } from "./math.js";
import { ensureDefs, registerEclipse, useEclipseBox } from "./icons.js";

// mean lunar node (deg) — fallback if ephemeris lacks true nodes
function julianCenturies(d){
  const jd = d.getTime()/86400000 + 2440587.5;
  return (jd - 2451545.0)/36525.0;
}
function meanNodeLon(d){
  const T = julianCenturies(d);
  let w = 125.04452 - 1934.136261*T + 0.0020708*T*T + T*T*T/450000;
  return ((w % 360) + 360) % 360;
}

export function initNodes(ctx){
  ctx.layers ||= {};
  ctx.state  ||= {};
  const L = ctx.layers;
  L.nodes ||= {};

  // root groups
  const root   = L.nodes.root   ??= group({ id: "nodes" });
  const arcsG  = L.nodes.arcs   ??= group({ class: "node-arcs" });
  const pinsG  = L.nodes.pins   ??= group({ class: "node-pins" });
  const labelG = L.nodes.labels ??= group({ class: "node-labels" });

  if (!root.parentNode){ ctx.svg.appendChild(root); root.append(arcsG, pinsG, labelG); }

  // persistent for click readout
  ctx.state.nodeLabel ||= null;
  ctx.state.nodeAscLon = null;
  ctx.state.nodeDescLon = null;

  // click → micro-label like "☊ 12°♉︎"
  if (!L.nodes.boundPointer) {
    ctx.svg.addEventListener("pointerdown", (ev) => {
      const pt = ctx.svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      const { x, y } = pt.matrixTransform(ctx.svg.getScreenCTM().inverse());

      const d = Math.hypot(x, y) - RADIUS.nodes;
      if (Math.abs(d) > 14) return;

      const aScene = norm360(-Math.atan2(y, x) * 180 / Math.PI + 90);
      const asc = ctx.state.nodeAscLon, desc = ctx.state.nodeDescLon;
      if (asc == null || desc == null) return;

      const hit = (Math.abs(angDiff(aScene, norm360(toSceneDeg(asc)))) <
                   Math.abs(angDiff(aScene, norm360(toSceneDeg(desc))))) ? "asc" : "desc";
      const lon = hit === "asc" ? asc : desc;

      const deg = Math.round(norm360(lon) % 30);
      const sign = SIGNS[Math.floor(norm360(lon) / 30)];
      const [lx, ly] = polar(0, 0, RADIUS.nodes, toSceneDeg(lon));

      if (ctx.state.nodeLabel) ctx.state.nodeLabel.remove();
      const t = text(lx, ly - 16, `${hit === "asc" ? "☊" : "☋"} ${deg}°${sign}`, {
        "font-size": 12,
        fill: COLORS.text,
        "paint-order": "stroke",
        stroke: "#000",
        "stroke-width": 12,
        "font-family": FONT_SYM,
      });
      labelG.appendChild(t);
      ctx.state.nodeLabel = t;
    }, { passive: true });
    L.nodes.boundPointer = true;
  }

  // short arc from startScene by signed arcDeg (CW if >0, CCW if <0)
  function smallArcPathSigned(cx, cy, r, startScene, arcDeg){
    const s = startScene, e = s + arcDeg;
    const a = d => (d - 90) * Math.PI/180;
    const x1 = cx + r*Math.cos(a(s)), y1 = cy + r*Math.sin(a(s));
    const x2 = cx + r*Math.cos(a(e)), y2 = cy + r*Math.sin(a(e));
    const large = 0;
    const sweep = arcDeg >= 0 ? 1 : 0; // short arc direction
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
  }

  // pair of concave corridor arcs around a node
  function drawNodeArcsPair(nodeLon, highlight){
    const rArc    = RADIUS.nodes - 8;
    const total   = 2*ECLIPSE_CORRIDOR_DEG;
    const half    = total / 2;
    const gapPx   = 2;
    const gapDeg  = gapPx * 360 / (2 * Math.PI * rArc); // tiny visual gap
    const style = {
      fill: "none",
      stroke: highlight ? (COLORS.nodeArcHi || "#f3722c") : (COLORS.nodeArc || "#f8961e"),
      "stroke-width": 0.6,
      "stroke-linecap": "round",
      "stroke-opacity": highlight ? 0.65 : 0.35
    };
    const A = toSceneDeg(nodeLon);
    // CCW left of pin
    arcsG.appendChild(path(smallArcPathSigned(0,0,rArc, A - gapDeg, -half), style));
    // CW right of pin
    arcsG.appendChild(path(smallArcPathSigned(0,0,rArc, A + gapDeg, +half), style));
  }

  // update(t, sunLonGeo, nodeAsc?, nodeDesc?)
  function update(t, sunLon, nodeAsc, nodeDesc){
    arcsG.replaceChildren();
    pinsG.replaceChildren();
    // also nuke any stray legacy icons not under pinsG
    ctx.svg.querySelectorAll(".eclipse-node").forEach(n => n.remove());

    const d = (t instanceof Date) ? t : new Date(t);
    if (isNaN(d)) return;

    // true nodes preferred; else mean node
    const asc0  = (nodeAsc  != null) ? nodeAsc  : meanNodeLon(d);
    const desc0 = (nodeDesc != null) ? nodeDesc : (asc0 + 180);

    const asc  = ((asc0  % 360) + 360) % 360;
    const desc = ((desc0 % 360) + 360) % 360;
    const s    = ((sunLon % 360) + 360) % 360;

    ctx.state.nodeAscLon  = asc;
    ctx.state.nodeDescLon = desc;

    const ascHi  = Math.abs(angDiff(s, asc))  <= ECLIPSE_CORRIDOR_DEG;
    const descHi = Math.abs(angDiff(s, desc)) <= ECLIPSE_CORRIDOR_DEG;

    drawNodeArcsPair(asc,  ascHi);
    drawNodeArcsPair(desc, descHi);

    // pins → eclipse glyphs
    const defs = ensureDefs(ctx.svg);
    registerEclipse(defs);

    const [ax, ay] = polar(0, 0, RADIUS.nodes, toSceneDeg(asc));
    const [dx, dy] = polar(0, 0, RADIUS.nodes, toSceneDeg(desc));
    
    // pick one: "double-outline", "solid-overlap", or "hatched"
    const color   = COLORS.nodePin || COLORS.text;
    const variant = "double-outline";      // or "solid-overlap" | "hatched"
    const DIAM    = 10; // scene units; try 8–12
    const a  = useEclipseBox(ctx.svg, ax, ay, DIAM, color, variant);
    const d2 = useEclipseBox(ctx.svg, dx, dy, DIAM, color, variant);
    a.classList.add("eclipse-node"); d2.classList.add("eclipse-node");
    pinsG.append(a, d2);

    // keep any active micro-label on top
    if (ctx.state.nodeLabel) labelG.appendChild(ctx.state.nodeLabel);
  }

  return { update };
}
