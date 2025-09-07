// docs/js/main.js
import { loadEphemeris, getEphemFor } from "./ephemeris.js";
import { drawWheel } from "./wheel.js";
import { drawSeasons, updateSeasons } from "./seasons.js";
import { initNodes } from "./nodes.js";
import { solarLonDeg, buildCtx } from "./engine.js"; // you already have helpers here

let rafId = 0, last = 0;
const State = { mode: "frozen", t: new Date(), speed: 60 };

function toLocalInputValue(d){
  const z = new Date(d);
  const pad = n => String(n).padStart(2,"0");
  const yyyy=z.getFullYear(), mm=pad(z.getMonth()+1), dd=pad(z.getDate());
  const hh=pad(z.getHours()), mi=pad(z.getMinutes()), ss=pad(z.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

function render(ctx){
  const dayKey = State.t.toISOString().slice(0,10);
  ctx.ephem = getEphemFor(dayKey);                    // attach for layers that read ctx.ephem
  const sunLon = solarLonDeg(State.t);

  // static once
  if (!ctx.layers.wheel) { drawWheel(ctx); drawSeasons(ctx); ctx.layers.nodesAPI = initNodes(ctx); }

  // dynamic layers
  updateSeasons(ctx, State.t);
  ctx.layers.nodesAPI.update(sunLon, ctx.ephem.node_true_asc, ctx.ephem.node_true_desc);
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
  const el = document.querySelector("zodi-clock");           // your custom element exists
  const svg = el.querySelector("svg") || el.attachShadow?.() || el; // adapt if you wrap
  const ctx = buildCtx(svg);                                 // your engine creates {svg,layers,state,...}

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
