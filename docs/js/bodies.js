// docs/js/bodies.js
import { RADIUS } from "./constants.js";
import { group, line, circle, polar } from "./svg.js";
import { toSceneDeg } from "./math.js";
import { solarLonDeg, moonLonDeg } from "./engine.js";

export function initBodies(ctx){
  const g = group({ id: "bodies" });
  ctx.svg.appendChild(g);
  ctx.layers.bodies = g;
  return { update: (t)=>updateBodies(ctx, t) };
}

export function updateBodies(ctx, t){
  const g = ctx.layers.bodies; if (!g) return;
  g.replaceChildren();

  // Sun (spoke + marker at rim)
  const sunLon = solarLonDeg(t);
  const aSun   = toSceneDeg(sunLon);
  const [sx, sy] = polar(0, 0, RADIUS.zodiac - 12, aSun);
  g.appendChild(line(0, 0, sx, sy, { stroke: "#f9c74f", "stroke-width": 2, opacity: 0.9 }));
  g.appendChild(circle(sx, sy, 8, { fill: "#f9c74f", stroke: "#f6aa1c", "stroke-width": 2 }));

  // Earth (opposite the Sun on ecliptic; inner orbit ring + marker)
  const aEarth = toSceneDeg((sunLon + 180) % 360);
  const [ex, ey] = polar(0, 0, RADIUS.earth, aEarth);
  g.appendChild(circle(0, 0, RADIUS.earth, { fill: "none", stroke: "#3a3f48", "stroke-width": 1 }));
  g.appendChild(circle(ex, ey, 6, { fill: "#4ea8de", stroke: "#1b6fa8", "stroke-width": 2 }));

  // Moon (true ecliptic lon; draw relative to Earth on moon ring)
  const aMoon = toSceneDeg(moonLonDeg(t));
  const [mx, my] = polar(ex, ey, RADIUS.moon, aMoon);
  g.appendChild(circle(ex, ey, RADIUS.moon, { fill: "none", stroke: "#5a616e", "stroke-dasharray": "2 3", "stroke-width": 1 }));
  g.appendChild(circle(mx, my, 4, { fill: "#cfd6e3", stroke: "#9aa0a6", "stroke-width": 1.5 }));
}
