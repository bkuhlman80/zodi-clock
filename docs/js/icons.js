// docs/js/icons.js
const NS = "http://www.w3.org/2000/svg";
const XLINK = "http://www.w3.org/1999/xlink";

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
    sym.appendChild(mk("circle", {cx:50, cy:50, r:42, fill:"none", stroke:"currentColor", "stroke-width":10}));
    sym.appendChild(mk("circle", {cx:66, cy:50, r:32, fill:"none", stroke:"currentColor", "stroke-width":10}));
  } else if (variant === "solid-overlap"){
    // Ring + solid occluder (your first mock)
    sym.appendChild(mk("circle", {cx:50, cy:50, r:42, fill:"none", stroke:"currentColor", "stroke-width":12}));
    sym.appendChild(mk("circle", {cx:66, cy:50, r:32, fill:"currentColor"}));
  } else { // "hatched"
    sym.appendChild(mk("circle", {cx:50, cy:50, r:42, fill:"none", stroke:"currentColor", "stroke-width":10}));
    sym.appendChild(mk("circle", {cx:66, cy:50, r:32, fill:"url(#eclipseHatch)", stroke:"currentColor", "stroke-width":10}));
  }

  defs.appendChild(sym);
  return id;
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
