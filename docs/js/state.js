// sim state
export const State = { mode: "frozen", t: new Date(), speed: 60 };
export function setMode(m) { State.mode = m; }
export function setTime(d) { State.t = new Date(d); }
export function advance(ms) { State.t = new Date(State.t.getTime() + State.speed * ms); }
