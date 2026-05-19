# ⚡ Thor's 3Key

**CHAOTIC TEAM CARD BATTLES // POWER-UPS // RNG GLORY**

Fast, silly, team-based card chaos. Load players from a Google Sheet, slam power-ups, and trash talk your way to victory.

---

## 🎮 What Is It?

Thor's 3Key is a browser-based party game where two teams face off in a series of 1v1 card duels. Each player draws 3 cards — the highest sum wins the round and eliminates the opponent. The last team standing takes the crown.

Simple to learn. Impossible to take seriously. Perfect for game night.

## ⚔️ How Duels Work

- Each player draws **3 cards** from a standard deck (values 1–9, four suits)
- Card sums use baccarat-style scoring: if the total exceeds 10, only the last digit counts (e.g. 7+5+8 = 20 → 0 → treated as 10)
- **4 card groups** are laid out each round — the first player picks one, then the opponent picks from what's left
- Tied? The highest card's suit breaks it: Diamonds > Hearts > Spades > Clubs
- **Lose a duel, you're eliminated** from your team. No mercy.

## 🛡️ Power-Ups (The Chaos Engine)

Each team gets **4 power-up slots** (max 2 of each type). Choose wisely — or let fate decide with random allocation.

| Power-Up          | What It Does                                                               | When to Use                              |
| ----------------- | -------------------------------------------------------------------------- | ---------------------------------------- |
| **Second Chance** | Force a re-duel if you lose. Total "we run it back" energy.                | When you're losing and need a do-over    |
| **Reveal Two**    | Peek at the first 2 cards in every group. Knowledge is power.              | When you want to make a smart pick       |
| **Life Shield**   | Survive elimination even if you lose. Immune to the ban hammer.            | When you can't afford to lose a teammate |
| **Remove Worst**  | Zap the weakest card group off the board. Fewer bad options = better odds. | When you want to tighten the field       |

Every power-up activation triggers a dramatic confirmation popup. No accidental button mashing here.

## 🏆 Win Streaks

String together kills and the game announces it to the room:

3 kills → **Killing Spree** // 4 → **Rampage** // 5 → **Unstoppable** // 6 → **Dominating** // 7 → **Godlike** // 8+ → **Legendary**

Get shut down? The game announces that too. Stay humble.

## 📊 Dashboard & Match History

Every completed match is saved with full duel-by-duel detail. The dashboard gives you:

- **Player Leaderboard** — who's actually carrying
- **Head-to-Head Records** — settle the debates
- **Team Streaks** — longest consecutive wins
- **Match Detail** — rosters, power-ups, scores, and full replay data

## 🎨 Three Visual Themes

Not feeling the vibe? Switch it up:

- **Summer** — Beach vibes with animated ocean waves, palm trees, and sunshine
- **Christmas** — Snowfall, festive card backs, and twinkling gold stars
- **JRPG** — Cyberpunk aesthetics with neon card backs and spinning power-up rings

## 🌍 Bilingual (EN / VI)

Full support for English and Vietnamese. The Vietnamese translations include playful slang and inside jokes — because "Second Chance" hitting different when it's called "Hải way xe".

## 🚀 Quick Start

### For Players

Just open the app, paste a Google Sheet link with your player names, and start dueling. No accounts, no downloads, no nonsense.

### For Developers

```sh
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build
npm run build

# Run in production mode
npm start

# Run tests
npm run test

# Kill a stuck dev server
npx kill-port 5173
```

### Environment Variables

| Variable            | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `API_KEY`           | Google Sheets API key (player roster loading)      |
| `SUPABASE_URL`      | Supabase project URL                               |
| `SUPABASE_ANON_KEY` | Supabase anon key                                  |
| `SITE_URL`          | Public site URL (default: `http://localhost:5173`) |
| `PLAUSIBLE_DOMAIN`  | Plausible analytics domain (optional)              |
| `TWITTER_HANDLE`    | Twitter handle for share buttons (optional)        |

See `docs/SUPABASE_SETUP_GUIDE.md` for database setup instructions.

## 🃏 Made For

- **Streamers** — Real-time win probability display adds hype to every card flip
- **Friend groups** — Load a roster from any Google Sheet and go
- **Office game nights** — The power-up system creates just enough strategy to keep things interesting
- **Anyone who enjoys watching their friends suffer a bad card draw**

## Tech Stack

Remix · React 18 · TypeScript · Supabase · Google Sheets API

---

_Deal the cards. Pick your group. Pray to RNG._ ⚡
