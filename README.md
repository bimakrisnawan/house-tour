# rumah-web

Interactive first-person tour of a planned house renovation (Indonesian UI): walk in from the gate, open doors,
switch lights, move the sun, measure, compare with the old house, take photos. Static site for Vercel.

```
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build      # typecheck + build + 100 MB budget check
npm run preview    # serve dist/
```

3D assets are generated from the Blender project in `D:\10. Project\blender\rumah` (`web/build_web.py`, then
`node scripts/build-assets.mjs`); see `docs/architecture.md`. Do not edit `public/assets/` by hand.

Deploy: `vercel --prod` from this folder (Hobby plan, non-commercial). The site is `noindex` on purpose: it
shows the layout of a real home (`DEVIATIONS.md`).

Sounds: Kenney (CC0), see `public/audio/CREDITS.md`.
