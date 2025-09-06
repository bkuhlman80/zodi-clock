// docs/js/main.js
import "./component.js";
import { loadEphemeris } from "./ephemeris.js";

const VERSION = "2025-09-06";
console.log("Z0DI clock modules loaded", { version: VERSION });

// expose ephemeris map for acceptance checks/devtools
loadEphemeris()
  .then(map => {
    window.Z0DI = Object.assign({}, window.Z0DI, { ephemDaily: map, version: VERSION });
  })
  .catch(err => console.warn("ephemeris load failed:", err));
