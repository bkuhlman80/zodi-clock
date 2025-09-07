// docs/js/nodes.js
import { COLORS, RADIUS, ECLIPSE_CORRIDOR_DEG, FONT_SYM, SIGNS } from "./constants.js";
import { group, text, path, polar, arcPath } from "./svg.js";
import { angDiff, toSceneDeg, norm360 } from "./math.js";

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
        "stroke-width": 2,
        "font-family": FONT_SYM,
      });
      labelG.appendChild(t);
      ctx.state.nodeLabel = t;
    }, { passive: true });
    L.nodes.boundPointer = true;
  }

  function drawNodeArc(nodeLon, highlight){
    const a0 = toSceneDeg(nodeLon - ECLIPSE_CORRIDOR_DEG);
    const a1 = toSceneDeg(nodeLon + ECLIPSE_CORRIDOR_DEG);
    const d  = arcPath(0, 0, RADIUS.nodes, a0, a1);
    arcsG.appendChild(path(d, {
      fill: "none",
      stroke: highlight ? (COLORS.nodeArcHi || "rgba(255,255,255,0.9)")
                        : (COLORS.nodeArc   || "rgba(255,255,255,0.35)"),
      "stroke-width": 4,
      "stroke-linecap": "round",
    }));
  }

  // update(t, sunLonGeo, nodeAsc?, nodeDesc?)
  function update(t, sunLon, nodeAsc, nodeDesc){
    arcsG.replaceChildren();
    pinsG.replaceChildren();

    const asc = (nodeAsc != null) ? nodeAsc : meanNodeLon(new Date(t));
    const desc = (nodeDesc != null) ? nodeDesc : (asc + 180) % 360;

    ctx.state.nodeAscLon = asc;
    ctx.state.nodeDescLon = desc;

    // arcs with corridor highlight
    const ascHi  = Math.abs(angDiff(sunLon, asc))  <= ECLIPSE_CORRIDOR_DEG;
    const descHi = Math.abs(angDiff(sunLon, desc)) <= ECLIPSE_CORRIDOR_DEG;
    drawNodeArc(asc, ascHi);
    drawNodeArc(desc, descHi);

    // pins
    const [ax, ay] = polar(0, 0, RADIUS.nodes, toSceneDeg(asc));
    const [dx, dy] = polar(0, 0, RADIUS.nodes, toSceneDeg(desc));
    pinsG.appendChild(text(ax, ay, "☊", { "font-size": 18, fill: COLORS.nodePin || COLORS.text, "font-family": FONT_SYM }));
    pinsG.appendChild(text(dx, dy, "☋", { "font-size": 18, fill: COLORS.nodePin || COLORS.text, "font-family": FONT_SYM }));

    // keep any active micro-label on top
    if (ctx.state.nodeLabel) labelG.appendChild(ctx.state.nodeLabel);
  }

  return { update };
}
