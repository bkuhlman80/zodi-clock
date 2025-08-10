# Helio‑Geo Zodiac Clock

A standalone Web Component that shows Sun and Moon tropical positions with animated and frozen modes. Ready for GitHub Pages.

## Quick deploy (GitHub Pages)

1. Create a new public repo named **helio-geo-zodiac** on your GitHub account.
2. Download these files and add them to the repo root:
   - `index.html`
   - `preview.png`
3. Edit `index.html` and replace **YOUR_GITHUB_USERNAME** in the Open Graph tags with your username.
4. Commit and push to the **main** branch.
5. In the repo Settings → **Pages**:
   - Source: **Deploy from a branch**
   - Branch: **main** / **root**
6. Wait 1–2 minutes. Your site will be live at:
   - `https://YOUR_GITHUB_USERNAME.github.io/helio-geo-zodiac/`
7. Test link previews (OG tags) with one of:
   - Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
   - Twitter Card Validator: https://cards-dev.twitter.com/validator
   - iMessage/SMS preview usually updates after the first fetch; you may need to change the `?v=1754777249` cache‑buster on `og:image` if it’s cached.

## Local run

Just open `index.html` in a modern browser. No build step.

## Notes

- This is an illustrative clock. Astronomy is approximate.
- 0° Aries is at the top of the ring. Sun year speed can be set to 12h or 1h; Moon completes an orbit every 60s.
