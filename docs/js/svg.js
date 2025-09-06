// docs/js/svg.js
import { FONT_SYM } from "./constants.js";

const ns = "http://www.w3.org/2000/svg";

export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
export function group(attrs = {}) { return svgEl("g", attrs); }
export function circle(cx, cy, r, attrs = {}) { return svgEl("circle", { cx, cy, r, ...attrs }); }
export function line(x1, y1, x2, y2, attrs = {}) { return svgEl("line", { x1, y1, x2, y2, ...attrs }); }
export function text(x, y, str, attrs = {}) {
  const t = svgEl("text", { x, y, "dominant-baseline":"middle", "text-anchor":"middle", ...attrs });
  t.textContent = str; return t;
}
export function path(d, attrs = {}) { return svgEl("path", { d, ...attrs }); }

/** Polar in scene degrees: top=0°, clockwise. */
export function polar(cx, cy, r, degScene) {
  const a = (degScene - 90) * Math.PI/180;
  return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
}

/** Arc path in scene degrees (short arc, clockwise scene). */
export function arcPath(cx, cy, r, degStartScene, degEndScene) {
  const d = ((degEndScene - degStartScene) % 360 + 360) % 360;
  const large = d > 180 ? 1 : 0;
  const [x1, y1] = polar(cx, cy, r, degStartScene);
  const [x2, y2] = polar(cx, cy, r, degEndScene);
  const sweep = 0; // clockwise on screen
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
}

/** Rounded badge with auto width. */
export function badge(svg, x, y, opts = {}) {
  const { label="", fg="#e6e7eb", bg="#2a2f39", size=11, pad=4, r=8, dy=0 } = opts;
  const g = group();
  const t = text(x, y + dy, label, { fill: fg, "font-size": size });
  // crude width heuristic; good enough for UI chips
  const w = size * 0.64 * label.length + 2*pad;
  const h = size + pad;
  const rect = svgEl("rect", { x: x - w/2, y: y - h/2 + dy, width: w, height: h, rx: r, fill: bg });
  g.appendChild(rect); g.appendChild(t); svg.appendChild(g);
  return g;
}

/** Symbol text using FONT_SYM. */
export function glyph(svgRoot, x, y, ch, size = 16, color = "#e6e7eb", font = FONT_SYM) {
  const t = text(x, y, ch, { fill: color, "font-size": size });
  t.setAttribute("font-family", font);
  svgRoot.appendChild(t);
  return t;
}
