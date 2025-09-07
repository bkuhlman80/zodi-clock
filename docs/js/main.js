// docs/js/main.js
import { loadEphemeris, getEphemFor } from "./ephemeris.js";
import { drawWheel } from "./wheel.js";
import { drawSeasons, updateSeasons } from "./seasons.js";
import { initNodes } from "./nodes.js";
import { solarLonDeg } from "./engine.js";

// simple app state held here (no separate state.js/loop.js)
let rafId = 0, last = 0;
const State = { mode: "frozen", t: new Date(), speed: 60 };

// util
function toLocalInputValue(d){
  const z = new Date(d);
  const pad = n => String(n).padStart(2,"0");
  const yyyy=z.getFullYear(), mm=pad(z.getMonth()+1), dd=pad(z.getDate());
  const hh=pad(z.getHours()), mi=pad(z.getMinutes()), ss=pad(z.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

// minimal ctx builder
function makeCtx(svg){
  return { svg, layers: {}, state: {}, ephem: null };
}

function ensureSvg(host){
  let svg = host.querySelector("svg");
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    // basic viewport; adjust if you already set elsewhere
    svg.setAttribute("viewBox", "-240 -240 480 480");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    host.appendChild(svg);
  }
  return svg;
}

function render(ctx){
  const dayKey = State.t.toISOString().slice(0,10);
  ctx.ephem = getEphemFor(dayKey) || ctx.ephem; // keep last if missing row

  // draw static layers once
  if (!ctx.layers.wheel) {
    drawWheel(ctx);
    drawSeasons(ctx);
    ctx.layers.nodesAPI = initNodes(ctx);
  }

  // dynamic updates
  updateSeasons(ctx, State.t);

  // nodes: pass NaN for sun longitude if you haven't exposed it yet → no highlight
  const sunLon = solarLonDeg(State.t);
  if (ctx.ephem && ctx.layers.nodesAPI) {
    const asc = ctx.ephem.node_true_asc;
    const dsc = ctx.ephem.node_true_desc;
    if (asc != null && dsc != null) ctx.layers.nodesAPI.update(sunLon, asc, dsc);
  }
}

function tick(ts, ctx){
  if (!last) last = ts;
  const dt = ts - last; last = ts;
  if (State.mode === "animated") State.t = new Date(State.t.getTime() + State.speed * dt);
  render(ctx);
  rafId = requestAnimationFrame(t2 => tick(t2, ctx));
}

async function start(){
  await loadEphemeris();

  const host = document.querySelector("zodi-clock") || document.body;
  const svg = ensureSvg(host);
  const ctx = makeCtx(svg);

  // controls
  const btnAnim   = document.getElementById("btn-anim");
  const btnFrozen = document.getElementById("btn-frozen");
  const dtInput   = document.getElementById("dt-input");

  if (dtInput) dtInput.value = toLocalInputValue(State.t);
  if (btnAnim)   btnAnim.onclick   = () => { State.mode = "animated"; };
  if (btnFrozen) btnFrozen.onclick = () => { State.mode = "frozen";   };
  if (dtInput)   dtInput.addEventListener("change", e => {
    const iso = new Date(e.target.value).toISOString();
    State.t = new Date(iso);
    State.mode = "frozen";
  });

  if (!rafId) rafId = requestAnimationFrame(t => tick(t, ctx));
}

window.addEventListener("DOMContentLoaded", start);
