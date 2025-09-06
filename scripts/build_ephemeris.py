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
try:
    eph = load("de440s.bsp")
    print("[eph] using de440s")
except Exception as e:
    print("[eph] de440s failed:", e, "→ using de421")
    eph = load("de421.bsp")

now = datetime.now(timezone.utc)
y = now.year

# Seasons this year
t0, t1 = ts.utc(y, 1, 1), ts.utc(y+1, 1, 1)
t_sea, which = almanac.find_discrete(t0, t1, almanac.seasons(eph))
labels = {0:"MarEq", 1:"JunSol", 2:"SepEq", 3:"DecSol"}
pairs = [(labels[int(w)], t.utc_datetime()) for t, w in zip(t_sea, which)]
next_season = next((lab, dt) for lab, dt in pairs if dt > now)
days_to = (next_season[1] - now).total_seconds()/86400.0


# --- Lunar nodes: nearest ascending across a wide window
nodes_start = ts.from_datetime(now - timedelta(days=365*3))
nodes_end   = ts.from_datetime(now + timedelta(days=365*3))

print("[eph] using de440s.bsp")
tn, kind = almanac.find_discrete(nodes_start, nodes_end, almanac.moon_nodes(eph))
print(f"[nodes] window: {nodes_start.utc_strftime()} → {nodes_end.utc_strftime()}")
print(f"[nodes] events={len(tn)} kinds_sample={list(map(int, kind[:12]))}")

# pick nearest ascending (>0)
asc_time, best = None, float("inf")
for t, k in zip(tn, kind):
    if int(k) > 0:
        dt = abs((t.utc_datetime() - now).total_seconds())
        if dt < best:
            best = dt
            asc_time = t

# fallback: latest ascending if none picked
if asc_time is None:
    for t, k in reversed(list(zip(tn, kind))):
        if int(k) > 0:
            asc_time = t
            best = abs((t.utc_datetime() - now).total_seconds())
            break

# compute longitude THEN assert and derive the opposite node
if asc_time is not None:
    ast = eph["earth"].at(asc_time).observe(eph["moon"]).apparent()
    lon, lat, _ = ast.frame_latlon(ecliptic_frame)
    asc_lon = float(lon.degrees % 360.0)
    print(f"[nodes] asc_time={asc_time.utc_strftime()} dt_s={best:.0f} asc_lon={asc_lon:.3f}")
else:
    asc_lon = 0.0
    print("[nodes] no ascending node found; using 0.0")
# after computing asc_lon float
asc_lon = asc_lon % 360.0
if asc_lon < 1e-6:        # avoid exact 0.000 at cusp
    asc_lon = 360.0 - 1e-6

desc_lon = (asc_lon + 180.0) % 360.0

out = {
  "iso_date": now.date().isoformat(),
  "next_season_event": next_season[0],
  "next_season_utc": next_season[1].isoformat().replace("+00:00","Z"),
  "days_to_season": round(days_to, 3),
  "node_asc_lon_deg": round(asc_lon, 6),     # was 3
  "node_desc_lon_deg": round(desc_lon, 6),   # was 3
  "node_asc_sign": sign_glyph(asc_lon),
  "node_desc_sign": sign_glyph(desc_lon),
}

OUT.write_text(json.dumps(out, separators=(",",":")) + "\n", encoding="utf-8")
print("wrote", OUT)
