from datetime import datetime, timedelta, timezone
from skyfield.api import load
from skyfield import almanac
from skyfield.framelib import ecliptic_frame
import json, math, pathlib

OUT = pathlib.Path("docs/ephemeris_daily.json")

def sign_glyph(deg):
    g = ["♈︎","♉︎","♊︎","♋︎","♌︎","♍︎","♎︎","♏︎","♐︎","♑︎","♒︎","♓︎"]
    return g[int((deg % 360)//30)]

ts = load.timescale()
# Use modern kernel; DE421 is fine too if size matters
eph = load("de440s.bsp")  # cached by Skyfield in ~/.skyfield

now = datetime.now(timezone.utc)
y = now.year

# Seasons this year
t0, t1 = ts.utc(y, 1, 1), ts.utc(y+1, 1, 1)
t_sea, which = almanac.find_discrete(t0, t1, almanac.seasons(eph))
labels = {0:"MarEq", 1:"JunSol", 2:"SepEq", 3:"DecSol"}
pairs = [(labels[int(w)], t.utc_datetime()) for t, w in zip(t_sea, which)]
next_season = next((lab, dt) for lab, dt in pairs if dt > now)
days_to = (next_season[1] - now).total_seconds()/86400.0

# --- Lunar nodes: find ascending nearest to now within ±200 days
from datetime import timedelta

t0 = ts.from_datetime(now - timedelta(days=200))
t1 = ts.from_datetime(now + timedelta(days=200))

tn, kind = almanac.find_discrete(t0, t1, almanac.moon_nodes(eph))

asc_time = None
best = float("inf")
for t, k in zip(tn, kind):
    if k == 1:  # ascending node events
        dt = abs((t.utc_datetime() - now).total_seconds())
        if dt < best:
            best = dt
            asc_time = t

# compute longitude at the chosen ascending node
asc_lon = None
if asc_time is not None:
    ast = eph["earth"].at(asc_time).observe(eph["moon"]).apparent()
    lon, lat, _ = ast.frame_latlon(ecliptic_frame)
    asc_lon = float(lon.degrees % 360.0)

# robust fallback
if asc_lon is None:
    # as a last resort, use the most recent ascending node in the year range
    for t, k in reversed(list(zip(tn, kind))):
        if k == 1:
            ast = eph["earth"].at(t).observe(eph["moon"]).apparent()
            lon, lat, _ = ast.frame_latlon(ecliptic_frame)
            asc_lon = float(lon.degrees % 360.0)
            break
if asc_lon is None:
    asc_lon = 0.0  # keep JSON valid, should be rare

desc_lon = (asc_lon + 180.0) % 360.0

out = {
  "iso_date": now.date().isoformat(),
  "next_season_event": next_season[0],
  "next_season_utc": next_season[1].isoformat().replace("+00:00","Z"),
  "days_to_season": round(days_to, 3),
  "node_asc_lon_deg": round(asc_lon, 3) if asc_lon is not None else None,
  "node_desc_lon_deg": round(desc_lon, 3) if desc_lon is not None else None,
  "node_asc_sign": sign_glyph(asc_lon) if asc_lon is not None else None,
  "node_desc_sign": sign_glyph(desc_lon) if desc_lon is not None else None,
}

OUT.write_text(json.dumps(out, separators=(",",":")) + "\n", encoding="utf-8")
print("wrote", OUT)
