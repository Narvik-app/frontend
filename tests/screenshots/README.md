# Documentation / about screenshots

Images of the documentation (`documentation` repo) and the about website (`narvik-about` repo) are generated from the
dev fixtures (`narvik-back`, `make reload-fixture`) by Playwright, then converted to `.webp`.

```bash
# backend running with fresh fixtures, then:
pnpm screenshots                              # everything
SCREENSHOT_ONLY=tt-,loan-liste pnpm screenshots   # only the ids starting with these prefixes
```

Result: `tests/screenshots/out/docs/<path>.webp` and `tests/screenshots/out/about/<path>.webp`
(copy them at the root of `docs/` in the documentation repo and in `public/pics/` in narvik-about).

Everything is declared in `manifest.ts` (one capture can feed several images). Add an entry there to generate a new image.
Images showing external tools (iTAC, Cerbère, Eden...) can't be generated and stay manual.
