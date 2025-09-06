// docs/js/nodes.js
import { COLORS, RADIUS, ECLIPSE_CORRIDOR_DEG, FONT_SYM, SIGNS } from "./constants.js";
import { group, text, path, polar, arcPath } from "./svg.js";
import { angDiff, toSceneDeg, norm360 } from "./math.js";

// REMOVE the old canvas-based drawNodes() — it conflicted with SVG.
// (It was why glyphs were missing.) Everything below is SVG.

export function initNodes(ctx) {
  if (ctx.state?.nodesInited) return ctx.layers.nodesAPI; // guard double init

  const g = group({ id: "nodes" });
  ctx.svg.appendChild(g);
  ctx.layers.nodes = g;

  // state
  ctx.state.nodeLabel = null;
  ctx.state.nodesInited = true;

  // click → micro-label like "☊ 12°♉︎"
  ctx.svg.addEventListener("pointerdown", (ev) => {
    const pt = ctx.svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const { x, y } = pt.matrixTransform(ctx.svg.getScreenCTM().inverse());
    const hit = hitTestNode(x, y);
    if (!hit) return;

    
    const lon = hit === "asc" ? ctx.ephem?.node_true_asc : ctx.ephem?.node_true_desc;
    if (lon == null) return;

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
    g.appendChild(t);
    ctx.state.nodeLabel = t;
  }, { passive: true });

  function hitTestNode(x, y) {
    const d = Math.hypot(x, y) - RADIUS.nodes;
    if (Math.abs(d) > 12) return null;

    const aScene = norm360(-Math.atan2(y, x) * 180 / Math.PI + 90); // scene deg
    const asc = ctx.ephem?.node_true_asc;
    const desc = ctx.ephem?.node_true_desc;
    if (asc == null || desc == null) return null;

    const da = Math.abs(angDiff(aScene, norm360(toSceneDeg(asc))));
    const dd = Math.abs(angDiff(aScene, norm360(toSceneDeg(desc))));
    return da < dd ? "asc" : "desc";
  }

  function drawNodeArc(nodeLon, highlight) {
    const a0 = toSceneDeg(nodeLon - ECLIPSE_CORRIDOR_DEG);
    const a1 = toSceneDeg(nodeLon + ECLIPSE_CORRIDOR_DEG);
    const d = arcPath(0, 0, RADIUS.nodes, a0, a1);
    g.appendChild(path(d, {
      fill: "none",
      stroke: highlight ? (COLORS.nodeArcHi || "rgba(255,255,255,0.9)")
                        : (COLORS.nodeArc   || "rgba(255,255,255,0.35)"),
      "stroke-width": 3,
      "stroke-linecap": "round",
    }));
  }

  function update(sunLon, nodeAsc, nodeDesc) { // pass eph.node_true_asc/desc here
    g.replaceChildren();

    // arcs
    const ascHi  = Math.abs(angDiff(sunLon, nodeAsc))  <= ECLIPSE_CORRIDOR_DEG;
    const descHi = Math.abs(angDiff(sunLon, nodeDesc)) <= ECLIPSE_CORRIDOR_DEG;
    drawNodeArc(nodeAsc, ascHi);
    drawNodeArc(nodeDesc, descHi);

    // pins (append them — this was missing)
    const [ax, ay] = polar(0, 0, RADIUS.nodes, toSceneDeg(nodeAsc));
    const [dx, dy] = polar(0, 0, RADIUS.nodes, toSceneDeg(nodeDesc));
    const ta = text(ax, ay, "☊", { "font-size": 16, fill: COLORS.nodePin || COLORS.text, "font-family": FONT_SYM });
    const td = text(dx, dy, "☋", { "font-size": 16, fill: COLORS.nodePin || COLORS.text, "font-family": FONT_SYM });
    g.appendChild(ta);
    g.appendChild(td);

    // keep any active micro-label on top
    if (ctx.state.nodeLabel) g.appendChild(ctx.state.nodeLabel);
  }

  const api = { update };
  ctx.layers.nodesAPI = api;
  return api;
}
