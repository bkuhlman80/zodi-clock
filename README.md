# Helio‑Geo Zodiac Clock (phase‑aligned)

Visual speeds:
- Tropical year = **123.7 seconds**
- Lunar synodic month = **10 seconds**

Implementation detail:
- Moon longitude = Sun longitude + synodic phase × 360°
- Anchored to real new moon epoch (2000‑01‑06 18:14 UTC) so Full ≈ 180° on the correct dates.

## Deploy to GitHub Pages

1. Create a public repo `helio-geo-zodiac`.
2. Upload `index.html` and `preview.png` to the repo root.
3. Edit `index.html`: replace `YOUR_GITHUB_USERNAME` in the OG tags.
4. Commit to `main` and enable Settings → Pages → Deploy from a branch → `main` / root.
5. Share `https://YOUR_GITHUB_USERNAME.github.io/helio-geo-zodiac/`.
6. If previews cache, bump the `?v=2` on `og:image`.
