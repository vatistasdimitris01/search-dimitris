# Search — Dimitris

A minimal, premium dark search / new-tab interface built with **React + Vite**.
Type anything, get instant suggestions, press Enter and either stay on the site
for DuckDuckGo-powered results or hand off to Google.

![preview](https://begin-psi.vercel.app/favicon.svg)

## Features

- **In-app results page** — DuckDuckGo's Instant Answer API plus Wikipedia
  articles, rendered at `/search?q=…` with skeleton loading, clickable result
  rows, related searches and a link out to the full DuckDuckGo SERP.
- **Streaming results** — the two sources resolve independently and each paints
  the page as soon as it lands, so neither can hold the other hostage.
- **Search engine toggle** — in Preferences: *Search on Google* off means results
  open on this site, on means a redirect to Google. Persisted in `localStorage`.
- **Robust against flakiness** — DuckDuckGo resets a noticeable share of
  connections, so requests retry with backoff under a hard timeout, and the page
  degrades to Wikipedia-only with an explanatory note rather than breaking.
- **Live suggestions** — Google autocomplete via JSONP
  (`suggestqueries.google.com/...&client=chrome`), with a local fallback list
  when the network blocks it.
- **Inline suggestion roll** — the rest of the top completion is shown as dimmed
  ghost text *inside* the input. Press **Tab** to accept it.
- **Slide-out search button** — the black button animates out from behind the
  search pill once you start typing.
- **Fading skeleton loader** — intentional, non-blocking shimmer while
  suggestions are generated.
- **Preferences popup** — gear icon top-left: light/dark theme, search engine,
  "Hide search button", and city detection for locality queries.
- **Random greeting** — one of seven greetings on every page load, each word
  unblurring left to right.
- **Keyboard support** — `↑` `↓` to navigate, `Enter` to search, `Esc` to close,
  `Tab` to accept the inline suggestion.
- **Accessible** — semantic landmarks, ARIA combobox/listbox roles, visible focus
  rings, `prefers-reduced-motion` support.
- **Responsive** — scales from desktop down to mobile without overflow.

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

> Note: Chrome blocks cross-origin requests from `http://localhost`, so the
> in-app results only resolve over `https`. Use `npm run preview` together with
> a tunnel, or just test the deployed URL.

## Stack

- [React 19](https://react.dev)
- [Vite 8](https://vite.dev)
- Vanilla CSS with custom properties (no CSS framework)
- Inline SVG icons (no icon library)

## Project structure

```
src/
  components/
    SearchInterface.jsx   # state, keyboard nav, search routing, preferences
    SearchInput.jsx       # pill input + inline ghost suggestion
    Suggestions.jsx       # autocomplete list
    ResultsPage.jsx       # /search?q=… results view with skeletons
  lib/
    suggestions.jsx       # live + local suggestion engine, greeting
    search.jsx            # DuckDuckGo + Wikipedia data sources
    location.jsx          # optional city detection
  App.jsx                 # tiny history-based router (home / results)
  main.jsx
  styles.css
```

## Data sources

| Source | Endpoint | CORS | Used for |
| --- | --- | --- | --- |
| DuckDuckGo Instant Answer | `api.duckduckgo.com` | `*` | Answer card, related searches |
| Wikipedia search | `en.wikipedia.org/w/api.php` | `*` | Article result rows |
| Google autocomplete | `suggestqueries.google.com` | JSONP | Typing suggestions |

DuckDuckGo's HTML endpoints (`html.` / `lite.`) answer `403` to any
programmatic request, so a real SERP cannot be scraped without a paid API key.
Anything the in-app page cannot answer links straight out to DuckDuckGo or Google.

## Deployment

Deployed to Vercel. `vercel.json` holds the SPA rewrite that serves
`/search?q=…` from `index.html`:

```bash
npm install
npm run build
vercel --prod
```

## Notes

The Safari browser bar is tinted to match the background via
`<meta name="theme-color" content="#000000">`, giving a seamless edge-to-edge look.
