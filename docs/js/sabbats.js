// docs/js/sabbats.js
import { COLORS, RADIUS } from "./constants.js";
import { group, text, svgEl, polar } from "./svg.js";
import { toSceneDeg } from "./math.js";

const SABBATS = [
  { key: "Yule",     deg: 270 },
  { key: "Imbolc",   deg: 315 },
  { key: "Ostara",   deg:   0 },
  { key: "Beltane",  deg:  45 },
  { key: "Litha",    deg:  90 },
  { key: "Lughnasa", deg: 135 },
  { key: "Mabon",    deg: 180 },
  { key: "Samhain",  deg: 225 },
];

export function drawSabbats(ctx){
  ctx.layers ||= {};
  const L = ctx.layers;
  L.sabbats ||= {};

  const root  = L.sabbats.root  ??= group({ id:"sabbats" });
  const labs  = L.sabbats.labels??= group({ class:"sabbat-labels" });

  if (!root.parentNode){ ctx.svg.appendChild(root); root.append(labs); }

  labs.replaceChildren();

  const PAD_X = 6, PAD_Y = 3, RX = 6;
  const FS = 12;

  for (const s of SABBATS){
    // rotate labels so Earth sits on the festival name at the actual date
    const a = toSceneDeg((s.deg + 180) % 360);
    const [lx,ly] = polar(0,0,RADIUS.earth, a);

    const g = group();
    const t = text(lx, ly, s.key, {
      "font-size": FS,
      fill: COLORS.text,
      "text-anchor": "middle",
      "dominant-baseline": "middle"
    });
    g.appendChild(t);
    labs.appendChild(g);

    // pill background (same look as seasons)
    const bb = g.getBBox();
    const bg = svgEl("rect", {
      x: bb.x - PAD_X,
      y: bb.y - PAD_Y,
      width: bb.width + PAD_X*2,
      height: bb.height + PAD_Y*2,
      rx: RX, ry: RX,
      fill: COLORS.badgeBG,
      opacity: 0.16,
      stroke: COLORS.badgeBG,
      "stroke-opacity": 0.32
    });
    g.insertBefore(bg, g.firstChild);
  }
}

export function updateSabbats(_ctx,_t){}
