// docs/js/component.js
import { RADIUS } from "./constants.js";
import { preciseLongitudes, fastSunLon, fastMoonLon, moonPhaseAge, phaseName } from "./engine.js";
import { loadEphemeris, getEphemFor } from "./ephemeris.js";
import { drawWheel } from "./wheel.js";
import { drawSeasons, updateSeasons } from "./seasons.js";
import { initNodes } from "./nodes.js";
import { ringHit, toSceneRad, mod, signIndex, toDegMin } from "./math.js";

export class ZodiClock extends HTMLElement {
  static get observedAttributes() { return ["initial-mode","initial-dt","controls","labels"]; }
  attributeChangedCallback(name, _oldV, newV) {
    if (name === "initial-mode") this.mode = (newV === "frozen") ? "frozen" : "animated";
    if (name === "initial-dt")   this.initialISO = newV || null;
    // re-render lightweight UI if already connected
    if (this.isConnected) this.render();
  }

  constructor() {
    super();
    this.mode = "animated";
    this.initialISO = null;
    this._raf = null;

    this.attachShadow({ mode: "open" });

    // host wrapper
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:block;max-width:1080px;margin:0 auto";

    // SVG root
    this.svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svgRoot.setAttribute("viewBox", `${-RADIUS.zodiac-20} ${-RADIUS.zodiac-20} ${2*(RADIUS.zodiac+20)} ${2*(RADIUS.zodiac+20)}`);
    this.svgRoot.setAttribute("width", "100%");
    this.svgRoot.setAttribute("height", "100%");
    this.gRoot = document.createElementNS(this.svgRoot.namespaceURI, "g");
    this.svgRoot.appendChild(this.gRoot);
    wrap.appendChild(this.svgRoot);

    // simple control strip (mode + datetime)
    const ui = document.createElement("div");
    ui.style.cssText = "display:flex;gap:8px;align-items:center;margin:8px 0";
    ui.innerHTML = `
      <button id="btnAnimated" part="btn">Animated</button>
      <button id="btnFrozen" part="btn">Frozen</button>
      <label style="display:flex;gap:6px;align-items:center">
        <span style="font-size:12px;opacity:.8">UTC</span>
        <input id="dt" type="datetime-local" />
      </label>
    `;
    wrap.appendChild(ui);

    this.shadowRoot.appendChild(wrap);

    // ctx shared across modules
    this.ctx = {
      svg: this.gRoot,
      R: RADIUS,
      layers: {},
      state: {},
      ephem: null,
    };

    // cache handles to UI
    this.btnAnimated = ui.querySelector("#btnAnimated");
    this.btnFrozen   = ui.querySelector("#btnFrozen");
    this.dtInput     = ui.querySelector("#dt");

    // body elements created in render()
    this.el = {};
  }

  async connectedCallback() {
    this.render();
    // modules
    drawWheel(this.ctx);
    drawSeasons(this.ctx);
    this.nodes = initNodes(this.ctx);

    // ephemeris
    this._ephemMap = await loadEphemeris();

    // start loop
    this.loop();
  }

  disconnectedCallback() {
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  render() {
    // init datetime-local
    const now = new Date();
    const isoLocal = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);
    if (this.dtInput) this.dtInput.value = (this.initialISO ? this.initialISO.replace("Z","").slice(0,16) : isoLocal);

    // buttons
    if (this.btnAnimated && this.btnFrozen) {
      this.btnAnimated.onclick = () => { this.mode = "animated"; };
      this.btnFrozen.onclick   = () => { this.mode = "frozen";   };
    }

    // build bodies layer once
    if (!this.ctx.layers.bodies) {
      const ns = this.svgRoot.namespaceURI;
      const g = document.createElementNS(ns, "g");
      g.setAttribute("id", "bodies");
      this.gRoot.appendChild(g);
      this.ctx.layers.bodies = g;

      const circle = (cx,cy,r,attrs={}) => {
        const el = document.createElementNS(ns, "circle");
        el.setAttribute("cx", cx); el.setAttribute("cy", cy); el.setAttribute("r", r);
        for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, v);
        g.appendChild(el); return el;
      };
      const line = (x1,y1,x2,y2,attrs={}) => {
        const el = document.createElementNS(ns, "line");
        el.setAttribute("x1", x1); el.setAttribute("y1", y1);
        el.setAttribute("x2", x2); el.setAttribute("y2", y2);
        for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, v);
        g.appendChild(el); return el;
      };
      const text = (x,y,str,attrs={}) => {
        const el = document.createElementNS(ns, "text");
        el.setAttribute("x", x); el.setAttribute("y", y);
        el.setAttribute("text-anchor","middle"); el.setAttribute("dominant-baseline","middle");
        for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, v);
        el.textContent = str; g.appendChild(el); return el;
      };

      // Sun at center
      this.el.sun = circle(0,0,18,{ fill:"#f5b301", stroke:"#0b0c10", "stroke-width":"2" });
      this.el.sunLbl = text(0,-30,"Sun",{ "font-size":"12", fill:"#9aa0aa" });

      // Earth orbit and Moon orbit scaffold are already in wheel; draw Earth/Moon bodies
      this.el.earth = circle(RADIUS.earth,0,11,{ fill:"#3b82f6", stroke:"#0b0c10", "stroke-width":"1.5" });
      this.el.earthLbl = text(RADIUS.earth,-18,"Earth",{ "font-size":"11", fill:"#9aa0aa" });

      this.el.moonOrbit = circle(RADIUS.earth,0,RADIUS.moon,{ fill:"none", stroke:"#2a2f39", "stroke-width":"1" });
      this.el.moon = circle(RADIUS.earth+RADIUS.moon,0,6,{ fill:"#9aa3af", stroke:"#0b0c10", "stroke-width":"1" });
      this.el.moonLbl = text(RADIUS.earth+RADIUS.moon,-12,"Moon",{ "font-size":"10", fill:"#9aa0aa" });

      // Rays and ecliptic ring hits
      this.el.sunRay  = line(RADIUS.earth,0,RADIUS.earth,0,{ stroke:"#f5b301", "stroke-width":"2.5" });
      this.el.moonRay = line(RADIUS.earth,0,RADIUS.earth,0,{ stroke:"#9aa3af", "stroke-width":"2", "stroke-dasharray":"4 3" });
      this.el.sunHit  = circle(0,0,5,{ fill:"#f5b301" });
      this.el.moonHit = circle(0,0,5,{ fill:"#9aa3af" });
    }
  }

  loop = () => {
    // time source
    const now = new Date();
    const frozen = (this.mode === "frozen");
    const d = frozen && this.dtInput?.value ? new Date(this.dtInput.value) : now;

    // ephemeris record for date
    const dateISO = d.toISOString().slice(0,10);
    this.ctx.ephem = getEphemFor(this._ephemMap, dateISO);

    // precise vs fast longitudes
    let sunLon, moonLon;
    if (frozen) {
      const p = preciseLongitudes(d);
      if (p) { sunLon = p.sunLon; moonLon = p.moonLon; }
      else   { sunLon = fastSunLon(d); moonLon = fastMoonLon(d, sunLon); }
    } else {
      sunLon = fastSunLon(d);
      moonLon = fastMoonLon(d, sunLon);
    }

    // Earth position (opposite Sun), Moon position (around Earth)
    const thetaEarth = toSceneRad(mod(sunLon + 180, 360));
    const ex = RADIUS.earth * Math.cos(thetaEarth);
    const ey = RADIUS.earth * Math.sin(thetaEarth);
    this.el.earth.setAttribute("cx", ex); this.el.earth.setAttribute("cy", ey);
    this.el.earthLbl.setAttribute("x", ex); this.el.earthLbl.setAttribute("y", ey - 18);

    const thetaMoon = toSceneRad(moonLon);
    const mx = ex + RADIUS.moon * Math.cos(thetaMoon);
    const my = ey + RADIUS.moon * Math.sin(thetaMoon);
    this.el.moon.setAttribute("cx", mx); this.el.moon.setAttribute("cy", my);
    this.el.moonLbl.setAttribute("x", mx); this.el.moonLbl.setAttribute("y", my - 12);
    this.el.moonOrbit.setAttribute("cx", ex); this.el.moonOrbit.setAttribute("cy", ey);

    // Rays to outer zodiac ring
    const sunAng  = Math.atan2(0 - ey, 0 - ex);
    const moonAng = Math.atan2(my - ey, mx - ex);
    const sh = ringHit(0,0,RADIUS.zodiac, ex,ey, sunAng);
    const mh = ringHit(0,0,RADIUS.zodiac, ex,ey, moonAng);
    this.el.sunRay.setAttribute("x1", ex); this.el.sunRay.setAttribute("y1", ey);
    this.el.sunRay.setAttribute("x2", sh.x); this.el.sunRay.setAttribute("y2", sh.y);
    this.el.moonRay.setAttribute("x1", ex); this.el.moonRay.setAttribute("y1", ey);
    this.el.moonRay.setAttribute("x2", mh.x); this.el.moonRay.setAttribute("y2", mh.y);
    this.el.sunHit.setAttribute("cx", sh.x); this.el.sunHit.setAttribute("cy", sh.y);
    this.el.moonHit.setAttribute("cx", mh.x); this.el.moonHit.setAttribute("cy", mh.y);

    // Seasons and nodes
    updateSeasons(this.ctx, d);
    if (this.ctx.ephem) {
      this.nodes.update(sunLon, this.ctx.ephem.nodeAsc, this.ctx.ephem.nodeDesc);
    }

    // optional: could expose phase text to external UI
    // const phase = phaseName(moonPhaseAge(d));

    this._raf = requestAnimationFrame(this.loop);
  };
}

customElements.define("zodi-clock", ZodiClock);
