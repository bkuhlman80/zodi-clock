// date-overlay.js
const MMM = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDDMMMYYYYH = d =>
  `${String(d.getUTCDate()).padStart(2,"0")}-${MMM[d.getUTCMonth()]}-${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2,"0")}h`;

const toInputLocal = d => { // needs minutes
  const p=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
};
const parseInputLocal = s => {
  const [Y,M,D,h=0,m=0] = s.split(/[T:-]/).map(Number);
  return new Date(Y, M-1, D, h, m);
};

customElements.whenDefined("zodi-clock").then(() => {
  const el    = document.querySelector("zodi-clock");
  const input = document.getElementById("dt-input");
  const disp  = document.getElementById("dt-display");
  if (!el || !input || !disp) return;  // page without overlay, exit

  // enforce hour granularity
  input.step = "3600";

  const p = new URLSearchParams(location.search);
  const start = p.get("dt") ? new Date(p.get("dt")) : new Date();
  input.value = toInputLocal(start);
  disp.textContent = fmtDDMMMYYYYH(start);
  el.setAttribute("initial-dt", start.toISOString());

  const sync = () => {
    const local = parseInputLocal(input.value);
    disp.textContent = fmtDDMMMYYYYH(local);
    const iso = new Date(local.getTime() - local.getTimezoneOffset()*60000).toISOString();
    if (typeof el.setFrozenISO === "function") el.setFrozenISO(iso);
    else el.setAttribute("initial-dt", iso);
  };
  input.addEventListener("input",  sync);
  input.addEventListener("change", sync);
});
