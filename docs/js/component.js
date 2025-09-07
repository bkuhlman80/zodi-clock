// docs/js/component.js
import { ensureSvg, makeCtx } from "./ctx.js";
import { loadEphemeris, getEphemFor } from "./ephemeris.js";
import { drawWheel } from "./wheel.js";
import { drawSeasons, updateSeasons } from "./seasons.js";
import { initNodes } from "./nodes.js";
import { initBodies } from "./bodies.js";
import { solarLonDeg, fastMoonLon } from "./engine.js";

// ~2.95 days/sec → year ≈123.7 s, synodic month ≈10 s
const State = { mode: "frozen", t: new Date(), speed: 255000 };
const setMode   = m => State.mode = (m === "animated" ? "animated" : "frozen");
const setTime   = d => State.t = new Date(d);
const advance   = ms => State.t = new Date(State.t.getTime() + State.speed * ms);

function toLocalInputValue(d){
  const z=new Date(d), p=n=>String(n).padStart(2,"0");
  return `${z.getFullYear()}-${p(z.getMonth()+1)}-${p(z.getDate())}T${p(z.getHours())}:${p(z.getMinutes())}:${p(z.getSeconds())}`;
}

function waitForAstronomy(){
  if (globalThis.Astronomy) return Promise.resolve();
  return new Promise(res=>{
    const id=setInterval(()=>{ if (globalThis.Astronomy){ clearInterval(id); res(); } },20);
  });
}

export class ZodiClock extends HTMLElement {
  static get observedAttributes(){ return ["initial-mode","initial-dt"]; }
  attributeChangedCallback(name,_o,v){
    if (name==="initial-mode") setMode(v);
    if (name==="initial-dt" && v) setTime(v);
  }

  constructor(){
    super();
    this.attachShadow({ mode:"open" });
    const host = document.createElement("div");
    host.style.cssText = "display:block;width:100%;height:100%";
    this.shadowRoot.appendChild(host);
    this._host = host;

    this._raf = 0; this._last = 0;
    this._ctx = null; this._ephLoaded = false;
  }

  async connectedCallback(){
    await waitForAstronomy();

    // SVG + ctx
    const svg = ensureSvg(this._host);
    this._ctx = makeCtx(svg);
    this._ctx.layers ||= {};

    // Static layers
    drawWheel(this._ctx);
    drawSeasons(this._ctx);
    this._ctx.layers.nodesAPI  = initNodes(this._ctx);
    this._ctx.layers.bodiesAPI = initBodies(this._ctx);

    // Ephemeris table (for nodes)
    await loadEphemeris();
    this._ephLoaded = true;

    // Hydrate attrs
    const modeAttr = this.getAttribute("initial-mode");
    const dtAttr   = this.getAttribute("initial-dt");
    if (modeAttr) setMode(modeAttr);
    if (dtAttr)   setTime(dtAttr);

    // Optional internal controls
    if (!this.hasAttribute("no-controls")) this._mountControls();

    // Initial draw so dots/rays aren't at (0,0)
    if (this._ctx.layers.bodiesAPI) this._ctx.layers.bodiesAPI.update(State.t);
    this._renderFrame();

    // Debug hooks for testing
    const self = this;
    this.api = {
      get state(){ return State; },
      get ctx(){ return self._ctx; },
      step(ms){ advance(ms); self._renderFrame(); },
      longs(){ return { s: solarLonDeg(State.t), m: fastMoonLon(State.t) }; }
    };

    // RAF loop
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

  disconnectedCallback(){ if (this._raf) cancelAnimationFrame(this._raf); }

  _renderFrame(){
    if (this._ephLoaded){
      const key = State.t.toISOString().slice(0,10);
      this._ctx.ephem = getEphemFor(key) || this._ctx.ephem;
    }
    updateSeasons(this._ctx, State.t);
    if (this._ctx.layers.bodiesAPI) this._ctx.layers.bodiesAPI.update(State.t);

    // Nodes (use true nodes from ephemeris)
    const e = this._ctx.ephem;
    if (e && this._ctx.layers.nodesAPI && e.node_true_asc != null && e.node_true_desc != null){
      const sunLon = solarLonDeg(State.t);
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
      <span id="r-sun"  style="font:600 12px system-ui;opacity:.9"></span>
      <span id="r-moon" style="font:600 12px system-ui;opacity:.9;margin-left:8px"></span>
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

    // give bodies.js readout spans
    this._ctx.readoutSun  = bar.querySelector("#r-sun");
    this._ctx.readoutMoon = bar.querySelector("#r-moon");
  }
}

customElements.define("zodi-clock", ZodiClock);
