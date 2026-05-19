@RTK.md

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `shoppinh/Thor-s-3Key`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See `docs/agents/domain.md`.

## Commands

| Command                   | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `npm run dev`             | Start dev server on `http://localhost:5173`         |
| `npm run build`           | Production build → `build/server` + `build/client`  |
| `npm run test`            | Run all tests (Vitest, node env, `~` → `app` alias) |
| `npm run typecheck`       | `tsc --noEmit` (strict mode)                        |
| `npm run lint`            | ESLint with cache                                   |
| `npm run prettier-format` | Format `app/**/*.tsx` only                          |
| `npx kill-port 5173`      | Kill stuck dev server                               |

## Project

- **Stack**: Remix (Vite), React 18, TypeScript, Supabase
- **Path alias**: `~/` maps to `./app/` in both Vite and Vitest
- **Node**: >= 20.0.0
- **No CI workflows** — build/test locally before pushing

## Environment variables

Loaded via `root.tsx` loader and passed to client via `OutletContext`:

- `API_KEY` — Google Sheets API key (for loading player rosters)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — Supabase connection
- `SITE_URL`, `PLAUSIBLE_DOMAIN`, `TWITTER_HANDLE` — optional SEO/analytics

## Supabase

- MCP configured in `.opencode/opencode.json`
- Tables: `matches`, `duel_events`
- Migrations: apply with `supabase_apply_migration` tool
- Types: `app/features/dashboard/types.ts` is the source of truth

## Architecture

```
app/
├── routes/            # Remix routes (_index, game, dashboard)
├── components/          # Shared UI (ThemeSwitcher, ConfirmPopup, etc.)
├── contexts/            # LanguageContext, ThemeContext
├── features/
│   ├── game/            # Duel engine, power-up logic, game screens
│   └── dashboard/       # Analytics, match saving, match history UI
├── locales/             # en.ts, vi.ts
├── lib/                 # Supabase client
└── models/              # Card, DuelData, TeamData, PlayerData
```

## Conventions

- **Prettier**: `semi: true`, `trailingComma: none`, `singleQuote: true`, `printWidth: 80`
- **Language strings**: Add keys to both `en.ts` and `vi.ts`
- **Game types**: `app/features/game/types/gameTypes.ts` defines `TeamName`, `Side`, `GameState`, `PowerUpsAllocation`
- **DB schema changes**: Update `app/features/dashboard/types.ts` Insert/Update/Row types _before_ applying migration

## Testing

- Vitest, `environment: 'node'`
- To run a single test file: `npx vitest run <path>`
- Alias `~` is mapped to `app/` in `vitest.config.ts`
