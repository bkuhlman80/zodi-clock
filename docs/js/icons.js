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

// Register an “eclipse” symbol: outer ring + overlapping disk
export function registerEclipse(defs){
  if (defs.querySelector("#eclipseGlyph")) return;
  const sym = document.createElementNS(NS, "symbol");
  sym.setAttribute("id", "eclipseGlyph");
  sym.setAttribute("viewBox", "0 0 100 100");

  // Outer ring
  const ring = document.createElementNS(NS, "circle");
  ring.setAttribute("cx", "50"); ring.setAttribute("cy", "50"); ring.setAttribute("r", "42");
  ring.setAttribute("fill", "none");
  ring.setAttribute("stroke", "currentColor");
  ring.setAttribute("stroke-width", "12");
  sym.appendChild(ring);

  // Overlapping disk (the “occulter”)
  const disk = document.createElementNS(NS, "circle");
  disk.setAttribute("cx", "66"); disk.setAttribute("cy", "50"); disk.setAttribute("r", "32");
  disk.setAttribute("fill", "currentColor");
  sym.appendChild(disk);

  defs.appendChild(sym);
}

export function useEclipse(svg, x, y, pxSize, color){
  const use = document.createElementNS(NS, "use");
  use.setAttributeNS(XLINK, "href", "#eclipseGlyph");
  const s = pxSize / 100; // glyph viewBox = 100
  use.setAttribute("transform", `translate(${x} ${y}) scale(${s}) translate(-50 -50)`);
  if (color) {
    use.setAttribute("fill", color);
    use.setAttribute("stroke", color);
  }
  return use;
}
