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
SOLAR_LAT_LIMIT = 1.6   # deg, good practical cutoff
LUNAR_LAT_LIMIT = 1.3   # deg

def angdiff(a, b):
    """Smallest absolute angle difference in degrees."""
    d = (a - b + 180.0) % 360.0 - 180.0
    return abs(d)

def julian_centuries(dt_utc):
    # dt_utc: datetime (UTC, tz-aware)
    jd = dt_utc.timestamp()/86400.0 + 2440587.5
    return (jd - 2451545.0)/36525.0

def mean_node_lon_deg(dt_utc):
    """Ascending node Ω (deg), Meeus-style mean node, matches your JS."""
    T = julian_centuries(dt_utc)
    w = 125.04452 - 1934.136261*T + 0.0020708*T*T + (T*T*T)/450000.0
    return w % 360.0

def sun_lon_deg(t):
    lon, _, _ = eph["earth"].at(t).observe(eph["sun"]).apparent().frame_latlon(ecliptic_frame)
    return float(lon.degrees % 360.0)

def moon_lat_deg(t):
    _, lat, _ = eph["earth"].at(t).observe(eph["moon"]).apparent().frame_latlon(ecliptic_frame)
    return float(lat.degrees)

def find_eclipses(year):
    """Return list of {date,type,node,window} for the given calendar year."""
    t0 = ts.utc(year, 1, 1)
    t1 = ts.utc(year+1, 1, 1)
    times, phases = almanac.find_discrete(t0, t1, almanac.moon_phases(eph))  # 0=new,2=full
    out = []
    for t, ph in zip(times, phases):
        if int(ph) not in (0, 2):
            continue
        dt = t.utc_datetime()
        lat = abs(moon_lat_deg(t))
        if (ph == 0 and lat > SOLAR_LAT_LIMIT) or (ph == 2 and lat > LUNAR_LAT_LIMIT):
            continue  # not close enough to the ecliptic for an eclipse
        # decide node by Sun ↔ node proximity at that instant
        sun = sun_lon_deg(t)
        asc = mean_node_lon_deg(dt)
        desc = (asc + 180.0) % 360.0
        node = "asc" if angdiff(sun, asc) <= angdiff(sun, desc) else "desc"
        out.append({
            "date": dt.date().isoformat(),
            "type": "solar" if ph == 0 else "lunar",
            "node": node,
            "window": 1
        })
    return out

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
  "eclipses": find_eclipses(y)               # ← add list for this year
}

OUT.write_text(json.dumps(out, separators=(",",":")) + "\n", encoding="utf-8")
print("wrote", OUT)
