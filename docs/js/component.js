// docs/js/component.js
import { ensureSvg, makeCtx } from "./ctx.js";
import { RADIUS, VIEWBOX_PAD } from "./constants.js";
import { loadEphemeris, getEphemFor } from "./ephemeris.js";
import { drawWheel } from "./wheel.js";
import { drawSeasons, updateSeasons } from "./seasons.js";
import { initNodes } from "./nodes.js";
import { initBodies } from "./bodies.js";
import { earthHelioLon } from "./engine.js";

const MMM = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDateUTC = d => {
  const z = new Date(d);
  return `${MMM[z.getUTCMonth()]} ${String(z.getUTCDate()).padStart(2,"0")}, ${z.getUTCFullYear()}`;
};

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
    
    // controls CSS (buttons/input +50%; badges +25%)
    const style = document.createElement("style");
    style.textContent = `
      .bar{display:flex;flex-direction:column;gap:6px;margin:8px 0}
      .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
      .row.controls button{font:600 21px system-ui;padding:15px 21px;border-radius:12px;border:1px solid #444;background:#1a1f29;color:#e6e7eb}
      .row.controls label{display:flex;gap:8px;align-items:center}
      .row.controls input[type="datetime-local"]{font:500 21px system-ui;padding:12px 15px;border-radius:12px;border:1px solid #444;min-width:420px;background:#0f1218;color:#e6e7eb}
      .row.controls .utc{font-size:14px;opacity:.8}
      .row.indicators .badge{font:600 15px system-ui;opacity:.95}
    `;
    this.shadowRoot.appendChild(style);

    this._raf = 0; this._last = 0;
    this._ctx = null; this._ephLoaded = false;
    this._dateInd = null;
    this._controlsMounted = false;   // guard
  }

  async connectedCallback(){
    await waitForAstronomy();

    // SVG + ctx
    const svg = ensureSvg(this._host);
    // give the SVG extra room around the wheel
    svg.style.overflow = "visible";
    const baseR = (RADIUS.season ?? (RADIUS.zodiac + 18));
    const vb = Math.ceil(baseR + VIEWBOX_PAD);
    svg.setAttribute("viewBox", `${-vb} ${-vb} ${vb*2} ${vb*2}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    this._ctx = makeCtx(svg);
    this._ctx.layers ||= {};

    // Controls first so readouts exist before layer init
    if (!this.hasAttribute("no-controls")) this._mountControls();

    // Static layers
    drawWheel(this._ctx);
    drawSeasons(this._ctx);
    this._ctx.layers.bodiesAPI = initBodies(this._ctx);
    this._ctx.layers.nodesAPI  = initNodes(this._ctx);

    // Ephemeris table (for nodes)
    await loadEphemeris();
    this._ephLoaded = true;

    // Hydrate attrs
    const modeAttr = this.getAttribute("initial-mode");
    const dtAttr   = this.getAttribute("initial-dt");
    if (modeAttr) setMode(modeAttr);
    if (dtAttr)   setTime(dtAttr);

    // Initial draw so dots/rays aren't at (0,0)
    if (this._ctx.layers.bodiesAPI) this._ctx.layers.bodiesAPI.update(State.t);
    this._renderFrame();

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
    if (this._ctx.layers.bodiesAPI) this._ctx.layers.bodiesAPI.update(State.t); // <-- animate Earth/Moon
    if (this._dateInd) this._dateInd.textContent = fmtDateUTC(State.t);

    // Nodes: prefer ephemeris true nodes; fallback to mean node inside nodes.js
    if (this._ctx.layers.nodesAPI){
      const e = this._ctx.ephem || {};
      const sunLonGeo = (earthHelioLon(State.t) + 180) % 360; // geocentric Sun
      this._ctx.layers.nodesAPI.update(State.t, sunLonGeo, e.node_true_asc, e.node_true_desc);
    }
  }

  _mountControls(){
    if (this._controlsMounted) return;      // prevent duplicates
    this._controlsMounted = true;
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.innerHTML = `
      <div class="row controls">
        <button id="c-anim">Animated</button>
        <button id="c-froz">Frozen</button>
        <label><span class="utc">UTC</span><input id="c-dt" type="datetime-local" step="1" /></label>
      </div>
      <div class="row indicators">
        <span id="date-ind" class="badge"></span>
        <span id="r-sun"  class="badge"></span>
        <span id="r-moon" class="badge"></span>
      </div>
    `;

    this._host.prepend(bar);

    const dt = bar.querySelector("#c-dt");
    dt.value = toLocalInputValue(State.t);
    bar.querySelector("#c-anim").onclick = ()=> { setMode("animated"); };
    bar.querySelector("#c-froz").onclick = ()=> {
      // restore old behavior: jump to "now" and freeze
      const now = new Date();
      setTime(now.toISOString());
      setMode("frozen");
      dt.value = toLocalInputValue(State.t);
    };
    
    dt.addEventListener("change", e=>{
      const v = e.target.value;
      if (!v) return;                      // ignore empty value
      const d = new Date(v);
      if (isNaN(d)) return;                // avoid “Invalid time value”
      setTime(d.toISOString());
      setMode("frozen");
    });

    // give bodies.js readout spans
    this._ctx.readoutSun  = bar.querySelector("#r-sun");
    this._ctx.readoutMoon = bar.querySelector("#r-moon");
    this._dateInd         = bar.querySelector("#date-ind");
    this._dateInd.textContent = fmtDateUTC(State.t);
  }
}

customElements.define("zodi-clock", ZodiClock);
