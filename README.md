# Thor's 3Key

Thor's 3Key is a Remix web game for chaotic two-team card duels. Players are loaded from Google Sheets, each team allocates limited power-ups, and every round resolves a head-to-head card choice with theme-specific visuals, localized UI, undo/redo support, and duel equity feedback.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Remix 2 with the Vite compiler
- **UI:** React 18, Remix routes, CSS in `app/app.css`
- **Language:** TypeScript
- **Testing:** Vitest
- **Linting and formatting:** ESLint, Prettier
- **Data source:** Google Sheets API via browser `fetch`
- **Assets:** Static card, power-up, theme, favicon, and PWA manifest files in `public/`

## Architecture

```text
app/
  root.tsx                    Remix document shell, metadata, env loader, providers
  routes/
    _index.tsx                Landing page and share entry point
    game.tsx                  Main game controller and route-level orchestration
    robots.txt.ts             SEO route
    sitemap.xml.ts            SEO route
  contexts/
    LanguageContext.tsx       English/Vietnamese translation state
    ThemeContext.tsx          Theme state and persistence
  components/                 Shared UI used across routes
  features/game/
    components/               Game-specific screens and display components
    engine/                   Pure game rules: duels, equity, power-ups, allocation
    services/                 External and asset services
    state/                    Initial state and undo/redo history stack
    types/                    Feature-level TypeScript types
  models/                     Core data shapes used by game state
  utils/                      Card utilities and reusable hooks
public/
  images/                     Card faces, backs, power-up icons, scene imagery
  manifest.webmanifest        PWA metadata
docs/
  superpowers/                Design specs and implementation plans
```

### Request and State Flow

```text
Browser
  -> Remix root loader
       exposes API_KEY, SITE_URL, analytics, and social metadata
  -> LanguageProvider + ThemeProvider
  -> /game route
       preloads card/theme assets
       loads team names from Google Sheets
       initializes team, duel, power-up, and history state
       renders setup, arena, or game-over screens
  -> game engines
       calculate legal selections, power-up effects, duel winners, and equity
  -> UI components
       render cards, rounds, announcements, modals, share controls, and themes
```

`app/routes/game.tsx` owns the high-level game lifecycle and React state transitions. The reusable rules live in `app/features/game/engine`, so the logic can be tested without rendering the route. Services isolate I/O concerns such as Google Sheets loading and image preloading, while `state` modules create initial domain data and manage undo/redo snapshots.

## Key Modules

- `app/features/game/engine/duelEngine.ts` handles side selection and duel data lookup.
- `app/features/game/engine/powerupEngine.ts` applies power-up behavior such as reveal, shield, second chance, and remove-worst logic.
- `app/features/game/engine/equityEngine.ts` estimates duel win rates from known and unknown cards.
- `app/features/game/state/historyStack.ts` stores undo/redo snapshots for in-progress games.
- `app/features/game/services/sheetService.ts` loads and shuffles team rosters from Google Sheets.
- `app/utils/gameUtil.ts` builds decks, shuffles, draws cards, compares hands, and resolves winners.
- `app/contexts/LanguageContext.tsx` and `app/locales/*.ts` provide English and Vietnamese text.
- `app/contexts/ThemeContext.tsx` drives visual theme selection and persistence.

## Environment

Create a local `.env` file when using Google Sheets or production metadata:

```sh
API_KEY=your_google_sheets_api_key
SITE_URL=http://localhost:5173
PLAUSIBLE_DOMAIN=
TWITTER_HANDLE=thor3key
```

`API_KEY` is read by the Remix root loader and passed to the game route through outlet context. The game route uses it to call the Google Sheets API with the configured sheet ID and range.

## Development

Install dependencies:

```sh
npm install
```

Start the Vite development server:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Run the production server:

```sh
npm start
```

Run checks:

```sh
npm run typecheck
npm run lint
npm test
```

If the default dev port is already in use:

```sh
npx kill-port 5173
```
