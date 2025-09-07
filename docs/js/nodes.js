// docs/js/nodes.js
import { COLORS, RADIUS, ECLIPSE_CORRIDOR_DEG, FONT_SYM, SIGNS } from "./constants.js";
import { group, text, path, polar, arcPath } from "./svg.js";
import { angDiff, toSceneDeg, norm360 } from "./math.js";

export function initNodes(ctx) {
  // namespaces
  ctx.layers ||= {};
  ctx.state  ||= {};
  const L = ctx.layers;
  L.nodes ||= {};

  // root groups (create once)
  const root   = L.nodes.root   ??= group({ id: "nodes" });
  const arcsG  = L.nodes.arcs   ??= group({ class: "node-arcs" });
  const pinsG  = L.nodes.pins   ??= group({ class: "node-pins" });
  const labelG = L.nodes.labels ??= group({ class: "node-labels" });

  // mount once
  if (!root.parentNode) {
    ctx.svg.appendChild(root);
    root.appendChild(arcsG);
    root.appendChild(pinsG);
    root.appendChild(labelG);
  }

  // label state
  ctx.state.nodeLabel ||= null;

  // click → micro-label like "☊ 12°♉︎"
  if (!L.nodes.boundPointer) {
    ctx.svg.addEventListener(
      "pointerdown",
      (ev) => {
        const pt = ctx.svg.createSVGPoint();
        pt.x = ev.clientX; pt.y = ev.clientY;
        const { x, y } = pt.matrixTransform(ctx.svg.getScreenCTM().inverse());
        const hit = hitTestNode(x, y);
        if (!hit) return;

        const lon = hit === "asc" ? ctx.ephem?.node_true_asc : ctx.ephem?.node_true_desc;
        if (lon == null) return;

        const deg  = Math.round(norm360(lon) % 30);
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
      },
      { passive: true }
    );
    L.nodes.boundPointer = true;
  }

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
    arcsG.appendChild(
      path(d, {
        fill: "none",
        stroke: highlight ? (COLORS.nodeArcHi || "rgba(255,255,255,0.9)")
                          : (COLORS.nodeArc   || "rgba(255,255,255,0.35)"),
        "stroke-width": 4,
        "stroke-linecap": "round",
      })
    );
  }

  function update(sunLon, nodeAsc, nodeDesc) {
    // refresh arcs and pins only (preserve label if present)
    arcsG.replaceChildren();
    pinsG.replaceChildren();

    // arcs with corridor highlight
    const ascHi  = Math.abs(angDiff(sunLon, nodeAsc))  <= ECLIPSE_CORRIDOR_DEG;
    const descHi = Math.abs(angDiff(sunLon, nodeDesc)) <= ECLIPSE_CORRIDOR_DEG;
    drawNodeArc(nodeAsc, ascHi);
    drawNodeArc(nodeDesc, descHi);

    // pins
    const [ax, ay] = polar(0, 0, RADIUS.nodes, toSceneDeg(nodeAsc));
    const [dx, dy] = polar(0, 0, RADIUS.nodes, toSceneDeg(nodeDesc));
    pinsG.appendChild(text(ax, ay, "☊", { "font-size": 18, fill: COLORS.nodePin || COLORS.text, "font-family": FONT_SYM }));
    pinsG.appendChild(text(dx, dy, "☋", { "font-size": 18, fill: COLORS.nodePin || COLORS.text, "font-family": FONT_SYM }));

    // keep any active micro-label on top
    if (ctx.state.nodeLabel) labelG.appendChild(ctx.state.nodeLabel);
  }

  const api = { update };
  L.nodes.api = api;
  return api;
}
