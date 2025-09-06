// docs/js/nodes.js
import { COLORS, RADIUS, ECLIPSE_CORRIDOR_DEG, FONT_SYM, SIGNS } from "./constants.js";
import { group, text, path, polar, arcPath, glyph } from "./svg.js";
import { angDiff, toSceneDeg, norm360 } from "./math.js";

export function initNodes(ctx) {
  const g = group({ id: "nodes" });
  ctx.svg.appendChild(g);
  ctx.layers.nodes = g;

  // state for label
  ctx.state.nodeLabel = null;

  // click → micro-label near closest pin on node ring
  ctx.svg.addEventListener("pointerdown", ev => {
    const pt = ctx.svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const { x, y } = pt.matrixTransform(ctx.svg.getScreenCTM().inverse());
    const hit = hitTestNode(x, y);
    if (!hit) return;

    const lon = hit === "asc" ? ctx.ephem?.nodeAsc : ctx.ephem?.nodeDesc;
    if (lon == null) return;

    // label text like "☊ 12°♉︎"
    const deg = Math.round(norm360(lon) % 30);
    const sign = SIGNS[Math.floor(norm360(lon) / 30)];
    const scene = toSceneDeg(lon);
    const [lx, ly] = polar(0, 0, RADIUS.nodes, scene);

    if (ctx.state.nodeLabel) ctx.state.nodeLabel.remove();
    const t = text(lx, ly - 16, `${hit === "asc" ? "☊" : "☋"} ${deg}°${sign}`, {
      "font-size": 12,
      fill: COLORS.text,
      "paint-order": "stroke",
      stroke: "#000",
      "stroke-width": 2
    });
    t.setAttribute("font-family", FONT_SYM);
    ctx.svg.appendChild(t);
    ctx.state.nodeLabel = t;
  });

  function hitTestNode(x, y) {
    // near the node ring?
    const d = Math.hypot(x, y) - RADIUS.nodes;
    if (Math.abs(d) > 12) return null;

    // compare angle to asc/desc scene angles
    const aScene = norm360(-Math.atan2(y, x) * 180 / Math.PI + 90); // scene degrees
    const asc = ctx.ephem?.nodeAsc;
    const desc = ctx.ephem?.nodeDesc;
    if (asc == null || desc == null) return null;

    const da = Math.abs(angDiff(aScene, norm360(toSceneDeg(asc))));
    const dd = Math.abs(angDiff(aScene, norm360(toSceneDeg(desc))));
    return da < dd ? "asc" : "desc";
  }

  function drawNodeArcs(nodeLon, highlight) {
    const a0 = toSceneDeg(nodeLon - ECLIPSE_CORRIDOR_DEG);
    const a1 = toSceneDeg(nodeLon + ECLIPSE_CORRIDOR_DEG);
    const d = arcPath(0, 0, RADIUS.nodes, a0, a1);
    g.appendChild(
      path(d, {
        fill: "none",
        stroke: highlight ? COLORS.nodeArcHi : COLORS.nodeArc,
        "stroke-width": 3,
        "stroke-linecap": "round"
      })
    );
  }

  function update(sunLon, nodeAsc, nodeDesc) {
    g.replaceChildren();

    // arcs first
    const ascHi = Math.abs(angDiff(sunLon, nodeAsc)) <= ECLIPSE_CORRIDOR_DEG;
    const descHi = Math.abs(angDiff(sunLon, nodeDesc)) <= ECLIPSE_CORRIDOR_DEG;
    drawNodeArcs(nodeAsc, ascHi);
    drawNodeArcs(nodeDesc, descHi);

    // pins
    const [ax, ay] = polar(0, 0, RADIUS.nodes, toSceneDeg(nodeAsc));
    const [dx, dy] = polar(0, 0, RADIUS.nodes, toSceneDeg(nodeDesc));
    const ta = text(ax, ay, "☊", { "font-size": 16, fill: COLORS.nodePin || COLORS.text });
    const td = text(dx, dy, "☋", { "font-size": 16, fill: COLORS.nodePin || COLORS.text });
    ta.setAttribute("font-family", FONT_SYM);
    td.setAttribute("font-family", FONT_SYM);
  }

  return { update };
}
