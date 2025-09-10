// docs/js/component.js
import { ensureSvg, makeCtx } from "./ctx.js";
import { RADIUS, VIEWBOX_PAD } from "./constants.js";
import { loadEphemeris, getEphemFor } from "./ephemeris.js";
import { drawWheel } from "./wheel.js";
import { drawSeasons, updateSeasons } from "./seasons.js";
import { initNodes } from "./nodes.js";
import { initBodies } from "./bodies.js";
import { earthHelioLon, fastMoonLon } from "./engine.js";
import { drawSabbats } from "./sabbats.js";

const MMM = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDateUTC = d => {
  const z = new Date(d);
  return `${MMM[z.getUTCMonth()]} ${String(z.getUTCDate()).padStart(2,"0")}, ${z.getUTCFullYear()}`;
};

// ~2.95 days/sec → year ≈123.7 s, synodic month ≈10 s
const State = { mode: "frozen", t: new Date(), speed: 255000 };
const setMode = m => State.mode = (m === "animated" ? "animated" : "frozen");
const setTime = d => State.t = new Date(d);
const advance = ms => State.t = new Date(State.t.getTime() + State.speed * ms);

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

    const style = document.createElement("style");
    style.textContent = `
     .constellation{ opacity:0; transition:opacity .6s ease; filter:none }
     .constellation.active{
       opacity:1;
       filter: invert(1) brightness(2.4) contrast(1.2)
               drop-shadow(0 0 4px #fff)
               drop-shadow(0 0 10px #9cf);
       }
      .bar{display:flex;flex-direction:column;gap:6px;margin:8px 0}
      .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
      .row.controls button{font:600 19px system-ui;padding:14px 20px;border-radius:12px;border:1px solid #5a6575;background:#2a2f39;color:#e6e7eb}
      .row.controls button:hover{filter:brightness(1.08)}
      .row.controls label{display:flex;gap:8px;align-items:center}
      .row.controls input[type="datetime-local"]{font:500 19px system-ui;padding:12px 15px;border-radius:12px;border:1px solid #5a6575;min-width:420px;background:#0f1218;color:#e6e7eb}
      .row.controls .utc{font-size:14px;opacity:.8}
      .row.indicators .badge{font:600 19px system-ui;opacity:.95}
      .readout{display:inline-flex;align-items:center;gap:6px}
      .readout .sign{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;border-radius:6px;background:#5a6575;color:#fff;font-weight:700;font-size:16px;line-height:1}
      .readout .lbl{opacity:.9}
      .eclipse-node{opacity:.35;transition:opacity .12s linear}
      .eclipse-node.active{opacity:.9}
    `;
    this.shadowRoot.appendChild(style);

    this._raf = 0; 
    this._last = 0;
    this._ctx = null; 
    this._ephLoaded = false;
    this._eclipses = [];
    this._dateInd = null;
    this._controlsMounted = false;
  }

  async connectedCallback(){
    await waitForAstronomy();

    const svg = ensureSvg(this._host);
    svg.style.overflow = "visible";
    const baseR = (RADIUS.season ?? (RADIUS.zodiac + 18));
    const vb = Math.ceil(baseR + VIEWBOX_PAD);
    svg.setAttribute("viewBox", `${-vb} ${-vb} ${vb*2} ${vb*2}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    this._ctx = makeCtx(svg);
    this._ctx.layers ||= {};

    if (!this.hasAttribute("no-controls")) this._mountControls();

    drawWheel(this._ctx);
    drawSeasons(this._ctx);
    drawSabbats(this._ctx);
    this._ctx.layers.bodiesAPI = initBodies(this._ctx);
    this._ctx.layers.nodesAPI  = initNodes(this._ctx);

    await loadEphemeris();
    this._ephLoaded = true;

    try {
      const r = await fetch("./ephemeris_daily.json");
      if (r.ok) {
        const j = await r.json();
        this._eclipses = j.eclipses || [];
      }
    } catch {}

    const modeAttr = this.getAttribute("initial-mode");
    const dtAttr   = this.getAttribute("initial-dt");
    if (modeAttr) setMode(modeAttr);
    if (dtAttr)   setTime(dtAttr);

    if (this._ctx.layers.bodiesAPI) this._ctx.layers.bodiesAPI.update(State.t);
    this._renderFrame();

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
    if (this._dateInd) this._dateInd.textContent = fmtDateUTC(State.t);

    if (this._ctx.layers.nodesAPI){
      const e = this._ctx.ephem || {};
      const sunLonGeo  = (earthHelioLon(State.t) + 180) % 360;   // geocentric Sun
      // prefer ephemeris if present, else fast calculator
      const moonLonGeo = (
        e.moon_lon_geo ?? e.moon_true_lon ?? e.moon_lon ?? e.moon
      ) ?? fastMoonLon(State.t);
      const activeNode = this._activeEclipseNodeUTC(State.t); // "asc"|"desc"|null
      this._ctx.layers.nodesAPI.update(
        State.t,
        sunLonGeo,
        moonLonGeo,
        e.node_true_asc,
        e.node_true_desc,
        activeNode
      );
    }
  }

  _mountControls(){
    if (this._controlsMounted) return;
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

        <span id="r-sun" class="readout">
          <span class="sign" id="sun-sign"></span>
          <span class="lbl">Sun:</span>
          <span class="deg" id="sun-deg"></span>°
        </span>

        <span id="r-moon" class="readout">
          <span class="sign" id="moon-sign"></span>
          <span class="lbl">Moon:</span>
          <span class="deg" id="moon-deg"></span>°
        </span>
      </div>
    `;
    this._host.prepend(bar);

    const dt = bar.querySelector("#c-dt");
    dt.value = toLocalInputValue(State.t);
    bar.querySelector("#c-anim").onclick = ()=> { setMode("animated"); };
    bar.querySelector("#c-froz").onclick = ()=> {
      const now = new Date();
      setTime(now.toISOString());
      setMode("frozen");
      dt.value = toLocalInputValue(State.t);
    };
    dt.addEventListener("change", e=>{
      const v = e.target.value; if (!v) return;
      const d = new Date(v); if (isNaN(d)) return;
      setTime(d.toISOString()); setMode("frozen");
    });

    // Back-compat: expose both whole span and parts
    this._ctx.readoutSun        = bar.querySelector("#r-sun");
    this._ctx.readoutSunBadge   = bar.querySelector("#sun-sign");
    this._ctx.readoutSunDeg     = bar.querySelector("#sun-deg");

    this._ctx.readoutMoon       = bar.querySelector("#r-moon");
    this._ctx.readoutMoonBadge  = bar.querySelector("#moon-sign");
    this._ctx.readoutMoonDeg    = bar.querySelector("#moon-deg");

    this._dateInd = bar.querySelector("#date-ind");
    this._dateInd.textContent = fmtDateUTC(State.t);
  }

  _activeEclipseNodeUTC(d){
    if (!this._eclipses?.length) return null;
    const dayUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    for (const ev of this._eclipses){
      const evUTC = Date.parse(ev.date + "T00:00:00Z");
      const w = Number(ev.window ?? 1);
      const diffDays = Math.abs((dayUTC - evUTC) / 86400000);
      if (diffDays <= w) return ev.node;   // "asc" or "desc"
    }
    return null;
  }
}

customElements.define("zodi-clock", ZodiClock);
