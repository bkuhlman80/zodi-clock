(function(){const N=document.createElement("link").relList;if(N&&N.supports&&N.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))D(r);new MutationObserver(r=>{for(const u of r)if(u.type==="childList")for(const M of u.addedNodes)M.tagName==="LINK"&&M.rel==="modulepreload"&&D(M)}).observe(document,{childList:!0,subtree:!0});function V(r){const u={};return r.integrity&&(u.integrity=r.integrity),r.referrerPolicy&&(u.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?u.credentials="include":r.crossOrigin==="anonymous"?u.credentials="omit":u.credentials="same-origin",u}function D(r){if(r.ep)return;r.ep=!0;const u=V(r);fetch(r.href,u)}})();(function(){const I=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"],D=365.24219,r=29.530588853,u=new Date(Date.UTC(2e3,0,6,18,14,0));function M(e){return new Date(Date.UTC(e,2,20,21,0,0))}function A(e,t){return(e%t+t)%t}function U(e){const t=Math.floor(e),c=Math.floor((e-t)*60);return`${t}°${String(c).padStart(2,"0")}’`}function W(e){return Math.floor(A(e,360)/30)}function Z(e){const t=e.getUTCFullYear();let c=M(t);e<c&&(c=M(t-1));const h=(e-c)/864e5;return A(h/D*360,360)}function lt(e){const t=(e-u)/864e5;return A(t,r)/r}function Q(e,t){return A(t+lt(e)*360,360)}function dt(e){if(!window.Astronomy)return null;const t=new Astronomy.AstroTime(e),c=Astronomy.GeoVector(Astronomy.Body.Sun,t,!0),h=Astronomy.GeoVector(Astronomy.Body.Moon,t,!0),y=Astronomy.Ecliptic(c),b=Astronomy.Ecliptic(h);return{sunLon:y.elon,moonLon:b.elon}}function K(e){return(-e-90)*Math.PI/180}function j(e,t,c,h,y,b){const w=Math.cos(b),v=Math.sin(b),k=h-e,E=y-t,S=w*w+v*v,C=2*(k*w+E*v),P=k*k+E*E-c*c,i=C*C-4*S*P,n=i>=0?(-C+Math.sqrt(i))/(2*S):0;return{x:h+n*w,y:y+n*v}}function ut(e){const t=e/r;return t<.03?"New":t<.22?"Waxing Crescent":t<.28?"First Quarter":t<.47?"Waxing Gibbous":t<.53?"Full":t<.72?"Waning Gibbous":t<.78?"Last Quarter":t<.97?"Balsamic":"New"}function ht(e){const t=(e-u)/864e5;return A(t,r)}class J extends HTMLElement{static get observedAttributes(){return["initial-mode","initial-dt","controls","labels"]}attributeChangedCallback(t,c,h){t==="initial-mode"&&(this.mode=h==="frozen"?"frozen":"animated"),this.isConnected&&this.render()}constructor(){super(),this.attachShadow({mode:"open"}),this.mode="animated",this.virtualNowMs=Date.now(),this._raf=null}connectedCallback(){this.render()}disconnectedCallback(){this._raf&&cancelAnimationFrame(this._raf)}render(){const t=this.getAttribute("controls")!=="0",c=document.createElement("div");c.innerHTML=`
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
          <div class="controls" style="${t?"":"display:none"}">
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
      `,this.shadowRoot.innerHTML="",this.shadowRoot.appendChild(c),this.afterRender()}afterRender(){const t=this.shadowRoot.getElementById("scene"),c=this.shadowRoot.getElementById("btnAnimated"),h=this.shadowRoot.getElementById("btnFrozen"),y=this.shadowRoot.getElementById("dateGroup"),b=this.shadowRoot.getElementById("dt"),w=this.shadowRoot.getElementById("resetNow"),v=this.shadowRoot.getElementById("sunLabel"),k=this.shadowRoot.getElementById("moonLabel"),E=this.shadowRoot.getElementById("phaseLabel"),S=this.shadowRoot.getElementById("nowLabel"),C=800,P=800,i=C/2,n=P/2,L=350,m=170,z=50,_="http://www.w3.org/2000/svg",G=(s,a,l,d,o={})=>{const f=document.createElementNS(_,"line");return f.setAttribute("x1",s),f.setAttribute("y1",a),f.setAttribute("x2",l),f.setAttribute("y2",d),o.stroke&&f.setAttribute("stroke",o.stroke),o.width&&f.setAttribute("stroke-width",o.width),o.dash&&f.setAttribute("stroke-dasharray",o.dash),t.appendChild(f),f},x=(s,a,l,d={})=>{const o=document.createElementNS(_,"circle");return o.setAttribute("cx",s),o.setAttribute("cy",a),o.setAttribute("r",l),d.fill&&o.setAttribute("fill",d.fill),d.stroke&&o.setAttribute("stroke",d.stroke),d.width&&o.setAttribute("stroke-width",d.width),t.appendChild(o),o},R=(s,a,l,d={})=>{const o=document.createElementNS(_,"text");return o.setAttribute("x",s),o.setAttribute("y",a),o.setAttribute("fill",d.fill||"#e6e7eb"),o.setAttribute("font-size",d.size||12),o.setAttribute("text-anchor",d.anchor||"middle"),o.setAttribute("dominant-baseline","middle"),o.textContent=l,t.appendChild(o),o},ft=this.getAttribute("initial-mode");this.getAttribute("initial-dt");const mt=this.getAttribute("labels")!=="0";ft==="frozen"&&(this.mode="frozen"),x(i,n,L,{fill:"none",stroke:"#2a2f39",width:2});for(let s=0;s<12;s++){const a=(-s*30-90)*Math.PI/180,l=i+L*Math.cos(a),d=n+L*Math.sin(a);if(G(i,n,l,d,{stroke:"#20242c",width:1}),mt){const o=i+(L+22)*Math.cos(a-15*Math.PI/180),f=n+(L+22)*Math.sin(a-15*Math.PI/180);R(o,f,I[s],{size:13,fill:"#9aa0aa"})}}x(i,n,18,{fill:"#f5b301",stroke:"#0b0c10",width:2}),R(i,n-30,"Sun",{size:12,fill:"#9aa0aa"}),x(i,n,m,{fill:"none",stroke:"#1f2937",width:1.5});const X=x(i+m,n,11,{fill:"#3b82f6",stroke:"#0b0c10",width:1.5}),tt=R(i+m,n-18,"Earth",{size:11,fill:"#9aa0aa"}),et=x(i+m,n,z,{fill:"none",stroke:"#2a2f39",width:1}),ot=x(i+m+z,n,6,{fill:"#9aa3af",stroke:"#0b0c10",width:1}),st=R(i+m+z,n-12,"Moon",{size:10,fill:"#9aa0aa"}),F=G(i+m,n,i+m,n,{stroke:"#f5b301",width:2.5}),O=G(i+m,n,i+m,n,{stroke:"#9aa3af",width:2,dash:"4 3"}),it=x(i,n,5,{fill:"#f5b301"}),nt=x(i,n,5,{fill:"#9aa3af"});if(c&&h&&(this.mode==="animated"?c.classList.add("active"):h.classList.add("active"),c.onclick=()=>{this.mode="animated",c.classList.add("active"),h.classList.remove("active"),y&&(y.style.display="none")},h.onclick=()=>{this.mode="frozen",h.classList.add("active"),c.classList.remove("active"),y&&(y.style.display="flex")}),w&&(w.onclick=s=>{s.preventDefault(),this.virtualNowMs=Date.now()}),b){const s=this.getAttribute("initial-dt");if(s)b.value=s.replace("Z","").slice(0,16);else{const a=new Date,l=new Date(a.getTime()-a.getTimezoneOffset()*6e4).toISOString().slice(0,16);b.value=l}}const Y=s=>{let a,l;if(this.mode==="frozen"){const $=dt(s);$?(a=$.sunLon,l=$.moonLon):(a=Z(s),l=Q(s,a))}else a=Z(s),l=Q(s,a);const d=I[W(a)],o=I[W(l)],f=ht(s),bt=ut(f),rt=K(A(a+180,360)),p=i+m*Math.cos(rt),g=n+m*Math.sin(rt);X.setAttribute("cx",p),X.setAttribute("cy",g),tt.setAttribute("x",p),tt.setAttribute("y",g-18);const ct=K(l),H=p+z*Math.cos(ct),q=g+z*Math.sin(ct);ot.setAttribute("cx",H),ot.setAttribute("cy",q),st.setAttribute("x",H),st.setAttribute("y",q-12),et.setAttribute("cx",p),et.setAttribute("cy",g);const pt=Math.atan2(n-g,i-p),gt=Math.atan2(q-g,H-p),T=j(i,n,L,p,g,pt),B=j(i,n,L,p,g,gt);F.setAttribute("x1",p),F.setAttribute("y1",g),F.setAttribute("x2",T.x),F.setAttribute("y2",T.y),O.setAttribute("x1",p),O.setAttribute("y1",g),O.setAttribute("x2",B.x),O.setAttribute("y2",B.y),it.setAttribute("cx",T.x),it.setAttribute("cy",T.y),nt.setAttribute("cx",B.x),nt.setAttribute("cy",B.y),v&&(v.textContent=`${d} ${U(A(a,30))}`),k&&(k.textContent=`${o} ${U(A(l,30))}`),E&&(E.textContent=bt),S&&(S.textContent=s.toISOString().replace("T"," ").slice(0,19))},at=()=>{if(this.mode==="animated"){const a=D*864e5/123700;this.virtualNowMs+=16.67*a,Y(new Date(this.virtualNowMs))}else{const s=b&&b.value?new Date(b.value):new Date;Y(s)}this._raf=requestAnimationFrame(at)};Y(new Date),this._raf=requestAnimationFrame(at)}}if(customElements.get("helio-geo-zodiac-clock")||customElements.define("helio-geo-zodiac-clock",J),!customElements.get("zodi-clock")){class e extends J{}customElements.define("zodi-clock",e)}})();
