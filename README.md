# Every Check Matters — the Armoury story

An interactive, scrollytelling long-read on how Armoury went from a Hack for Public Good prototype to SCDF's daily readiness platform.

Vite + React 19 + TypeScript + Tailwind v4, with the `@/` alias and a shadcn `components.json`.

## Run

```sh
npm install
npm run dev
npm run build
```

## What's in it

| Piece | Where | Library |
| --- | --- | --- |
| Title and pull-quote reveals, split on the lines the browser painted | `src/components/SplitReveal.tsx`, `Headline.tsx`, `PullQuote.tsx` | [kugiri](https://github.com/edoardolunardi/kugiri) |
| Hero carousel: four images, an issue card on top, autoplay dots that pause on hover | `src/components/Hero.tsx` | `CarouselDots` |
| Images that "generate" in as they load | `Hero.tsx`, `Figure.tsx` | [img-fx](https://www.npmjs.com/package/img-fx) (`sweep-gradient`) |
| Live tuning panel (hero overlay, card blur, autoplay, loader preset, accent colour, title stagger and duration, replay) | `Hero.tsx`, `Headline.tsx`, `<DialRoot />` in `App.tsx` | [DialKit](https://github.com/joshpuckett/dialkit) |
| Scrollytelling: 350 vehicles across 23 stations; the North Star switch | `ReadinessScrolly.tsx`, `NorthStar.tsx` | motion |
| Charts: check time, CSAT against target, EMT recovery, a quarterly metrics explorer | `src/components/charts/`, `LastMile.tsx`, `NumbersExplorer.tsx` | hand-built SVG |

Type: Instrument Serif for display text, headlines and pull quotes. DM Sans for body copy and credits. Inter is loaded for CarouselDots' weight animations.

## Follow-ups

- **CarouselDots** — `src/components/ui/carousel-dots.tsx` is a stand-in written against the documented Fluid Functionalism API, because the registry was unreachable from the build sandbox. To swap in the original:
  ```sh
  npx shadcn@latest add https://www.fluidfunctionalism.com/r/carousel-dots.json --overwrite
  ```
  The props are the same, so `Hero.tsx` doesn't need to change. The install also replaces `src/lib/utils.ts` with the clsx + tailwind-merge version.
- **Imagery** — `public/images/*.jpg` are generated placeholder illustrations. Replace them with SCDF photography under the same file names.
- **DialKit** only shows in development by default. Pass `productionEnabled` to `<DialRoot />` to show it on a deployed preview.
