// docs/js/draw_node_arcs.js
import { toSceneDeg } from "./geom.js";
const SEASON_DEG = 18.5;

export function drawNodeArcs(ctx, scene, ephForDay, sunLon) {
  const arcR = scene.rEarth + scene.rMoon + 10*scene.dp;
  const stroke = 2*scene.dp;

  ctx.save();
  ctx.translate(scene.cx, scene.cy);
  ctx.lineWidth = stroke;

  const nodes = [ephForDay.node_true_asc, ephForDay.node_true_desc];
  for (const lon of nodes) {
    const startDeg = toSceneDeg(lon - SEASON_DEG);
    const endDeg   = toSceneDeg(lon + SEASON_DEG);
    const a0 = (startDeg) * Math.PI/180;
    const a1 = (endDeg)   * Math.PI/180;

    // base arc
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(0,0, arcR, a0, a1);  // correct direction along the ring
    ctx.stroke();

    // highlight if Sun within ±18.5°
    const d = angularSepDeg(sunLon, lon);
    if (d <= SEASON_DEG) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(0,0, arcR, a0, a1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function angularSepDeg(a, b){
  let d = Math.abs(((a - b + 540) % 360) - 180);
  return d; // 0..180
}
