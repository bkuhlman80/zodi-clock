// docs/js/seasons.js
import { COLORS, RADIUS } from "./constants.js";
import { group, line, badge, polar } from "./svg.js";
import { seasonsUTC, nextSeason } from "./engine.js";

/** Create seasons layer group on ctx.svg. */
export function drawSeasons(ctx) {
  const g = group({ id: "seasons" });
  ctx.svg.appendChild(g);
  ctx.layers.seasons = g;
}

/** Update ticks and badges on outer ring. */
export function updateSeasons(ctx, now) {
  const g = ctx.layers.seasons;
  if (!g) return;
  g.replaceChildren();

  // canonical sign longitudes for season spokes
  const SPOKES = [
    { key: "MarEq", lon: 0,   chip: "Mar", full: "March Equinox" },
    { key: "JunSol",lon: 90,  chip: "Jun", full: "June Solstice" },
    { key: "SepEq", lon: 180, chip: "Sep", full: "September Equinox" },
    { key: "DecSol",lon: 270, chip: "Dec", full: "December Solstice" },
  ];

  // source seasons from Astronomy; fallback to ephemeris if available
  const yr = now.getUTCFullYear();
  let seas = seasonsUTC(yr); // {MarEq, JunSol, ...} or nulls
  if (!seas?.MarEq && ctx.ephem?.seasons) seas = ctx.ephem.seasons;

  // choose next season for proximity effect
  const nxt = seas ? nextSeason(now.toISOString(), seas) : { key:null, when:null, days:Infinity };
  const proxActive = Number.isFinite(nxt.days) && Math.abs(nxt.days) <= 3;

  // draw ticks and chips on outer ring
  const inner = RADIUS.season;
  for (const s of SPOKES) {
    const tickLen = 10;
    const [x1,y1] = polar(0,0, inner, s.lon);
    const [x2,y2] = polar(0,0, inner - tickLen, s.lon);
    g.appendChild(line(x1,y1,x2,y2,{ stroke: COLORS.seasonTick, "stroke-width": 2 }));

    const [bx,by] = polar(0,0, inner - 22, s.lon);
    const isNext = proxActive && nxt.key === s.key;
    badge(g, bx, by, {
      label: s.chip,
      fg: "#0b0c10",
      bg: isNext ? COLORS.badgeHi : COLORS.badgeBG,
      size: 11, pad: 5, r: 7,
    });

    if (isNext && nxt.when instanceof Date) {
      const iso = nxt.when.toISOString().slice(0,10);
      // small date tag under the badge; scale as it approaches
      const scale = 1 + (1 - Math.abs(nxt.days)/3) * 0.35;
      const [tx,ty] = polar(0,0, inner - 22, s.lon);
      const tag = badge(g, tx, ty + 16, { label: iso, fg: COLORS.text, bg: "transparent", size: 10, pad: 2, r: 4 });
      tag.setAttribute("transform", `translate(${tx},${ty}) scale(${scale}) translate(${-tx},${-ty})`);
    }
  }
}
