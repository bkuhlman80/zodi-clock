import { RADIUS } from "./constants.js";

export function makeCtx(svg){ return { svg, layers:{}, ephem:null }; }

export function ensureSvg(host){
  let svg = host.querySelector("svg");
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const M = 24, R = RADIUS.zodiac + M;
    svg.setAttribute("viewBox", `${-R} ${-R} ${2*R} ${2*R}`);
    svg.setAttribute("width","100%"); svg.setAttribute("height","100%");
    host.appendChild(svg);
  }
  return svg;
}
