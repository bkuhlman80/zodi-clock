// docs/js/render.js

import { getEphemFor } from "./ephemeris.js";
import { drawWheel } from "./wheel.js";
import { drawSeasons, updateSeasons } from "./seasons.js";
import { initNodes } from "./nodes.js";
import { initBodies } from "./bodies.js";
import { solarLonDeg } from "./engine.js";
import { State } from "./state.js";

export function render(ctx){
  const dayKey = State.t.toISOString().slice(0,10);
  ctx.ephem = getEphemFor(dayKey) || ctx.ephem;

  if (!ctx.layers.wheel) {
    drawWheel(ctx);
    drawSeasons(ctx);
    ctx.layers.nodesAPI = initNodes(ctx);
    ctx.layers.bodiesAPI = initBodies(ctx);
  }

  updateSeasons(ctx, State.t);
  if (ctx.layers.bodiesAPI) ctx.layers.bodiesAPI.update(State.t);

  const sunLon = solarLonDeg(State.t);
  const eph = ctx.ephem;
  if (eph && ctx.layers.nodesAPI && eph.node_true_asc != null && eph.node_true_desc != null) {
    ctx.layers.nodesAPI.update(sunLon, eph.node_true_asc, eph.node_true_desc);
  }
}
