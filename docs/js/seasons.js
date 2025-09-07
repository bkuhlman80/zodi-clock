// docs/js/seasons.js
import { COLORS, RADIUS } from "./constants.js";
import { group, line, text, svgEl, polar } from "./svg.js";
import { toSceneDeg } from "./math.js";

const SEASONS = [
  { key: "Mar", deg:   0, glyph: "△" },  // March equinox
  { key: "Jun", deg:  90, glyph: "◇" },  // June solstice
  { key: "Sep", deg: 180, glyph: "▽" },  // September equinox
  { key: "Dec", deg: 270, glyph: "◇" },  // December solstice
];

export function drawSeasons(ctx){
  ctx.layers ||= {};
  const L = ctx.layers;
  L.seasons ||= {};

  const root  = L.seasons.root  ??= group({ id:"seasons" });
  const ticks = L.seasons.ticks ??= group({ class:"season-ticks" });
  const labs  = L.seasons.labels??= group({ class:"season-labels" });

  if (!root.parentNode){ ctx.svg.appendChild(root); root.append(ticks, labs); }

  // ticks and labels just outside zodiac
  ticks.replaceChildren();
  labs.replaceChildren();

  const tickLen = 10;
  for (const s of SEASONS){
    const a = toSceneDeg(s.deg);
    const [x1,y1] = polar(0,0,RADIUS.zodiac, a);
    const [x2,y2] = polar(0,0,RADIUS.zodiac + tickLen, a);
    ticks.appendChild(line(x1,y1,x2,y2,{ stroke: COLORS.seasonTick || COLORS.ring, "stroke-width": 2 }));

    // label and glyph side-by-side
    const [lx,ly] = polar(0,0,RADIUS.season, a);
    const g = group();
    const t = text(lx, ly, s.key, { "font-size": 12, fill: COLORS.text, "text-anchor":"end" });
    const sym = text(lx + 16, ly, s.glyph, { "font-size": 12, fill: COLORS.text });
    g.appendChild(t); g.appendChild(sym);
    labs.appendChild(g);
  }
}

// kept for API symmetry; nothing dynamic right now
export function updateSeasons(_ctx,_t){}
