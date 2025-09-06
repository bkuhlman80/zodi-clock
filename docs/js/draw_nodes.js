// docs/js/draw_nodes.js
import { toSceneDeg, arcAt } from "./geom.js";
export function drawNodes(ctx, scene, ephForDay) {
  const R = scene.rEarth + scene.rMoon;   // pin radius target
  const fs = 16 * scene.dp;               // glyph size
  ctx.save();
  ctx.translate(scene.cx, scene.cy);
  ctx.font = `${fs}px system-ui, "Apple Color Emoji", "Segoe UI Symbol"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const nodes = [
    { lon: ephForDay.node_true_asc, glyph: "☊" },
    { lon: ephForDay.node_true_desc, glyph: "☋" },
  ];
  for (const n of nodes) {
    const a = toSceneDeg(n.lon) * Math.PI/180;
    const x = R * Math.cos(a), y = R * Math.sin(a);
    ctx.fillText(n.glyph, x, y);
  }
  ctx.restore();
}
