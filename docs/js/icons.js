// docs/js/icons.js
const NS = "http://www.w3.org/2000/svg";
const XLINK = "http://www.w3.org/1999/xlink";

function mkEl(tag, attrs = {}){
  const el = document.createElementNS(NS, tag);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export function ensureDefs(svg){
  let defs = svg.querySelector("defs");
  if (!defs){
    defs = document.createElementNS(NS, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }
  return defs;
}

/** Register an eclipse glyph variant.
 *  variant: "double-outline" | "solid-overlap" | "hatched"
 */
export function registerEclipse(defs, variant="double-outline"){
  const id = `eclipseGlyph-${variant}`;
  if (defs.querySelector(`#${id}`)) return id;

  // optional hatch pattern for "hatched"
  if (variant === "hatched" && !defs.querySelector("#eclipseHatch")){
    const pat = document.createElementNS(NS,"pattern");
    pat.setAttribute("id","eclipseHatch");
    pat.setAttribute("patternUnits","userSpaceOnUse");
    pat.setAttribute("width","8"); pat.setAttribute("height","8");
    const line = document.createElementNS(NS,"path");
    line.setAttribute("d","M0 2 H8 M0 6 H8");
    line.setAttribute("stroke","currentColor"); line.setAttribute("stroke-width","1");
    pat.appendChild(line);
    defs.appendChild(pat);
  }

  const sym = document.createElementNS(NS, "symbol");
  sym.setAttribute("id", id);
  sym.setAttribute("viewBox", "0 0 100 100");

  const mk = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };

  if (variant === "double-outline"){
    // Two overlapping outlined circles (clean, no “eyeball” fill)
        // double-outline
    sym.appendChild(mk("circle",{cx:50,cy:50,r:42,fill:"none",stroke:"currentColor","stroke-width":6}));
    sym.appendChild(mk("circle",{cx:66,cy:50,r:32,fill:"none",stroke:"currentColor","stroke-width":6}));
  } else if (variant === "solid-overlap"){
        // Ring + solid occluder (your first mock)
    sym.appendChild(mk("circle", {cx:50, cy:50, r:42, fill:"none", stroke:"currentColor", "stroke-width":6}));
    sym.appendChild(mk("circle", {cx:66, cy:50, r:32, fill:"currentColor"}));
  } else { 
        // "hatched"
    sym.appendChild(mk("circle", {cx:50, cy:50, r:42, fill:"none", stroke:"currentColor", "stroke-width":6}));
    sym.appendChild(mk("circle", {cx:66, cy:50, r:32, fill:"url(#eclipseHatch)", stroke:"currentColor", "stroke-width":6}));
  }

  defs.appendChild(sym);
  return id;
}

export function useEclipseScene(svg, x, y, sceneDiameter, color, variant="double-outline"){
  const defs = ensureDefs(svg);
  const id = registerEclipse(defs, variant);
  const use = document.createElementNS(NS, "use");
  use.setAttributeNS(XLINK, "href", `#${id}`);
  const s = sceneDiameter / 100;                 // 100 = glyph viewBox
  use.setAttribute("transform", `translate(${x} ${y}) scale(${s}) translate(-50 -50)`);
  if (color){ use.setAttribute("stroke", color); use.setAttribute("fill", color); }
  return use;
}
/** Place the glyph at scene coords (x,y) with pixel size. */
export function useEclipse(svg, x, y, pxSize, color, variant="double-outline"){
  const defs = ensureDefs(svg);
  const id = registerEclipse(defs, variant);
  const use = document.createElementNS(NS, "use");
  use.setAttributeNS(XLINK, "href", `#${id}`);
  const s = pxSize / 100;                       // glyph viewBox 100
  use.setAttribute("transform", `translate(${x} ${y}) scale(${s}) translate(-50 -50)`);
  if (color){ use.setAttribute("stroke", color); use.setAttribute("fill", color); }
  return use;
}
// add this alongside useEclipseScene
export function useEclipseBox(svg, x, y, sceneDiameter, color, variant="double-outline"){
  const defs = ensureDefs(svg);
  const id = registerEclipse(defs, variant);
  const use = document.createElementNS(NS, "use");
  use.setAttributeNS(XLINK, "href", `#${id}`);

  // absolute sizing in scene units (no scale math)
  const d = sceneDiameter;
  use.setAttribute("x", x - d/2);
  use.setAttribute("y", y - d/2);
  use.setAttribute("width", d);
  use.setAttribute("height", d);

  if (color){ use.setAttribute("stroke", color); use.setAttribute("fill", color); }
  use.classList.add("eclipse-node");
  return use;
}

export function ensurePhaseDefs(svg){
  const defs = ensureDefs(svg);

  if (!defs.querySelector("#phase-glow")){
    const filter = mkEl("filter", { id: "phase-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" });
    filter.append(mkEl("feGaussianBlur", { stdDeviation: "1.6", result: "g" }));
    const merge = mkEl("feMerge");
    merge.append(mkEl("feMergeNode", { in: "g" }));
    merge.append(mkEl("feMergeNode", { in: "SourceGraphic" }));
    filter.append(merge);
    defs.appendChild(filter);
  }

  const ensureSymbol = (id, build) => {
    if (defs.querySelector(`#${id}`)) return;
    const sym = mkEl("symbol", { id, viewBox: "0 0 100 100" });
    sym.append(mkEl("circle", { cx: "50", cy: "50", r: "50", fill: "black" }));
    build(sym);
    defs.appendChild(sym);
  };

  ensureSymbol("phase-new", () => {});

  ensureSymbol("phase-full", sym => {
    sym.append(mkEl("circle", { cx: "50", cy: "50", r: "50", fill: "white" }));
  });

  ensureSymbol("phase-quarter", sym => {
    const d = "M50 0 A50 50 0 0 1 50 100 L50 0 Z";
    sym.append(mkEl("path", { d, fill: "white" }));
  });

  ensureSymbol("phase-crescent", sym => {
    const d = "M50 0 A50 50 0 1 1 49.9 0 Z M65 0 A35 50 0 1 0 65 100 Z";
    sym.append(mkEl("path", { d, fill: "white", "fill-rule": "evenodd" }));
  });

  ensureSymbol("phase-gibbous", sym => {
    const d = "M50 0 A50 50 0 1 1 49.9 0 Z M35 0 A35 50 0 1 0 35 100 Z";
    sym.append(mkEl("path", { d, fill: "white", "fill-rule": "evenodd" }));
  });

  return defs;
}
