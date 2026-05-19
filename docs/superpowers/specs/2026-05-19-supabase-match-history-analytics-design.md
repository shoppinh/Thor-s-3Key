# Supabase Match History and Analytics Dashboard

## Summary

Add persistent match history using Supabase. The game records rich duel events locally during a match, saves one complete match record at game over, and exposes a separate `/dashboard` route for all-time leaderboards and insights.

## Key Changes

- Add Supabase client support with `@supabase/supabase-js@2`, using public URL and anon key from Remix loader/env.
- Add database tables for `matches` and `duel_events`:
  - `matches`: winner team, team rosters, final score, total duels, saved timestamp.
  - `duel_events`: match id, round, winner/loser names and teams, shielded flag, selected cards, selected sums, and power-ups used during the duel.
- Enable Supabase RLS:
  - anonymous clients can insert completed matches and duel events,
  - public clients can read dashboard data,
  - anonymous clients cannot update or delete saved records.
- During gameplay, keep current-match stats local and derive the in-match Stats tab from local duel events.
- At game over, save the completed match and duel events to Supabase.
- If saving fails, show a non-blocking game-over error with a retry action.
- Add `/dashboard` with:
  - all-time summary cards,
  - player leaderboard by duel wins,
  - team sequence/streak insights,
  - head-to-head defeat table,
  - recent saved matches.
- Add English and Vietnamese labels for new stats, dashboard, save status, and retry text.

## Test Plan

- Unit-test stats aggregation for leaderboard, head-to-head counts, team streaks, shielded duels, and empty states.
- Unit-test match payload creation from game state.
- Test save failure behavior with a mocked Supabase client.
- Update undo snapshot tests so local duel events restore with gameplay.
- Run `npm test` and `npm run typecheck`.

## Assumptions

- Historical data uses public player names.
- Matches are saved only at game over, not after every duel.
- V1 dashboard shows all-time and recent data only; date/player/team filters come later.
- Life Shield prevents elimination but still counts as a duel win/defeat.
- Supabase access follows official RLS guidance: browser anon key is acceptable only with restrictive database policies.

## References

- [Supabase JavaScript client](https://supabase.com/docs/reference/javascript/installing)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
