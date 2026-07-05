# Triple Threat: Audio + Tournaments + Share Cards

**Status:** Design approved — awaiting implementation plan
**Date:** 2026-05-21

## Overview

Three features that compound: audio for immersion, tournaments for replayability, and shareable match cards for social growth. Each is independently shippable.

---

## Feature 1: Sound Effects & Audio System

### Architecture

A centralized `AudioManager` singleton — components never touch the Web Audio API directly.

```
app/features/audio/
├── audioManager.ts          # Singleton: play(), stop(), volume, mute
├── soundRegistry.ts         # Sound definitions keyed by event name
├── hooks/
│   └── useAudio.ts          # React hook: playSfx, playMusic, toggleMute, setVolume
└── assets/                  # .mp3 files, imported by Vite
```

### Sound Events

| Event                       | Trigger                    | Type            |
| --------------------------- | -------------------------- | --------------- |
| `card_deal`                 | Cards dealt to board       | SFX             |
| `card_flip`                 | Player reveals a card      | SFX             |
| `group_pick`                | Player selects a group     | SFX             |
| `duel_win`                  | Player wins                | SFX             |
| `duel_lose`                 | Player loses               | SFX             |
| `duel_tie`                  | Tiebreaker triggered       | SFX             |
| `powerup_activate`          | Any power-up used          | SFX             |
| `kill_streak_{3,4,5,6,7,8}` | Streak milestones          | SFX             |
| `round_start`               | New round begins           | SFX             |
| `game_start`                | Match begins               | Fanfare         |
| `game_over`                 | Match ends                 | Fanfare         |
| `bgm_{summer,xmas,jrpg}`    | Per-theme background music | Music (looping) |

### UX Requirements

- Mute toggle in corner, persisted to localStorage
- Separate volume sliders for SFX and BGM
- Audio preloads on game start — no latency
- Silent fallback if audio files can't load
- No audio on the landing page — only in-game

### Technical Approach

- **SFX**: Web Audio API (`AudioContext`) — low latency, overlapping sounds
- **BGM**: `<audio>` elements — easy looping, browser handles streaming
- The `audioManager.play(eventName)` is the only API components need

### Testing

- `audioManager` is a pure JS class — mock Web Audio API in Vitest
- `soundRegistry` tested for completeness (every game event maps to a sound)
- Component integration is manual browser verification only

---

## Feature 2: Tournament Mode

### Formats (MVP: Single Elimination only)

| Format             | Description                      | Phase    |
| ------------------ | -------------------------------- | -------- |
| Single Elimination | Classic bracket. Lose = out.     | MVP      |
| Double Elimination | Losers bracket. Second chance.   | Post-MVP |
| Best-of-N Series   | First to majority of 3/5/7 wins. | Post-MVP |

### Architecture

```
app/features/tournament/
├── types.ts                  # TournamentConfig, TournamentRound, TournamentSlot, Bracket
├── bracketEngine.ts          # Generate, advance, champion detection (pure functions)
├── bracketEngine.test.ts     # Unit tests
├── hooks/
│   └── useTournament.ts      # Tournament state (single-session, no persistence)
└── components/
    ├── TournamentSetup.tsx    # Format picker, team name entry, confirm
    ├── BracketView.tsx        # Visual bracket tree
    └── MatchSlot.tsx          # Single slot (names, score, click-to-play)
```

### Data Model

```ts
interface TournamentConfig {
  format: 'single-elim' | 'double-elim' | 'best-of';
  bestOfCount?: number; // 3 | 5 | 7
  teamNames: [string, string]; // always two teams
}

interface TournamentSlot {
  id: string;
  team1: string;
  team2: string;
  winner?: string;
  loser?: string;
  matchId?: string; // Supabase match ID after completion
}

interface Bracket {
  config: TournamentConfig;
  rounds: TournamentSlot[][]; // Each inner array is one round
  currentRound: number;
  champion?: string;
  isComplete: boolean;
}
```

### Flow

1. **Tournament Setup**: Pick format, name teams, confirm → generates bracket
2. **Bracket View**: Shows all slots. Current/next match is highlighted
3. **Click slot** → navigates to `/game?tournament=<id>&slot=<slotId>` with pre-filled team names
4. **Play match** — standard game loop, rosters auto-loaded
5. **Match ends** → save result, return to bracket view, advance winner
6. **Bracket resolves** → champion screen with full tournament recap

Key insight: **A tournament match IS a regular game**. The tournament layer just seeds teams, launches matches, and tracks results.

### State Management

- Tournament state lives in React state (no persistence — single-session use)
- URL search params carry tournament context: `?tournamentId=...&slotId=...`
- `useTournament` hook manages all bracket state and mutations

### Testing

- `bracketEngine.ts` — pure functions, all edge cases: single-elim advancement, best-of-N majority math, champion detection, bye handling
- Tournaments are always 2 teams per slot — no odd-team edge cases

---

## Feature 3: Shareable Match Result Cards

### Concept

After a match ends, render a stylized match report card image for download or social sharing.

### Card Layout

```
┌─────────────────────────────────────┐
│         ⚡ THOR'S 3KEY              │
│                                     │
│    TEAM AVENGERS  ── 5 ── 3    TEAM THANOS    │
│         🏆 WINNERS 🏆             │
│                                     │
│  MVP: Iron Man (3 kills, 0 deaths)  │
│                                     │
│  Power-Ups Used:                    │
│    ⚔ Second Chance x2              │
│    👁 Reveal Two x1                │
│                                     │
│  Duration: 12m 34s                 │
│  Date: May 21, 2026                │
│                                     │
│  [ Play at thors3key.app ]          │
└─────────────────────────────────────┘
```

### Architecture

```
app/features/share/
├── renderMatchCard.ts       # Pure function: matchData → canvas → PNG blob
└── components/
    └── MatchCardShare.tsx   # Modal overlay: preview + download + Twitter share
```

### Flow

1. Game ends → "Share Result" button on game-over screen
2. Click → `MatchCardShare` modal opens with canvas preview
3. Rendered entirely from existing game state — no API calls
4. Actions: **Download PNG** | **Share to Twitter** (intent URL, no backend)

### Data Sources

- Teams & score: from `gameState`
- MVP: highest `(kills - deaths)` from `duelEvents`. Tiebreaker: most kills, then first to reach the score
- Power-ups: from `powerUpsAllocation`
- Duration: from `gameState.startTime` to `Date.now()`

### Theming & Locale

- Card background uses active visual theme colors (Summer/Christmas/JRPG)
- Text labels follow current language (en/vi)
- Twitter share text is localized

### Testing

- Canvas rendering is manual verification only (canvas pixel testing is brittle)
- `renderMatchCard` tested for correct MVP calculation, power-up summary logic

---

## Constraints & Non-Goals

### Constraints

- All features work with the existing game engine — no engine refactors
- Audio is optional — game functions silently if audio fails to load
- Tournament matches use the existing `/game` route with query params
- Share cards render from existing match data structures

### Non-Goals (out of scope)

- Custom sound upload by users
- Online multiplayer / real-time spectator sync
- Tournament persistence across sessions
- Animated card flip effects (that's Approach C territory)
- Leaderboard ranking system beyond existing dashboard

---

## Ordering

Recommended build order for maximum momentum:

1. **Share Cards** (smallest, fastest win — ships in one session)
2. **Audio System** (medium, standalone — instant atmosphere boost)
3. **Tournament Mode** (largest, builds on existing game route)

Each is independently shippable. No ordering dependency between them.
