# Developer Notes - Thor's 3Key

## Tools & Services
- **Remix (Vite)**: Dev server on `http://localhost:5173`.
- **Supabase**: Remote database storing `matches` and `duel_events` tables.
- **Google Sheets API**: For loading player rosters.
- **Vitest**: Test framework.
- **TypeScript**: `tsc --noEmit` for type checking.

## Channels & Inputs
- **GitHub Issues**: Issue tracking and feature requests (`shoppinh/Thor-s-3Key`).
- **Google Sheet Links**: Pasted by users to load players.

## Conventions & Terminology
- **Duel**: A 1v1 card match (baccarat-style scoring of 3 cards).
- **Power-Ups**: Special abilities allocated per team (Second Chance, Reveal Two, Life Shield, Remove Worst).
- **Localization**: Bilingual support (English `en.ts` / Vietnamese `vi.ts`).
- **Dashboard**: UI showing player leaderboards, streaks, and match history.
