(function () {
  // ---------- constants & helpers ----------
  const SIGNS = [
    "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
    "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
  ];
  const MS = 1000, DAY = 86400 * MS, YEAR_DAYS = 365.24219, MOON_SYNODIC_DAYS = 29.530588853;
  const NEW_MOON_REF = new Date(Date.UTC(2000, 0, 6, 18, 14, 0)); // real new moon epoch

  function marchEquinoxApprox(y){ return new Date(Date.UTC(y,2,20,21,0,0)); }
  function mod(n,m){ return ((n % m) + m) % m; }
  function toDegMin(x){ const d=Math.floor(x); const m=Math.floor((x-d)*60); return `${d}°${String(m).padStart(2,"0")}’`; }
  function signIndex(lon){ return Math.floor(mod(lon,360)/30); }

  // ---- ephemeris_daily loader (no module imports) ----
  let EPHEM = null;
  function clamp360(x){ return ((x % 360) + 360) % 360; }
  function signGlyphFromDeg(deg){
    const g=["♈︎","♉︎","♊︎","♋︎","♌︎","♍︎","♎︎","♏︎","♐︎","♑︎","♒︎","♓︎"];
    return g[Math.floor(clamp360(deg)/30)];
  }
  async function loadEphemerisDaily(){
  try{
    const url = './ephemeris_daily.json?v=' + Date.now();   // relative path for GitHub Pages
    const res = await fetch(url, { cache:'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    let asc  = typeof raw.node_asc_lon_deg==='number'  ? clamp360(raw.node_asc_lon_deg)  : null;
    let desc = typeof raw.node_desc_lon_deg==='number' ? clamp360(raw.node_desc_lon_deg) : null;
    if (asc==null && desc!=null) asc  = clamp360(desc+180);
    if (desc==null && asc!=null) desc = clamp360(asc+180);

    EPHEM = {
      iso_date: String(raw.iso_date || new Date().toISOString().slice(0,10)),
      next_season_event: raw.next_season_event ?? null,
      next_season_utc: raw.next_season_utc ?? null,
      days_to_season: typeof raw.days_to_season==='number' ? raw.days_to_season : null,
      node_asc_lon_deg: asc,
      node_desc_lon_deg: desc,
      node_asc_sign: raw.node_asc_sign || (asc!=null ? signGlyphFromDeg(asc) : null),
      node_desc_sign: raw.node_desc_sign || (desc!=null ? signGlyphFromDeg(desc) : null),
    };
    window.Z0DI = Object.assign(window.Z0DI||{}, { ephemDaily: EPHEM });
  }catch(e){
    console.warn('ephemeris_daily.json missing or invalid; continuing without it.');
    }
  }
  loadEphemerisDaily();

  // ---- seasons helpers (Astronomy Engine) ----
  const SEASON_META = [
    { key: "MarEq", lon: 0,   glyph: "☉♈︎", label: "March Equinox"     },
    { key: "JunSol",lon: 90,  glyph: "☉♋︎", label: "June Solstice"     },
    { key: "SepEq", lon: 180, glyph: "☉♎︎", label: "September Equinox" },
    { key: "DecSol",lon: 270, glyph: "☉♑︎", label: "December Solstice" },
  ];

  function seasonsUTC(year){
    if (!window.Astronomy) return null;
    const s = Astronomy.Seasons(year); // {march_equinox, june_solstice, ...}
    const iso = t => t.date.toISOString().replace('.000Z','Z');
    return {
      MarEq:  iso(s.march_equinox),
      JunSol: iso(s.june_solstice),
      SepEq:  iso(s.september_equinox),
      DecSol: iso(s.december_solstice),
    };
  }
  function nextSeason(nowIso, yrSeasons){
    const now = new Date(nowIso);
    const entries = Object.entries(yrSeasons).map(([k,v])=>[k,new Date(v)]);
    const future = entries.filter(([,dt])=>dt>now).sort((a,b)=>a[1]-b[1]);
    const [key, when] = future.length ? future[0] : entries[0]; // wrap to next year if needed
    const days = (when - now)/86400000;
    return { key, when, days };
  }
  // glyphs + helpers for node labels
  const SIGN_GLYPHS = ["♈︎","♉︎","♊︎","♋︎","♌︎","♍︎","♎︎","♏︎","♐︎","♑︎","♒︎","♓︎"];
  function signGlyphFromLon(lon){ return SIGN_GLYPHS[signIndex(lon)]; }
  function degInSignInt(lon){ return Math.floor(mod(lon,30)); }   // 0–29

  // Fast visuals (animated mode)
  function sunLongitudeDegFast(d){
    const y = d.getUTCFullYear();
    let eq = marchEquinoxApprox(y);
    if (d < eq) eq = marchEquinoxApprox(y - 1);
    const dtDays = (d - eq) / DAY;
    return mod((dtDays / YEAR_DAYS) * 360, 360);
  }
  function moonPhaseFrac(d){
    const dtDays = (d - NEW_MOON_REF) / DAY;
    return mod(dtDays, MOON_SYNODIC_DAYS) / MOON_SYNODIC_DAYS; // 0..1
  }
  function moonLongitudeDegPhase(d, sunLon){
    return mod(sunLon + moonPhaseFrac(d) * 360, 360);
  }

  // Precise Frozen mode (Astronomy Engine)
  function preciseLongitudes(d){
    if (!window.Astronomy) return null;
    const t = new Astronomy.AstroTime(d);

    // Geocentric position vectors (with aberration correction)
    const sunVec  = Astronomy.GeoVector(Astronomy.Body.Sun,  t, true);
    const moonVec = Astronomy.GeoVector(Astronomy.Body.Moon, t, true);

    // Convert to ecliptic-of-date spherical coords (elon = ecliptic longitude)
    const sunEcl  = Astronomy.Ecliptic(sunVec);   // { elon, elat, dist }
    const moonEcl = Astronomy.Ecliptic(moonVec);  // { elon, elat, dist }

    return { sunLon: sunEcl.elon, moonLon: moonEcl.elon };
  }


  function toSceneAngle(deg){ return (-(deg) - 90) * Math.PI / 180; } // 0° Aries at top, clockwise
  function ringHit(cx,cy,R, sx,sy, angle){
    const dx=Math.cos(angle), dy=Math.sin(angle);
    const ox=sx-cx, oy=sy-cy;
    const a=dx*dx+dy*dy, b=2*(ox*dx+oy*dy), c=ox*ox+oy*oy - R*R;
    const disc=b*b-4*a*c;
    const t = disc>=0 ? (-b + Math.sqrt(disc)) / (2*a) : 0;
    return { x: sx + t*dx, y: sy + t*dy };
  }
  function phaseName(age){
    const p = age / MOON_SYNODIC_DAYS;
    if (p < 0.03) return "New";
    if (p < 0.22) return "Waxing Crescent";
    if (p < 0.28) return "First Quarter";
    if (p < 0.47) return "Waxing Gibbous";
    if (p < 0.53) return "Full";
    if (p < 0.72) return "Waning Gibbous";
    if (p < 0.78) return "Last Quarter";
    if (p < 0.97) return "Balsamic";
    return "New";
  }
  function moonPhaseAgeDays(d){ const dtDays=(d-NEW_MOON_REF)/DAY; return mod(dtDays,MOON_SYNODIC_DAYS); }

  class ZodiClock extends HTMLElement {
            static get observedAttributes() {
        return ["initial-mode", "initial-dt", "controls", "labels"];
        }
        attributeChangedCallback(name, oldV, newV) {
        // switch state immediately when attrs arrive from embed.html
        if (name === "initial-mode") {
            this.mode = (newV === "frozen") ? "frozen" : "animated";
        }
        // Re-render so controls/labels/date reflect new attrs
        if (this.isConnected) this.render();
        }

    constructor(){
      super();
      this.attachShadow({ mode: "open" });
      this.mode = "animated";          // "animated" | "frozen"
      this.virtualNowMs = Date.now();  // for animated timeline
      this._raf = null;
    }

    connectedCallback(){ this.render(); }
    disconnectedCallback(){ if (this._raf) cancelAnimationFrame(this._raf); }

    render(){
      const showControls = this.getAttribute("controls") !== "0";
      const root = document.createElement("div");
      root.innerHTML = `
        <style>
          .wrap{max-width:1080px;margin:0 auto;padding:0}
          .controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0}
          .group{display:flex;align-items:center;gap:8px;background:#111318;border:1px solid #1c1f26;padding:8px 10px;border-radius:12px}
          .btn{padding:6px 10px;border-radius:999px;border:1px solid #2b2f38;background:#151923;color:#e6e7eb;cursor:pointer}
          .btn.active{background:#e6e7eb;color:#0b0c10}
          .input{background:#151923;color:#e6e7eb;border:1px solid #2b2f38;border-radius:10px;padding:6px 8px}
          .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:10px 0}
          .card{background:#111318;border:1px solid #1c1f26;border-radius:16px;padding:10px}
          .small{color:#9aa0aa;font-size:12px}
          .big{font-weight:600}
          .canvas{background:#0f1218;border:1px solid #1d212a;border-radius:16px;padding:10px}
          svg{width:100%;height:auto;display:block}
          .legend{margin-top:6px;color:#9aa0aa;font-size:12px}
          a{color:#8ab4ff;text-decoration:none}
        </style>
        <div class="wrap">
          <div class="controls" style="${showControls ? "" : "display:none"}">
            <div class="group">
              <span class="small">Mode</span>
              <button id="btnAnimated" class="btn">Animated</button>
              <button id="btnFrozen" class="btn">Frozen</button>
            </div>
            <div class="group" id="dateGroup" style="display:none">
              <span class="small">Date/Time (UTC)</span>
              <input id="dt" class="input" type="datetime-local" />
            </div>
          </div>

          <div class="cards">
            <div class="card">
              <div class="small">Sun</div>
              <div class="big" id="sunLabel">—</div>
              <div class="small">Ray from Earth through the Sun to the tropical ring.</div>
            </div>
            <div class="card">
              <div class="small">Moon</div>
              <div class="big" id="moonLabel">—</div>
              <div class="small">Phase: <span id="phaseLabel">—</span></div>
            </div>
            <div class="card">
              <div class="small">Now (UTC)</div>
              <div class="big" id="nowLabel">—</div>
              <div class="small">Illustrative clock. Frozen mode uses precise ephemeris.</div>
            </div>
          </div>

          <div class="canvas">
            <svg id="scene" viewBox="0 0 800 800" aria-label="Z0DI Clock"></svg>
            <div class="legend">This is a (counter-)clock, not a cosmology. Geocentric display, heliocentric physics. 0° Aries at top. | <a href="#" id="resetNow">reset to now</a></div>
          </div>
        </div>
      `;
      this.shadowRoot.innerHTML = "";
      this.shadowRoot.appendChild(root);
      this.afterRender();
    }

    afterRender() {
      const svg = this.shadowRoot.getElementById("scene");
      const btnAnimated = this.shadowRoot.getElementById("btnAnimated");
      const btnFrozen   = this.shadowRoot.getElementById("btnFrozen");
      const dateGroup   = this.shadowRoot.getElementById("dateGroup");
      const dtInput     = this.shadowRoot.getElementById("dt");
      const resetNow    = this.shadowRoot.getElementById("resetNow");

      const sunLabel  = this.shadowRoot.getElementById("sunLabel");
      const moonLabel = this.shadowRoot.getElementById("moonLabel");
      const phaseLabel= this.shadowRoot.getElementById("phaseLabel");
      const nowLabel  = this.shadowRoot.getElementById("nowLabel");

      const W=800,H=800,cx=W/2,cy=H/2, R_zodiac=350, R_earth=170, R_moon=50;

      // svg helpers
      const ns = "http://www.w3.org/2000/svg";
      const line=(x1,y1,x2,y2,opts={})=>{ const el=document.createElementNS(ns,"line"); el.setAttribute("x1",x1); el.setAttribute("y1",y1); el.setAttribute("x2",x2); el.setAttribute("y2",y2); if(opts.stroke) el.setAttribute("stroke",opts.stroke); if(opts.width) el.setAttribute("stroke-width",opts.width); if(opts.dash) el.setAttribute("stroke-dasharray",opts.dash); svg.appendChild(el); return el; };
      const circle=(x,y,r,opts={})=>{ const el=document.createElementNS(ns,"circle"); el.setAttribute("cx",x); el.setAttribute("cy",y); el.setAttribute("r",r); if(opts.fill) el.setAttribute("fill",opts.fill); if(opts.stroke) el.setAttribute("stroke",opts.stroke); if(opts.width) el.setAttribute("stroke-width",opts.width); svg.appendChild(el); return el; };
      const text=(x,y,str,opts={})=>{ const el=document.createElementNS(ns,"text"); el.setAttribute("x",x); el.setAttribute("y",y); el.setAttribute("fill",opts.fill||"#e6e7eb"); el.setAttribute("font-size",opts.size||12); el.setAttribute("text-anchor",opts.anchor||"middle"); el.setAttribute("dominant-baseline","middle"); el.textContent=str; svg.appendChild(el); return el; };

      // attributes from embed.html
      const attrMode = this.getAttribute("initial-mode");
      const attrDt   = this.getAttribute("initial-dt");
      const showLabels = this.getAttribute("labels") !== "0";

      if (attrMode === "frozen") this.mode = "frozen";

      // static ring + labels
      circle(cx,cy,R_zodiac,{fill:"none",stroke:"#2a2f39",width:2});
      for(let i=0;i<12;i++){
        const ang=(-i*30-90)*Math.PI/180;
        const x1=cx+R_zodiac*Math.cos(ang), y1=cy+R_zodiac*Math.sin(ang);
        line(cx,cy,x1,y1,{stroke:"#20242c",width:1});
        if (showLabels){
          const lx=cx+(R_zodiac+22)*Math.cos(ang-15*Math.PI/180);
          const ly=cy+(R_zodiac+22)*Math.sin(ang-15*Math.PI/180);
          text(lx,ly,SIGNS[i],{size:13,fill:"#9aa0aa"});
        }
      }

      // ---- Seasons ring: four fixed spokes + chips ----
      const R_season = R_zodiac - 8;

      let seasonsYear = null;
      function drawSeasons() {
        if (!window.Astronomy) { setTimeout(drawSeasons, 200); return; }
        seasonsYear = seasonsUTC(new Date().getUTCFullYear());

        let prox = { active:false, key:null, dateTag:null };
        if (seasonsYear) {
          const nowIso = new Date().toISOString();
          const nxt = nextSeason(nowIso, seasonsYear);
          prox = {
            active: Math.abs(nxt.days) <= 3,
            key: nxt.key,
            dateTag: nxt.when.toISOString().slice(0,10),
          };
        }

        SEASON_META.forEach(sp => {
          const ang = (-sp.lon - 90) * Math.PI/180;
          const x1=cx+R_season*Math.cos(ang), y1=cy+R_season*Math.sin(ang);
          const x2=cx+(R_season-20)*Math.cos(ang), y2=cy+(R_season-20)*Math.sin(ang);
          line(x1,y1,x2,y2,{stroke:"#2a2f39",width:1.5});

          const scale = prox.active && prox.key===sp.key ? 1.18 : 1.0;
          const tx = cx+(R_season-28)*Math.cos(ang);
          const ty = cy+(R_season-28)*Math.sin(ang);
          const chip = text(tx,ty,sp.glyph,{size:12});
          chip.setAttribute("transform",`translate(${tx},${ty}) scale(${scale}) translate(${-tx},${-ty})`);
          chip.setAttribute("aria-label", sp.label);

          if (prox.active && prox.key===sp.key) {
            text(tx, ty+14*scale, prox.dateTag, { size:10, fill:"#9aa0aa" });
          }
        });
      }
      drawSeasons();

      // ---- Node ring: thin circle + ☊ ☋ pins (static until next daily JSON) ----
      const R_nodes = R_zodiac - 28;                                    // thin inner ring
      const nodeRing = circle(cx, cy, R_nodes, { fill:"none", stroke:"#242a33", width:1 });

      let ascPin=null, descPin=null, micro=null;
      function showMicro(x,y,str,ms=1800){
        if (micro) { svg.removeChild(micro); micro=null; }
        micro = text(x, y-14, str, { size:11, fill:"#cbd1db" });
        setTimeout(()=>{ if (micro) { svg.removeChild(micro); micro=null; } }, ms);
      }

      function renderNodesOnce(){
        const E = (window.Z0DI && window.Z0DI.ephemDaily) ? window.Z0DI.ephemDaily : null;
        if (!E || E.node_asc_lon_deg == null || E.node_desc_lon_deg == null) {
          // try again shortly; loader runs async at startup
          setTimeout(renderNodesOnce, 300);
          return;
        }

        const nodes = [
          { lon: E.node_asc_lon_deg, glyph:"☊", aria:`☊ ${degInSignInt(E.node_asc_lon_deg)}°${signGlyphFromLon(E.node_asc_lon_deg)}` },
          { lon: E.node_desc_lon_deg, glyph:"☋", aria:`☋ ${degInSignInt(E.node_desc_lon_deg)}°${signGlyphFromLon(E.node_desc_lon_deg)}` },
        ];

        // draw pins
        nodes.forEach((n, i)=>{
          const ang = toSceneAngle(n.lon);
          const x = cx + R_nodes*Math.cos(ang);
          const y = cy + R_nodes*Math.sin(ang);
          const pin = text(x, y, n.glyph, { size:16 });
          pin.setAttribute("aria-label", n.aria);
          if (i===0) ascPin = { x, y, lon:n.lon, glyph:n.glyph }; else descPin = { x, y, lon:n.lon, glyph:n.glyph };
        });

        // tap/hover → micro-label like “☊ 12°♉︎”
        svg.addEventListener("click", (ev)=>{
          const pt = svg.createSVGPoint(); pt.x = ev.offsetX; pt.y = ev.offsetY;
          const hits = [ascPin, descPin].filter(Boolean).map(p=>{
            const dx = pt.x - p.x, dy = pt.y - p.y; return { p, d2: dx*dx + dy*dy };
          }).sort((a,b)=>a.d2-b.d2);
          if (!hits.length) return;
          const h = hits[0];
          if (h.d2 <= 18*18) {
            const sGlyph = signGlyphFromLon(h.p.lon);
            const degStr = `${degInSignInt(h.p.lon)}°${sGlyph}`;
            showMicro(h.p.x, h.p.y, `${h.p.glyph} ${degStr}`);
          }
        });
      }
      renderNodesOnce();


      // Sun
      circle(cx,cy,18,{fill:"#f5b301",stroke:"#0b0c10",width:2}); text(cx,cy-30,"Sun",{size:12,fill:"#9aa0aa"});
      // Earth orbit
      circle(cx,cy,R_earth,{fill:"none",stroke:"#1f2937",width:1.5});
      // dynamic bodies
      const earthEl=circle(cx+R_earth,cy,11,{fill:"#3b82f6",stroke:"#0b0c10",width:1.5}); const earthLbl=text(cx+R_earth,cy-18,"Earth",{size:11,fill:"#9aa0aa"});
      const moonOrbitEl=circle(cx+R_earth,cy,R_moon,{fill:"none",stroke:"#2a2f39",width:1});
      const moonEl=circle(cx+R_earth+R_moon,cy,6,{fill:"#9aa3af",stroke:"#0b0c10",width:1}); const moonLbl=text(cx+R_earth+R_moon,cy-12,"Moon",{size:10,fill:"#9aa0aa"});
      // Rays + hits
      const sunRay=line(cx+R_earth,cy,cx+R_earth,cy,{stroke:"#f5b301",width:2.5}); const moonRay=line(cx+R_earth,cy,cx+R_earth,cy,{stroke:"#9aa3af",width:2,dash:"4 3"});
      const sunHit=circle(cx,cy,5,{fill:"#f5b301"}); const moonHit=circle(cx,cy,5,{fill:"#9aa3af"});

      // controls and defaults
      if (btnAnimated && btnFrozen){
        if (this.mode === "animated") btnAnimated.classList.add("active"); else btnFrozen.classList.add("active");
        btnAnimated.onclick=()=>{ this.mode="animated"; btnAnimated.classList.add("active"); btnFrozen.classList.remove("active"); if (dateGroup) dateGroup.style.display="none"; };
        btnFrozen.onclick =()=>{ this.mode="frozen";  btnFrozen .classList.add("active"); btnAnimated.classList.remove("active"); if (dateGroup) dateGroup.style.display="flex"; };
      }
      if (resetNow){ resetNow.onclick=(e)=>{ e.preventDefault(); this.virtualNowMs=Date.now(); }; }

      // initialize datetime-local
            if (dtInput) {
            const attrDt = this.getAttribute("initial-dt");
            if (attrDt) {
                dtInput.value = attrDt.replace("Z","").slice(0,16);
            } else {
                const now = new Date();
                const iso = new Date(now.getTime()-now.getTimezoneOffset()*60000)
                            .toISOString().slice(0,16);
                dtInput.value = iso;
            }
            }


      const updateScene = (d)=>{
        let sunLon, moonLon;
        if (this.mode === "frozen"){
          const p = preciseLongitudes(d);
          if (p){ sunLon=p.sunLon; moonLon=p.moonLon; }
          else  { sunLon = sunLongitudeDegFast(d); moonLon = moonLongitudeDegPhase(d, sunLon); }
        } else {
          sunLon = sunLongitudeDegFast(d);
          moonLon = moonLongitudeDegPhase(d, sunLon);
        }

        const sunSign=SIGNS[signIndex(sunLon)], moonSign=SIGNS[signIndex(moonLon)];
        const mAge=moonPhaseAgeDays(d), mPhase=phaseName(mAge);

        const thetaEarth=toSceneAngle(mod(sunLon+180,360));
        const ex=cx+R_earth*Math.cos(thetaEarth), ey=cy+R_earth*Math.sin(thetaEarth);
        earthEl.setAttribute("cx",ex); earthEl.setAttribute("cy",ey); earthLbl.setAttribute("x",ex); earthLbl.setAttribute("y",ey-18);

        const thetaMoon=toSceneAngle(moonLon);
        const mx=ex+R_moon*Math.cos(thetaMoon), my=ey+R_moon*Math.sin(thetaMoon);
        moonEl.setAttribute("cx",mx); moonEl.setAttribute("cy",my); moonLbl.setAttribute("x",mx); moonLbl.setAttribute("y",my-12);
        moonOrbitEl.setAttribute("cx",ex); moonOrbitEl.setAttribute("cy",ey);

        const sunAng=Math.atan2(cy-ey, cx-ex); const moonAng=Math.atan2(my-ey, mx-ex);
        const sh=ringHit(cx,cy,R_zodiac, ex,ey, sunAng); const mh=ringHit(cx,cy,R_zodiac, ex,ey, moonAng);
        sunRay.setAttribute("x1",ex); sunRay.setAttribute("y1",ey); sunRay.setAttribute("x2",sh.x); sunRay.setAttribute("y2",sh.y);
        moonRay.setAttribute("x1",ex); moonRay.setAttribute("y1",ey); moonRay.setAttribute("x2",mh.x); moonRay.setAttribute("y2",mh.y);
        sunHit.setAttribute("cx",sh.x); sunHit.setAttribute("cy",sh.y); moonHit.setAttribute("cx",mh.x); moonHit.setAttribute("cy",mh.y);

        if (sunLabel)  sunLabel.textContent = `${sunSign} ${toDegMin(mod(sunLon,30))}`;
        if (moonLabel) moonLabel.textContent= `${moonSign} ${toDegMin(mod(moonLon,30))}`;
        if (phaseLabel)phaseLabel.textContent= mPhase;
        if (nowLabel)  nowLabel.textContent  = d.toISOString().replace("T"," ").slice(0,19);
      };

      const loop = ()=>{
        if (this.mode === "animated"){
          const yearMs = 123.7*1000;                 // 123.7 s / year
          const scale  = (YEAR_DAYS*DAY)/yearMs;     // single scale; Moon ratio comes from phase tie
          this.virtualNowMs += 16.67 * scale;        // ~60 fps step
          updateScene(new Date(this.virtualNowMs));
        } else {
          const d = dtInput && dtInput.value ? new Date(dtInput.value) : new Date();
          updateScene(d);
        }
        this._raf = requestAnimationFrame(loop);
      };

      updateScene(new Date());
      this._raf = requestAnimationFrame(loop);
    }
  }

if (!customElements.get("zodi-clock")) {
  customElements.define("zodi-clock", ZodiClock);
}

})();
