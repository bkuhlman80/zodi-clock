// docs/js/component.js
import { RADIUS } from "./constants.js";
import { ensureSvg, makeCtx } from "./ctx.js";          // tiny helpers (viewBox + ctx)
import { loadEphemeris, getEphemFor } from "./ephemeris.js";
import { drawWheel } from "./wheel.js";
import { drawSeasons, updateSeasons } from "./seasons.js";
import { initNodes } from "./nodes.js";
import { initBodies } from "./bodies.js";
import { solarLonDeg } from "./engine.js";

const State = { mode: "frozen", t: new Date(), speed: 60 };
const setMode = m => State.mode = (m === "animated" ? "animated" : "frozen");
const setTime = d => State.t = new Date(d);
const advance = ms => State.t = new Date(State.t.getTime() + State.speed * ms);

function toLocalInputValue(d){
  const z=new Date(d), p=n=>String(n).padStart(2,"0");
  return `${z.getFullYear()}-${p(z.getMonth()+1)}-${p(z.getDate())}T${p(z.getHours())}:${p(z.getMinutes())}:${p(z.getSeconds())}`;
}

export class ZodiClock extends HTMLElement {
  static get observedAttributes(){ return ["initial-mode","initial-dt"]; }
  attributeChangedCallback(name,_o,v){
    if (name==="initial-mode") setMode(v);
    if (name==="initial-dt" && v) setTime(v);
  }

  constructor(){
    super();
    this.attachShadow({ mode: "open" });
    const host = document.createElement("div");
    host.style.cssText = "display:block;width:100%;height:100%";
    this.shadowRoot.appendChild(host);
    this._host = host;

    this._raf = 0; this._last = 0;
    this._ctx = null; this._ephLoaded = false;
  }

  async connectedCallback(){
    // 1) wait for Astronomy global
    await waitForAstronomy();

    // 2) build svg + ctx inside shadow DOM
    const svg = ensureSvg(this._host);
    this._ctx = makeCtx(svg);
    this._ctx.layers ||= {}; 

    // 3) static layers once
    drawWheel(this._ctx);
    drawSeasons(this._ctx);
    this._ctx.layers.nodesAPI = initNodes(this._ctx);
    this._ctx.layers.bodiesAPI = initBodies(this._ctx);

    // 4) ephemeris
    await loadEphemeris();
    this._ephLoaded = true;

    // 5) hydrate attrs
    const modeAttr = this.getAttribute("initial-mode");
    const dtAttr   = this.getAttribute("initial-dt");
    if (modeAttr) setMode(modeAttr);
    if (dtAttr)   setTime(dtAttr);

    // 6) internal minimal controls (optional): enable if you want UI inside element
    if (!this.hasAttribute("no-controls")) this._mountControls();

    // 7) start loop
    const tick = (ts)=>{
      if (!this.isConnected) return;
      if (!this._last) this._last = ts;
      const dt = ts - this._last; this._last = ts;
      if (State.mode === "animated") advance(dt);
      this._renderFrame();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  disconnectedCallback(){
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _renderFrame(){
    // ephemeris row by day
    if (this._ephLoaded){
      const key = State.t.toISOString().slice(0,10);
      this._ctx.ephem = getEphemFor(key) || this._ctx.ephem;
    }
    // dynamic layers
    updateSeasons(this._ctx, State.t);
    if (this._ctx.layers.bodiesAPI) this._ctx.layers.bodiesAPI.update(State.t);

    // nodes with Sun highlight
    const sunLon = solarLonDeg(State.t);
    const e = this._ctx.ephem;
    if (e && this._ctx.layers.nodesAPI && e.node_true_asc != null && e.node_true_desc != null){
      this._ctx.layers.nodesAPI.update(sunLon, e.node_true_asc, e.node_true_desc);
    }
  }

  _mountControls(){
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;gap:8px;align-items:center;margin:8px 0";
    bar.innerHTML = `
      <button id="c-anim">Animated</button>
      <button id="c-froz">Frozen</button>
      <label style="display:flex;gap:6px;align-items:center">
        <span style="font-size:12px;opacity:.8">UTC</span>
        <input id="c-dt" type="datetime-local" step="1" />
      </label>
    `;
    this._host.prepend(bar);

    const dt = bar.querySelector("#c-dt");
    dt.value = toLocalInputValue(State.t);
    bar.querySelector("#c-anim").onclick = ()=> setMode("animated");
    bar.querySelector("#c-froz").onclick = ()=> setMode("frozen");
    dt.addEventListener("change", e=>{
      const iso = new Date(e.target.value).toISOString();
      setTime(iso); setMode("frozen");
    });
  }
}

customElements.define("zodi-clock", ZodiClock);

// --- helpers ---
function waitForAstronomy(){
  if (globalThis.Astronomy) return Promise.resolve();
  return new Promise((res)=>{
    const id = setInterval(()=>{ if (globalThis.Astronomy){ clearInterval(id); res(); } }, 20);
  });
}
