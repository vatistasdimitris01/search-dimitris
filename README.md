# Search — Dimitris

A minimal, premium dark search / new-tab interface built with **React + Vite**.
Type anything, get instant suggestions, press Enter and you're on Google.

![preview](https://begin-psi.vercel.app/favicon.svg)

## Features

- **Real Google search** — Enter, or click the black button. Navigates to
  `https://www.google.com/search?q=<encoded query>` in the same tab.
  Handles Unicode, Greek, and special characters.
- **Live suggestions** — Google autocomplete via JSONP
  (`suggestqueries.google.com/...&client=chrome`), with a local fallback list
  when the network blocks it.
- **Inline suggestion roll** — the rest of the top completion is shown as dimmed
  ghost text *inside* the input. Press **Tab** to accept it.
- **Slide-out search button** — the black button animates out from behind the
  search pill once you start typing.
- **Fading skeleton loader** — intentional, non-blocking shimmer while
  suggestions are generated.
- **Preferences popup** — gear icon top-left, with a "Hide search button" toggle
  persisted in `localStorage`.
- **Random greeting** — one of seven greetings on every page load.
- **Keyboard support** — `↑` `↓` to navigate, `Enter` to search, `Esc` to close,
  `Tab` to accept the inline suggestion.
- **Accessible** — semantic landmarks, ARIA combobox/listbox roles, visible focus
  rings, `prefers-reduced-motion` support.
- **Responsive** — scales from desktop down to mobile.

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Stack

- [React 19](https://react.dev)
- [Vite 8](https://vite.dev)
- Vanilla CSS with custom properties (no CSS framework)
- Inline SVG icons (no icon library)

## Project structure

```
src/
  components/
    SearchInterface.jsx   # state, keyboard nav, search redirect
    SearchInput.jsx       # pill input + inline ghost suggestion
    Suggestions.jsx       # autocomplete list
  lib/
    suggestions.jsx       # live + local suggestion engine, greeting
  App.jsx
  main.jsx
  styles.css
```

## Deployment

Deployed to Vercel:

```bash
npm install
npm run build
vercel --prod
```

## Notes

The Safari browser bar is tinted to match the background via
`<meta name="theme-color" content="#000000">`, giving a seamless edge-to-edge look.
