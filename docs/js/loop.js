import { State, advance } from "./state.js";
import { render } from "./render.js";

let rafId = 0, last = 0;
export function startLoop(ctx){
  function tick(ts){
    if (!last) last = ts;
    const dt = ts - last; last = ts;
    if (State.mode === "animated") advance(dt);
    render(ctx);
    rafId = requestAnimationFrame(tick);
  }
  if (!rafId) rafId = requestAnimationFrame(tick);
}
