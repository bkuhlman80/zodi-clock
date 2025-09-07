// docs/js/seasons.js
import { COLORS, RADIUS } from "./constants.js";
import { group, badge, polar, path, text } from "./svg.js";
import { seasonsUTC, nextSeason } from "./engine.js";

/** Create seasons layer group on ctx.svg. */
export function drawSeasons(ctx) {
  const g = group({ id: "seasons" });
  ctx.svg.appendChild(g);
  ctx.layers.seasons = g;
}

/** Update pins, chips, and proximity tag on outer ring. */
export function updateSeasons(ctx, now) {
  const g = ctx.layers.seasons;
  if (!g) return;
  g.replaceChildren();

  // 4 canonical spokes with types
  const SPOKES = [
    { key: "MarEq", lon: 0,   chip: "Mar", full: "March Equinox",     type: "eq"  },
    { key: "JunSol",lon: 90,  chip: "Jun", full: "June Solstice",     type: "sol" },
    { key: "SepEq", lon: 180, chip: "Sep", full: "September Equinox", type: "eq"  },
    { key: "DecSol",lon: 270, chip: "Dec", full: "December Solstice", type: "sol" },
  ];

  // season dates
  const yr = now.getUTCFullYear();
  let seas = seasonsUTC(yr);                // {MarEq, JunSol, SepEq, DecSol}
  if (!seas?.MarEq && ctx.ephem?.seasons) seas = ctx.ephem.seasons;

  // proximity window ±3 days
  const nxt = seas ? nextSeason(now.toISOString(), seas) : { key:null, when:null, days:Infinity };
  const proxActive = Number.isFinite(nxt.days) && Math.abs(nxt.days) <= 3;

  // ring radius just outside zodiac
  const ringR = (RADIUS.season ?? (RADIUS.zodiac + 12));
  const styles = {
    eq:  { stroke: "#64D2FF" },  // diamond
    sol: { stroke: "#FFD166" },  // triangle
  };

  for (const s of SPOKES) {
    // pin at ringR
    const [px, py] = polar(0, 0, ringR, s.lon);
    drawSeasonPin(g, px, py, s.type, styles[s.type].stroke);

    // chip just beyond pin
    const [bx, by] = polar(0, 0, ringR + 18, s.lon);
    const isNext = proxActive && nxt.key === s.key;
    badge(g, bx, by, {
      label: s.chip,
      fg: "#0b0c10",
      bg: isNext ? COLORS.badgeHi : COLORS.badgeBG,
      size: 11, pad: 5, r: 7,
    });

    // optional date tag under chip when within ±3 days
    if (isNext && nxt.when instanceof Date) {
      const iso = nxt.when.toISOString().slice(0,10);
      const scale = 1 + (1 - Math.abs(nxt.days)/3) * 0.35;
      const tag = badge(g, bx, by + 16, {
        label: iso, fg: COLORS.text, bg: "transparent", size: 10, pad: 2, r: 4
      });
      tag.setAttribute(
        "transform",
        `translate(${bx},${by}) scale(${scale}) translate(${-bx},${-by})`
      );
    }
  }

  // legend once
  if (!ctx.layers._legendDrawn) {
    drawSeasonLegend(g, ringR);
    ctx.layers._legendDrawn = true;
  }
}

/* helper: draw diamond (equinox) or triangle (solstice) */
function drawSeasonPin(g, x, y, kind, stroke) {
  const s = 8; // size
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("fill", "none");
  p.setAttribute("stroke", stroke);
  p.setAttribute("stroke-width", "2");
  p.setAttribute("stroke-linejoin", "round");

  if (kind === "eq") {
    p.setAttribute("d", `M ${x} ${y - s} L ${x + s} ${y} L ${x} ${y + s} L ${x - s} ${y} Z`);
  } else {
    p.setAttribute("d", `M ${x} ${y - s} L ${x + s} ${y + s} L ${x - s} ${y + s} Z`);
  }
  g.appendChild(p);
}

function drawSeasonLegend(g, ringR) {
  // anchor ~30° from top toward right, outside ring
  const [lx, ly] = polar(0, 0, ringR + 42, 30);

  // diamond
  const d1 = `M ${lx} ${ly-6} L ${lx+6} ${ly} L ${lx} ${ly+6} L ${lx-6} ${ly} Z`;
  g.appendChild(path(d1, { fill: "none", stroke: "#64D2FF", "stroke-width": 2 }));
  g.appendChild(text(lx + 18, ly, "Equinox", { "font-size": 11, fill: "#e6e7eb", "text-anchor": "start" }));

  // triangle
  const ty = ly + 18;
  const d2 = `M ${lx} ${ty-6} L ${lx+6} ${ty+6} L ${lx-6} ${ty+6} Z`;
  g.appendChild(path(d2, { fill: "none", stroke: "#FFD166", "stroke-width": 2 }));
  g.appendChild(text(lx + 18, ty, "Solstice", { "font-size": 11, fill: "#e6e7eb", "text-anchor": "start" }));
}
