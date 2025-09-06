// docs/js/constants.js

export const TAU = Math.PI * 2; 
export const DEG = Math.PI / 180;
export const EPS = 1e-6; 
export const ECLIPSE_CORRIDOR_DEG = 18.5;

// Orientation: 0° Aries at top, clockwise.
export const EMO = "\uFE0F";           // emoji presentation selector
export const VS  = "\uFE0E";           // text presentation selector
export const FONT_SYM = "system-ui,'Apple Symbols','Segoe UI Symbol','Noto Sans Symbols 2','Noto Sans Symbols','Symbola',sans-serif";

export const R = {
  zodiac: 350,
  earth: 170,
  moon: 50,
};
export const RADIUS = {
  zodiac: R.zodiac,
  season: R.zodiac,          
  earth: R.earth,
  moon: R.moon,
  nodes: R.earth + R.moon,
};

export const COLORS = {
  bg: "#0f1218", ring: "#2a2f39", text: "#e6e7eb",
  sun: "#f5b301", earth: "#3b82f6", moon: "#9aa3af",
  nodePin: "#e6e7eb", nodeArc: "#f8961e", nodeArcHi: "#f3722c",
  seasonTick: "#2a2f39", badgeBG: "#cbd1db", badgeHi: "#f5b301",
};
export const SIGNS = ["♈︎","♉︎","♊︎","♋︎","♌︎","♍︎","♎︎","♏︎","♐︎","♑︎","♒︎","♓︎"];
export const SIGN_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
export const GLYPH = { nodeAsc: "☊", nodeDesc: "☋", };