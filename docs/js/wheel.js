import { group, circle, line, text } from "./svg.js";
import { polar } from "./svg.js";
import { SIGNS, SIGN_NAMES, RADIUS, COLORS, FONT_SYM } from "./constants.js";
import { toSceneDeg } from "./math.js";

export function drawWheel(ctx){
  const g = group({ id: "wheel" });
  ctx.svg.appendChild(g);

  g.appendChild(circle(0, 0, RADIUS.zodiac, {
    fill: "none", stroke: COLORS.ring, "stroke-width": 2
  }));

  // spokes
  for (let i=0;i<12;i++){
    const a = toSceneDeg(i*30);
    const [sx, sy] = polar(0,0,RADIUS.zodiac,a);
    g.appendChild(line(0,0,sx,sy,{ stroke: COLORS.ring, "stroke-width": 1 }));
  }

  // glyphs on boundaries
  for (let i=0;i<12;i++){
    const a = toSceneDeg(i*30);
    const [gx, gy] = polar(0,0,RADIUS.zodiac-28,a);
    const tg = text(gx, gy, SIGNS[i], { "font-size": 16, fill: COLORS.text });
    tg.setAttribute("font-family", FONT_SYM);
    g.appendChild(tg);
  }

  // names centered in slices
  const labelsG = group({ class:"sign-labels" });
  g.appendChild(labelsG);
  for (let i=0;i<12;i++){
    const mid = toSceneDeg(i*30 + 15);
    const [nx, ny] = polar(0,0,RADIUS.signLabel, mid);
    labelsG.appendChild(text(nx, ny, SIGN_NAMES[i], {
      "text-anchor":"middle","dominant-baseline":"middle",
      "font-size":12,"font-weight":500,"letter-spacing":0.5, fill: COLORS.text, opacity:0.9
    }));
  }

  // Earth/Moon scaffolding
  g.appendChild(circle(0,0,RADIUS.earth,{ fill:"none", stroke:COLORS.ring, "stroke-width":1, opacity:0.6 }));
  g.appendChild(circle(0,0,RADIUS.earth + RADIUS.moon,{ fill:"none", stroke:COLORS.ring, "stroke-width":1, opacity:0.3 }));
}
