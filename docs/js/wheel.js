// docs/js/wheel.js
import { COLORS, RADIUS, SIGNS, SIGN_NAMES, FONT_SYM } from "./constants.js";
import { group, circle, line, text, polar } from "./svg.js";
import { toSceneDeg } from "./math.js";

/** Static zodiac ring and scaffolding rings. */
export function drawWheel(ctx) {
  const g = group({ id: "wheel" });
  ctx.svg.appendChild(g);

  // outer zodiac ring
  g.appendChild(circle(0, 0, RADIUS.zodiac, {
    fill: "none", stroke: COLORS.ring, "stroke-width": 2
  }));

  // 12 spokes + sign glyphs + names (scene degrees: top=0°, clockwise)
  for (let i = 0; i < 12; i++) {
    const lon = i * 30;
    const a = toSceneDeg(lon);

    // spoke
    const [sx, sy] = polar(0, 0, RADIUS.zodiac, a);
    g.appendChild(line(0, 0, sx, sy, { stroke: COLORS.ring, "stroke-width": 1 }));

    // glyph
    const [gx, gy] = polar(0, 0, RADIUS.zodiac - 28, a);
    const tg = text(gx, gy, SIGNS[i], { "font-size": 16, fill: COLORS.text });
    tg.setAttribute("font-family", FONT_SYM);

    // name
    const [nx, ny] = polar(0, 0, RADIUS.zodiac - 46, a);
    g.appendChild(text(nx, ny, SIGN_NAMES[i], { "font-size": 9, fill: COLORS.text, opacity: 0.7 }));
  }

  // Earth and Moon scaffolding rings
  g.appendChild(circle(0, 0, RADIUS.earth, {
    fill: "none", stroke: COLORS.ring, "stroke-width": 1, opacity: 0.6
  }));
  g.appendChild(circle(0, 0, RADIUS.earth + RADIUS.moon, {
    fill: "none", stroke: COLORS.ring, "stroke-width": 1, opacity: 0.3
  }));
}
