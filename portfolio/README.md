# Priyanshu — Portfolio

A personal portfolio built with plain **HTML, CSS, and JavaScript** — no framework, no build step.
Dark/light themes, scroll animations, a command palette, and a custom cursor glow.

## Run it

Just open `index.html` in a browser. Or serve it locally:

```bash
# from this folder
npx serve .
# or
python -m http.server 5173
```

Then visit the printed URL (usually http://localhost:5173).

## Deploy it

**GitHub Pages (recommended)**

1. Create a new public repo, e.g. `portfolio`.
2. Push the three files (`index.html`, `styles.css`, `script.js`).
3. Repo → **Settings → Pages → Source: Deploy from a branch → `main` / root**.
4. Your site goes live at `https://py43-cmd.github.io/portfolio/`.

> Want it at `https://py43-cmd.github.io`? Name the repo `py43-cmd.github.io`.

**Netlify / Vercel:** drag the folder in, or import the repo. There is nothing to build.

## Customize

| What | Where |
| --- | --- |
| Name, bio, role list | `index.html` (hero section) |
| Email | search for `py431035@gmail.com` in `index.html` and `script.js` |
| GitHub / LinkedIn links | `index.html` (nav, hero, contact) |
| Projects + links | `index.html` → `#work` section |
| Skills | `index.html` → `#stack` section |
| Colors | `styles.css` → `:root` and `[data-theme="light"]` |
| Role rotation words | `script.js` → `roles` array |

## Features

- **Command palette** — press `Ctrl`/`⌘` + `K` to jump anywhere
- **Dark / light theme** with persistence via `localStorage`
- **Scroll reveals**, animated marquee, floating chips, cursor spotlight
- **Project cards** with mouse-following glow
- **Copy email** button with toast feedback
- Fully responsive, keyboard accessible, respects `prefers-reduced-motion`
- Zero dependencies — only Google Fonts is loaded externally

## Files

```
portfolio/
├── index.html   # markup + content
├── styles.css   # design system, layout, animations
├── script.js    # theme, palette, reveals, interactions
└── README.md
```
