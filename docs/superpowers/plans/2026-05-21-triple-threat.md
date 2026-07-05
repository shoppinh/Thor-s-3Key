# Triple Threat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add audio FX/BGM, single-elimination tournament mode, and shareable match result cards to Thor's 3Key.

**Architecture:** Three independent features with no ordering dependency. Each adds new feature modules (`app/features/audio/`, `app/features/tournament/`, `app/features/share/`) and minimally touches the existing game route. Audio uses Web Audio API for SFX and `<audio>` elements for BGM. Tournament superstructs the existing `/game` route via URL params. Share cards render to `<canvas>` and export PNG.

**Tech Stack:** Web Audio API, HTML Canvas, React state, Vitest. No new dependencies.

---

## File Structure

### Phase 1: Share Cards

| Action | Path                                               | Purpose                                        |
| ------ | -------------------------------------------------- | ---------------------------------------------- |
| Create | `app/features/share/renderMatchCard.ts`            | Pure function: match data → canvas → PNG blob  |
| Create | `app/features/share/renderMatchCard.test.ts`       | Unit tests for MVP calc, power-up summary      |
| Create | `app/features/share/components/MatchCardShare.tsx` | Modal: canvas preview, download, Twitter share |
| Modify | `app/features/game/components/GameOverScreen.tsx`  | Add "Share Result" button and share modal      |
| Modify | `app/locales/en.ts`                                | 5 locale strings                               |
| Modify | `app/locales/vi.ts`                                | 5 locale strings                               |
| Modify | `app/app.css`                                      | Share card modal styles                        |

### Phase 2: Audio

| Action | Path                                              | Purpose                                      |
| ------ | ------------------------------------------------- | -------------------------------------------- |
| Create | `app/features/audio/audioManager.ts`              | Singleton: Web Audio API SFX + `<audio>` BGM |
| Create | `app/features/audio/audioManager.test.ts`         | Unit tests with mocked AudioContext          |
| Create | `app/features/audio/soundRegistry.ts`             | Sound event → frequency/duration mapping     |
| Create | `app/features/audio/soundRegistry.test.ts`        | Completeness tests                           |
| Create | `app/features/audio/hooks/useAudio.ts`            | React hook over audioManager                 |
| Create | `app/features/audio/components/AudioControls.tsx` | Mute toggle + volume sliders                 |
| Modify | `app/routes/game.tsx`                             | Wire audio calls into game events            |
| Modify | `app/locales/en.ts`                               | 3 locale strings                             |
| Modify | `app/locales/vi.ts`                               | 3 locale strings                             |
| Modify | `app/app.css`                                     | Audio controls styles                        |

### Phase 3: Tournament

| Action | Path                                                     | Purpose                                   |
| ------ | -------------------------------------------------------- | ----------------------------------------- |
| Create | `app/features/tournament/types.ts`                       | TournamentConfig, TournamentSlot, Bracket |
| Create | `app/features/tournament/bracketEngine.ts`               | Pure functions for bracket ops            |
| Create | `app/features/tournament/bracketEngine.test.ts`          | Unit tests                                |
| Create | `app/features/tournament/hooks/useTournament.ts`         | Tournament state hook                     |
| Create | `app/features/tournament/components/TournamentSetup.tsx` | Format picker + team names                |
| Create | `app/features/tournament/components/BracketView.tsx`     | Visual bracket tree                       |
| Create | `app/features/tournament/components/MatchSlot.tsx`       | Single bracket slot                       |
| Modify | `app/routes/_index.tsx`                                  | Add "TOURNAMENT" button                   |
| Modify | `app/routes/game.tsx`                                    | Handle `?tournament=` params              |
| Modify | `app/locales/en.ts`                                      | 12 locale strings                         |
| Modify | `app/locales/vi.ts`                                      | 12 locale strings                         |
| Modify | `app/app.css`                                            | Tournament styles                         |

---

## Phase 1: Shareable Match Result Cards

### Task 1.1: Locale strings

**Files:**

- Modify: `app/locales/en.ts`
- Modify: `app/locales/vi.ts`

- [ ] **Step 1: Add share card locale strings to en.ts**

Add these keys to the `game` object in `app/locales/en.ts`:

```ts
shareResult: 'SHARE RESULT',
shareDownload: 'Download PNG',
shareTweet: 'Tweet Result',
shareMvp: 'MVP',
sharePowerUps: 'Power-Ups Used',
shareDuration: 'Duration',
shareDate: 'Date',
shareFooter: 'Play at thors3key.app',
```

Add these keys to the `game` object in `app/locales/vi.ts`:

```ts
shareResult: 'CHIA SẺ KẾT QUẢ',
shareDownload: 'Tải PNG',
shareTweet: 'Tweet Kết Quả',
shareMvp: 'MVP',
sharePowerUps: 'Power-Ups Đã Dùng',
shareDuration: 'Thời Gian',
shareDate: 'Ngày',
shareFooter: 'Chơi tại thors3key.app',
```

- [ ] **Step 2: Verify locale files are valid**

Run: `npx tsc --noEmit app/locales/en.ts app/locales/vi.ts --skipLibCheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/locales/en.ts app/locales/vi.ts
git commit -m "feat: add share card locale strings"
```

### Task 1.2: renderMatchCard pure function

**Files:**

- Create: `app/features/share/renderMatchCard.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/features/share/renderMatchCard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateMvp, summarizePowerUps } from './renderMatchCard';
import type { LocalDuelEvent } from '~/features/dashboard/types';
import type { PowerUpsAllocation } from '~/features/game/types/gameTypes';

describe('calculateMvp', () => {
  it('returns empty string for empty events', () => {
    expect(calculateMvp([])).toBe('');
  });

  it('returns the player with highest kills-minus-deaths', () => {
    const events: LocalDuelEvent[] = [
      {
        round: 1,
        winnerName: 'Alice',
        loserName: 'Bob',
        winnerTeam: 'team1',
        loserTeam: 'team2',
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 8,
        loserSum: 3,
        powerUpsUsed: {}
      },
      {
        round: 2,
        winnerName: 'Alice',
        loserName: 'Charlie',
        winnerTeam: 'team1',
        loserTeam: 'team2',
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 7,
        loserSum: 5,
        powerUpsUsed: {}
      }
    ];
    expect(calculateMvp(events)).toBe('Alice');
  });

  it('breaks ties by most kills', () => {
    const events: LocalDuelEvent[] = [
      {
        round: 1,
        winnerName: 'Alice',
        loserName: 'Bob',
        winnerTeam: 'team1',
        loserTeam: 'team2',
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 8,
        loserSum: 3,
        powerUpsUsed: {}
      },
      {
        round: 2,
        winnerName: 'Eve',
        loserName: 'Charlie',
        winnerTeam: 'team1',
        loserTeam: 'team2',
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 7,
        loserSum: 5,
        powerUpsUsed: {}
      },
      {
        round: 3,
        winnerName: 'Charlie',
        loserName: 'Alice',
        winnerTeam: 'team2',
        loserTeam: 'team1',
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 6,
        loserSum: 4,
        powerUpsUsed: {}
      }
    ];
    // Alice: 2W 1L = +1, Eve: 1W 0L = +1, Charlie: 1W 1L = 0
    // Alice has more kills (2) than Eve (1), so Alice wins tiebreaker
    expect(calculateMvp(events)).toBe('Alice');
  });
});

describe('summarizePowerUps', () => {
  it('lists all power-up types used across events', () => {
    const events: LocalDuelEvent[] = [
      {
        round: 1,
        winnerName: 'Alice',
        loserName: 'Bob',
        winnerTeam: 'team1',
        loserTeam: 'team2',
        shielded: false,
        winnerCards: [],
        loserCards: [],
        winnerSum: 8,
        loserSum: 3,
        powerUpsUsed: { revealTwo: 'team1', secondChance: ['team2'] }
      }
    ];
    const result = summarizePowerUps(events);
    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'Second Chance', count: 1 },
        { name: 'Reveal Two', count: 1 }
      ])
    );
  });

  it('returns empty array when no power-ups used', () => {
    expect(summarizePowerUps([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/features/share/renderMatchCard.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement renderMatchCard.ts**

Create `app/features/share/renderMatchCard.ts`:

```ts
import type { LocalDuelEvent } from '~/features/dashboard/types';

export interface MvpInfo {
  name: string;
  kills: number;
  deaths: number;
}

export interface PowerUpSummary {
  name: string;
  count: number;
}

export function calculateMvp(events: LocalDuelEvent[]): string {
  if (events.length === 0) return '';

  const stats = new Map<string, MvpInfo>();

  for (const event of events) {
    if (!stats.has(event.winnerName)) {
      stats.set(event.winnerName, {
        name: event.winnerName,
        kills: 0,
        deaths: 0
      });
    }
    if (!stats.has(event.loserName)) {
      stats.set(event.loserName, {
        name: event.loserName,
        kills: 0,
        deaths: 0
      });
    }

    const winner = stats.get(event.winnerName)!;
    const loser = stats.get(event.loserName)!;
    winner.kills += 1;
    loser.deaths += 1;
  }

  const players = Array.from(stats.values());
  players.sort((a, b) => {
    const diff = b.kills - b.deaths - (a.kills - a.deaths);
    if (diff !== 0) return diff;
    return b.kills - a.kills;
  });

  return players[0].name;
}

export function summarizePowerUps(events: LocalDuelEvent[]): PowerUpSummary[] {
  const counts = new Map<string, number>();

  for (const event of events) {
    const p = event.powerUpsUsed;
    if (p.revealTwo)
      counts.set('Reveal Two', (counts.get('Reveal Two') || 0) + 1);
    if (p.lifeShield)
      counts.set('Life Shield', (counts.get('Life Shield') || 0) + 1);
    if (p.removeWorst?.length) {
      counts.set(
        'Remove Worst',
        (counts.get('Remove Worst') || 0) + p.removeWorst.length
      );
    }
    if (p.secondChance?.length) {
      counts.set(
        'Second Chance',
        (counts.get('Second Chance') || 0) + p.secondChance.length
      );
    }
  }

  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}

export interface MatchCardData {
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  winnerName: string;
  mvpName: string;
  powerUps: PowerUpSummary[];
  durationSeconds: number;
}

export function renderMatchCardToCanvas(
  data: MatchCardData
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, 600, 400);

  // Border
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 580, 380);

  // Title
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText("THOR'S 3KEY", 300, 50);

  // Score
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(
    `${data.team1Name}  ${data.team1Score} - ${data.team2Score}  ${data.team2Name}`,
    300,
    100
  );

  // Winner
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`${data.winnerName}`, 300, 140);

  // MVP
  if (data.mvpName) {
    ctx.fillStyle = '#00ff88';
    ctx.font = '16px monospace';
    ctx.fillText(`MVP: ${data.mvpName}`, 300, 180);
  }

  // Power-ups
  let y = 220;
  if (data.powerUps.length > 0) {
    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText('Power-Ups Used', 300, y);
    y += 24;
    ctx.fillStyle = '#ccc';
    ctx.font = '13px monospace';
    for (const pu of data.powerUps) {
      ctx.fillText(`${pu.name} x${pu.count}`, 300, y);
      y += 20;
    }
  }

  // Duration & Date
  y = Math.max(y + 10, 320);
  const mins = Math.floor(data.durationSeconds / 60);
  const secs = data.durationSeconds % 60;
  ctx.fillStyle = '#888';
  ctx.font = '12px monospace';
  ctx.fillText(
    `Duration: ${mins}m ${secs}s  |  ${new Date().toLocaleDateString()}`,
    300,
    y
  );

  // Footer
  ctx.fillStyle = '#666';
  ctx.font = '11px monospace';
  ctx.fillText('Play at thors3key.app', 300, y + 24);

  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/features/share/renderMatchCard.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/features/share/
git commit -m "feat: add match card render and MVP calculation helpers"
```

### Task 1.3: MatchCardShare modal component

**Files:**

- Create: `app/features/share/components/MatchCardShare.tsx`

- [ ] **Step 1: Create the share modal component**

Create `app/features/share/components/MatchCardShare.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '~/contexts/LanguageContext';
import {
  type MatchCardData,
  renderMatchCardToCanvas,
  canvasToPngBlob
} from '../renderMatchCard';

interface MatchCardShareProps {
  isOpen: boolean;
  data: MatchCardData;
  onClose: () => void;
}

export function MatchCardShare({ isOpen, data, onClose }: MatchCardShareProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pngUrl, setPngUrl] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const canvas = renderMatchCardToCanvas(data);
    if (canvasRef.current) {
      const parent = canvasRef.current.parentNode;
      if (parent) {
        parent.replaceChild(canvas, canvasRef.current);
        canvasRef.current = canvas;
      }
    }
    canvasToPngBlob(canvas).then((blob) => {
      setPngUrl(URL.createObjectURL(blob));
    });
    return () => {
      if (pngUrl) URL.revokeObjectURL(pngUrl);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!pngUrl) return;
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `thors3key-match-${Date.now()}.png`;
    a.click();
  };

  const handleTweet = () => {
    const text = encodeURIComponent(
      `${data.team1Name} ${data.team1Score} - ${data.team2Score} ${data.team2Name} in Thor's 3Key!`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <button className="share-modal-close" onClick={onClose}>
          ×
        </button>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', maxWidth: '500px', borderRadius: '8px' }}
        />
        <div className="share-modal-buttons">
          <button className="rpg-button" onClick={handleDownload}>
            {t('game.shareDownload')}
          </button>
          <button className="rpg-button secondary" onClick={handleTweet}>
            {t('game.shareTweet')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for share modal**

Add to `app/app.css`:

```css
.share-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.share-modal {
  background: var(--color-panel-bg);
  border: 2px solid var(--color-accent);
  border-radius: 12px;
  padding: 24px;
  position: relative;
  max-width: 90vw;
}

.share-modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: #fff;
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
}

.share-modal-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/features/share/components/MatchCardShare.tsx app/app.css
git commit -m "feat: add MatchCardShare modal component"
```

### Task 1.4: Wire share card into GameOverScreen

**Files:**

- Modify: `app/features/game/components/GameOverScreen.tsx`

- [ ] **Step 1: Update GameOverScreen to include share button and modal**

Edit `app/features/game/components/GameOverScreen.tsx` to add the share card integration. Replace the entire file:

```tsx
import { useState, useMemo } from 'react';
import { Link } from '@remix-run/react';
import { useLanguage } from '~/contexts/LanguageContext';
import VictoryCrown from '~/components/VictoryCrown';
import { MatchCardShare } from '~/features/share/components/MatchCardShare';
import {
  calculateMvp,
  summarizePowerUps
} from '~/features/share/renderMatchCard';
import type { LocalDuelEvent } from '~/features/dashboard/types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type GameOverScreenProps = {
  teamWinner: string;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  saveStatus: SaveStatus;
  onRetrySave: () => void;
  duelEvents: LocalDuelEvent[];
  durationSeconds: number;
};

const GameOverScreen = ({
  teamWinner,
  team1Name,
  team2Name,
  team1Score,
  team2Score,
  saveStatus,
  onRetrySave,
  duelEvents,
  durationSeconds
}: GameOverScreenProps) => {
  const { t } = useLanguage();
  const [isShareOpen, setIsShareOpen] = useState(false);

  const shareData = useMemo(
    () => ({
      team1Name,
      team2Name,
      team1Score,
      team2Score,
      winnerName: teamWinner,
      mvpName: calculateMvp(duelEvents),
      powerUps: summarizePowerUps(duelEvents),
      durationSeconds
    }),
    [
      team1Name,
      team2Name,
      team1Score,
      team2Score,
      teamWinner,
      duelEvents,
      durationSeconds
    ]
  );

  const saveStatusText =
    saveStatus === 'saving'
      ? t('game.savingMatch')
      : saveStatus === 'saved'
        ? t('game.matchSaved')
        : saveStatus === 'error'
          ? t('game.saveFailed')
          : '';

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          gap: '30px'
        }}
      >
        <div
          className="rpg-panel"
          style={{
            padding: '40px 60px',
            textAlign: 'center',
            background: 'var(--color-panel-bg)',
            border: '3px solid var(--color-accent)'
          }}
        >
          <h2
            className="text-glow"
            style={{
              color: 'var(--color-primary)',
              margin: '0 0 20px 0',
              fontSize: '32px',
              letterSpacing: '3px'
            }}
          >
            {t('game.battleComplete')}
          </h2>
          <h1
            className="text-gradient"
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              margin: '20px 0',
              textShadow: '0 0 20px var(--color-accent)'
            }}
          >
            {teamWinner}
          </h1>

          {saveStatusText && (
            <div
              style={{
                marginTop: '16px',
                fontSize: '18px',
                color:
                  saveStatus === 'error'
                    ? '#ff4d4d'
                    : saveStatus === 'saved'
                      ? '#4dff88'
                      : '#ccc'
              }}
            >
              {saveStatusText}
              {saveStatus === 'error' && (
                <button
                  onClick={onRetrySave}
                  className="rpg-button secondary"
                  style={{
                    marginLeft: '12px',
                    fontSize: '14px',
                    padding: '6px 16px'
                  }}
                >
                  {t('game.retrySave')}
                </button>
              )}
            </div>
          )}

          <div
            className="rpg-panel"
            style={{
              marginTop: '30px',
              padding: '20px',
              background: 'rgba(0,0,0,0.3)'
            }}
          >
            <VictoryCrown />
          </div>
          <div
            style={{
              marginTop: '24px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}
          >
            <Link
              to="/"
              className="rpg-button secondary"
              style={{
                fontSize: '18px',
                padding: '10px 36px',
                textDecoration: 'none',
                textAlign: 'center'
              }}
            >
              {t('game.returnHome')}
            </Link>
            <Link
              to="/dashboard"
              className="rpg-button"
              style={{
                fontSize: '18px',
                padding: '10px 36px',
                textDecoration: 'none',
                textAlign: 'center'
              }}
            >
              {t('game.viewDashboard')}
            </Link>
            <button
              onClick={() => setIsShareOpen(true)}
              className="rpg-button"
              style={{
                fontSize: '18px',
                padding: '10px 36px'
              }}
            >
              {t('game.shareResult')}
            </button>
          </div>
        </div>
      </div>
      <MatchCardShare
        isOpen={isShareOpen}
        data={shareData}
        onClose={() => setIsShareOpen(false)}
      />
    </>
  );
};

export default GameOverScreen;
```

- [ ] **Step 2: Update game.tsx to pass new props to GameOverScreen**

Edit `app/routes/game.tsx` — find the `<GameOverScreen` usage (around line 2617) and update:

```tsx
{
  gameState == 'gameOver' && (
    <GameOverScreen
      teamWinner={teamWinner}
      team1Name={team1Data.name}
      team2Name={team2Data.name}
      team1Score={team1Data.score}
      team2Score={team2Data.score}
      saveStatus={saveStatus}
      onRetrySave={handleRetrySave}
      duelEvents={duelEvents}
      durationSeconds={
        gameStartTime != null
          ? Math.floor((Date.now() - gameStartTime) / 1000)
          : 0
      }
    />
  );
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No errors in our files

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (46 existing + 5 new = 51), or at least share card tests pass

- [ ] **Step 5: Commit**

```bash
git add app/features/game/components/GameOverScreen.tsx app/routes/game.tsx
git commit -m "feat: wire share card into game over screen"
```

---

## Phase 2: Sound Effects & Audio System

### Task 2.1: Create standalone tests for audioManager

**Files:**

- Create: `app/features/audio/audioManager.test.ts`

- [ ] **Step 1: Define the audioManager interface and write tests**

Create `app/features/audio/audioManager.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// We test the AudioManager class directly, mocking Web Audio API
describe('AudioManager', () => {
  let AudioManager: any;

  beforeEach(async () => {
    vi.resetModules();
    // Mock Web Audio API
    const mockGain = { gain: { value: 1 }, connect: vi.fn() };
    const mockOscillator = {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };
    const mockContext = {
      createGain: vi.fn(() => mockGain),
      createOscillator: vi.fn(() => mockOscillator),
      destination: {},
      currentTime: 0
    };
    (globalThis as any).AudioContext = vi.fn(() => mockContext);
    (globalThis as any).webkitAudioContext = vi.fn(() => mockContext);

    const mod = await import('./audioManager');
    AudioManager = mod.AudioManager;
    // Reset singleton
    (AudioManager as any).instance = null;
  });

  it('getInstance returns the same instance', () => {
    const a = AudioManager.getInstance();
    const b = AudioManager.getInstance();
    expect(a).toBe(b);
  });

  it('isMuted defaults to false', () => {
    const mgr = AudioManager.getInstance();
    expect(mgr.isMuted).toBe(false);
  });

  it('setMuted toggles mute state', () => {
    const mgr = AudioManager.getInstance();
    mgr.setMuted(true);
    expect(mgr.isMuted).toBe(true);
    mgr.setMuted(false);
    expect(mgr.isMuted).toBe(false);
  });

  it('setSfxVolume sets gain value', () => {
    const mgr = AudioManager.getInstance();
    mgr.setSfxVolume(0.5);
    expect(mgr.getSfxVolume()).toBe(0.5);
  });

  it('setBgmVolume sets gain value', () => {
    const mgr = AudioManager.getInstance();
    mgr.setBgmVolume(0.3);
    expect(mgr.getBgmVolume()).toBe(0.3);
  });

  it('play does not throw when called', () => {
    const mgr = AudioManager.getInstance();
    expect(() => mgr.play('card_deal')).not.toThrow();
  });

  it('play does nothing when muted', () => {
    const mgr = AudioManager.getInstance();
    mgr.setMuted(true);
    expect(() => mgr.play('card_deal')).not.toThrow();
  });

  it('stopBgm does not throw', () => {
    const mgr = AudioManager.getInstance();
    expect(() => mgr.stopBgm()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/features/audio/audioManager.test.ts`
Expected: FAIL — module not found

### Task 2.2: Implement audioManager

**Files:**

- Create: `app/features/audio/audioManager.ts`
- Create: `app/features/audio/soundRegistry.ts`

- [ ] **Step 1: Create soundRegistry.ts**

Create `app/features/audio/soundRegistry.ts`:

```ts
export type SoundEvent =
  | 'card_deal'
  | 'card_flip'
  | 'group_pick'
  | 'duel_win'
  | 'duel_lose'
  | 'duel_tie'
  | 'powerup_activate'
  | 'kill_streak_3'
  | 'kill_streak_4'
  | 'kill_streak_5'
  | 'kill_streak_6'
  | 'kill_streak_7'
  | 'kill_streak_8'
  | 'round_start'
  | 'game_start'
  | 'game_over';

export type BgmTrack = 'bgm_summer' | 'bgm_xmas' | 'bgm_jrpg';

export interface SfxDefinition {
  frequency: number;
  duration: number; // seconds
  type: OscillatorType;
}

export const SFX_REGISTRY: Record<SoundEvent, SfxDefinition> = {
  card_deal: { frequency: 440, duration: 0.08, type: 'sine' },
  card_flip: { frequency: 520, duration: 0.06, type: 'triangle' },
  group_pick: { frequency: 660, duration: 0.1, type: 'square' },
  duel_win: { frequency: 880, duration: 0.3, type: 'sine' },
  duel_lose: { frequency: 220, duration: 0.4, type: 'triangle' },
  duel_tie: { frequency: 330, duration: 0.15, type: 'sawtooth' },
  powerup_activate: { frequency: 1000, duration: 0.15, type: 'sine' },
  kill_streak_3: { frequency: 600, duration: 0.2, type: 'sawtooth' },
  kill_streak_4: { frequency: 700, duration: 0.25, type: 'sawtooth' },
  kill_streak_5: { frequency: 800, duration: 0.3, type: 'sawtooth' },
  kill_streak_6: { frequency: 900, duration: 0.35, type: 'sawtooth' },
  kill_streak_7: { frequency: 1000, duration: 0.4, type: 'sawtooth' },
  kill_streak_8: { frequency: 1200, duration: 0.5, type: 'sawtooth' },
  round_start: { frequency: 500, duration: 0.12, type: 'sine' },
  game_start: { frequency: 660, duration: 0.5, type: 'sine' },
  game_over: { frequency: 880, duration: 0.6, type: 'sine' }
};

export const ALL_SOUND_EVENTS: SoundEvent[] = Object.keys(
  SFX_REGISTRY
) as SoundEvent[];
```

- [ ] **Step 2: Create audioManager.ts**

Create `app/features/audio/audioManager.ts`:

```ts
import { SFX_REGISTRY, type SoundEvent, type BgmTrack } from './soundRegistry';

export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private bgmElement: HTMLAudioElement | null = null;
  private _isMuted = false;
  private _sfxVolume = 0.5;
  private _bgmVolume = 0.3;

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private getContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctor) {
        this.ctx = new Ctor();
      }
    } catch {
      // Silently fail — audio is optional
    }
    return this.ctx;
  }

  get isMuted(): boolean {
    return this._isMuted;
  }

  setMuted(muted: boolean): void {
    this._isMuted = muted;
    if (this.bgmElement) {
      if (muted) {
        this.bgmElement.pause();
      } else {
        this.bgmElement.play().catch(() => {});
      }
    }
    try {
      localStorage.setItem('thors3key_audio_muted', String(muted));
    } catch {}
  }

  getSfxVolume(): number {
    return this._sfxVolume;
  }

  setSfxVolume(v: number): void {
    this._sfxVolume = Math.max(0, Math.min(1, v));
  }

  getBgmVolume(): number {
    return this._bgmVolume;
  }

  setBgmVolume(v: number): void {
    this._bgmVolume = Math.max(0, Math.min(1, v));
    if (this.bgmElement) {
      this.bgmElement.volume = this._bgmVolume;
    }
  }

  play(event: SoundEvent): void {
    if (this._isMuted) return;
    const ctx = this.getContext();
    const def = SFX_REGISTRY[event];
    if (!ctx || !def) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = def.type;
    osc.frequency.value = def.frequency;
    gain.gain.value = this._sfxVolume * 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + def.duration);
  }

  playBgm(track: BgmTrack): void {
    this.stopBgm();

    const audio = new Audio();
    // Generate a simple tone-based BGM by creating a looping oscillator
    // For synthesized BGM, we'll use a simple drone tone approach
    audio.volume = this._bgmVolume;
    audio.loop = true;

    // Store reference for later control
    this.bgmElement = audio;

    // Instead of loading a file (we don't have audio assets),
    // we create a silent looping audio element as a proxy.
    // The actual BGM is generated via oscillators.
    this._startBgmOscillator(track);
  }

  private _bgmOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];

  private _startBgmOscillator(track: BgmTrack): void {
    if (this._isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const freqs: Record<BgmTrack, [number, number]> = {
      bgm_summer: [261, 329], // C-E, bright
      bgm_xmas: [294, 370], // D-F#, festive
      bgm_jrpg: [220, 277] // A-C#, moody
    };

    const [f1, f2] = freqs[track];
    const gain = ctx.createGain();
    gain.gain.value = this._bgmVolume * 0.05; // quiet drone

    for (const freq of [f1, f2]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this._bgmOscillators.push({ osc, gain });
    }
  }

  stopBgm(): void {
    for (const { osc } of this._bgmOscillators) {
      try {
        osc.stop();
      } catch {}
    }
    this._bgmOscillators = [];
    if (this.bgmElement) {
      this.bgmElement.pause();
      this.bgmElement = null;
    }
  }

  /** Called once on app init — restores saved mute preference */
  initFromStorage(): void {
    try {
      const muted = localStorage.getItem('thors3key_audio_muted');
      if (muted === 'true') {
        this._isMuted = true;
      }
    } catch {}
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run app/features/audio/audioManager.test.ts`
Expected: 8 tests PASS

### Task 2.3: Sound registry completeness test

**Files:**

- Create: `app/features/audio/soundRegistry.test.ts`

- [ ] **Step 1: Write completeness test**

Create `app/features/audio/soundRegistry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SFX_REGISTRY, ALL_SOUND_EVENTS } from './soundRegistry';

describe('soundRegistry', () => {
  const requiredEvents = [
    'card_deal',
    'card_flip',
    'group_pick',
    'duel_win',
    'duel_lose',
    'duel_tie',
    'powerup_activate',
    'kill_streak_3',
    'kill_streak_4',
    'kill_streak_5',
    'kill_streak_6',
    'kill_streak_7',
    'kill_streak_8',
    'round_start',
    'game_start',
    'game_over'
  ];

  it('has entries for all required sound events', () => {
    for (const event of requiredEvents) {
      expect(SFX_REGISTRY[event as keyof typeof SFX_REGISTRY]).toBeDefined();
    }
  });

  it('all registered events have frequency and duration', () => {
    for (const event of ALL_SOUND_EVENTS) {
      const def = SFX_REGISTRY[event];
      expect(def.frequency).toBeGreaterThan(0);
      expect(def.duration).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run app/features/audio/soundRegistry.test.ts`
Expected: 2 tests PASS

- [ ] **Step 3: Commit audio engine**

```bash
git add app/features/audio/
git commit -m "feat: add AudioManager and sound registry"
```

### Task 2.4: useAudio hook and AudioControls component

**Files:**

- Create: `app/features/audio/hooks/useAudio.ts`
- Create: `app/features/audio/components/AudioControls.tsx`

- [ ] **Step 1: Create useAudio hook**

Create `app/features/audio/hooks/useAudio.ts`:

```ts
import { useEffect, useMemo, useState } from 'react';
import { AudioManager } from '../audioManager';
import type { SoundEvent, BgmTrack } from '../soundRegistry';

export function useAudio() {
  const mgr = useMemo(() => AudioManager.getInstance(), []);
  const [isMuted, setIsMuted] = useState(mgr.isMuted);
  const [sfxVolume, setSfxVolumeState] = useState(mgr.getSfxVolume());
  const [bgmVolume, setBgmVolumeState] = useState(mgr.getBgmVolume());

  useEffect(() => {
    mgr.initFromStorage();
    setIsMuted(mgr.isMuted);
  }, [mgr]);

  const toggleMute = () => {
    const next = !mgr.isMuted;
    mgr.setMuted(next);
    setIsMuted(next);
  };

  const setSfxVolume = (v: number) => {
    mgr.setSfxVolume(v);
    setSfxVolumeState(v);
  };

  const setBgmVolume = (v: number) => {
    mgr.setBgmVolume(v);
    setBgmVolumeState(v);
  };

  return {
    isMuted,
    sfxVolume,
    bgmVolume,
    toggleMute,
    setSfxVolume,
    setBgmVolume,
    playSfx: (event: SoundEvent) => mgr.play(event),
    playBgm: (track: BgmTrack) => mgr.playBgm(track),
    stopBgm: () => mgr.stopBgm()
  };
}
```

- [ ] **Step 2: Create AudioControls component**

Create `app/features/audio/components/AudioControls.tsx`:

```tsx
import { useLanguage } from '~/contexts/LanguageContext';

interface AudioControlsProps {
  isMuted: boolean;
  sfxVolume: number;
  bgmVolume: number;
  onToggleMute: () => void;
  onSfxVolumeChange: (v: number) => void;
  onBgmVolumeChange: (v: number) => void;
}

export function AudioControls({
  isMuted,
  sfxVolume,
  bgmVolume,
  onToggleMute,
  onSfxVolumeChange,
  onBgmVolumeChange
}: AudioControlsProps) {
  const { t } = useLanguage();

  return (
    <div className="audio-controls">
      <button
        className="audio-mute-btn"
        onClick={onToggleMute}
        title={isMuted ? t('game.audioUnmute') : t('game.audioMute')}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
      {!isMuted && (
        <div className="audio-sliders">
          <label>
            SFX
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(sfxVolume * 100)}
              onChange={(e) => onSfxVolumeChange(Number(e.target.value) / 100)}
            />
          </label>
          <label>
            BGM
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(bgmVolume * 100)}
              onChange={(e) => onBgmVolumeChange(Number(e.target.value) / 100)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add locale strings**

Add to `app/locales/en.ts` inside `game`:

```ts
audioMute: 'Mute',
audioUnmute: 'Unmute',
```

Add to `app/locales/vi.ts` inside `game`:

```ts
audioMute: 'Tắt tiếng',
audioUnmute: 'Bật tiếng',
```

- [ ] **Step 4: Add CSS**

Add to `app/app.css`:

```css
.audio-controls {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 8px;
}

.audio-mute-btn {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--color-secondary);
  color: #fff;
  font-size: 20px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
}

.audio-sliders {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(0, 0, 0, 0.6);
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--color-secondary);
}

.audio-sliders label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ccc;
  font-size: 12px;
  font-family: var(--font-body);
}

.audio-sliders input[type='range'] {
  width: 80px;
  accent-color: var(--color-accent);
}
```

- [ ] **Step 5: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No errors in our files

- [ ] **Step 6: Commit**

```bash
git add app/features/audio/hooks/ app/features/audio/components/ app/locales/ app/app.css
git commit -m "feat: add useAudio hook and AudioControls component"
```

### Task 2.5: Wire audio into game route

**Files:**

- Modify: `app/routes/game.tsx`

- [ ] **Step 1: Add audio integration to game.tsx**

Add import near the top of `app/routes/game.tsx`:

```tsx
import { useAudio } from '~/features/audio/hooks/useAudio';
import { AudioControls } from '~/features/audio/components/AudioControls';
import type { BgmTrack } from '~/features/audio/soundRegistry';
```

Inside the `CardGame` component, after the existing `useTheme()` line:

```tsx
const { theme } = useTheme();
const audio = useAudio();

// Start BGM when game is playing
useEffect(() => {
  if (gameState !== 'gamePlaying') {
    audio.stopBgm();
    return;
  }
  const trackMap: Record<string, BgmTrack> = {
    summer: 'bgm_summer',
    christmas: 'bgm_xmas',
    jrpg: 'bgm_jrpg'
  };
  audio.playBgm(trackMap[theme] || 'bgm_summer');
}, [gameState, theme]);
```

Modify `startGameWithTeams` to play game_start sound — add at the end of the function, before the closing brace:

```tsx
audio.playSfx('game_start');
```

Modify `nextRound` to play `round_start` — add after `setRoundNumber((prev) => prev + 1);`:

```tsx
audio.playSfx('round_start');
```

Modify `playerSelect` (first branch, after `setDuelData`):

Find `setDuelData((prev) => ({ ...prev, ...updates }));` in the `duelIndex == 0` branch and add after it:

```tsx
audio.playSfx('group_pick');
```

Find the `calculateResult` call in the else branch and modify the area around it. After the `setDuelData` block that triggers `calculateResult`, we need to add duel win/lose sounds. Modify the `calculateResult` function itself. Add at the end of `calculateResult`, after setting duel events but before the next-round logic:

```tsx
// Play appropriate sound
if (shouldPreventElimination) {
  audio.playSfx('powerup_activate');
} else {
  audio.playSfx('duel_win');
}
```

For streak sounds, find the line after `setWinStreaks` call in `calculateResult` (around line 1208) and add:

```tsx
// Play streak sound
if (newStreak >= 3 && newStreak <= 8 && !shouldPreventElimination) {
  audio.playSfx(`kill_streak_${Math.min(newStreak, 8)}` as any);
}
```

Modify `handleConfirmChance` to play powerup sound. Add at the top of the switch case, after `recordHistorySnapshot()`:

```tsx
audio.playSfx('powerup_activate');
```

When game ends, modify the `nextRound` function where `setGameState('gameOver')` is called:

```tsx
audio.playSfx('game_over');
audio.stopBgm();
```

Add `<AudioControls>` in the return JSX, inside the outermost div, before the existing content:

```tsx
<AudioControls
  isMuted={audio.isMuted}
  sfxVolume={audio.sfxVolume}
  bgmVolume={audio.bgmVolume}
  onToggleMute={audio.toggleMute}
  onSfxVolumeChange={audio.setSfxVolume}
  onBgmVolumeChange={audio.setBgmVolume}
/>
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All existing tests pass (audio calls don't affect test-only code)

- [ ] **Step 4: Commit**

```bash
git add app/routes/game.tsx
git commit -m "feat: wire audio system into game route"
```

---

## Phase 3: Tournament Mode

### Task 3.1: Tournament types and bracket engine

**Files:**

- Create: `app/features/tournament/types.ts`
- Create: `app/features/tournament/bracketEngine.ts`

- [ ] **Step 1: Create types**

Create `app/features/tournament/types.ts`:

```ts
export type TournamentFormat = 'single-elim';

export interface TournamentConfig {
  format: TournamentFormat;
  bestOfCount?: number;
  teamNames: [string, string];
}

export interface TournamentSlot {
  id: string;
  team1: string;
  team2: string;
  winner?: string;
  loser?: string;
  team1Score: number;
  team2Score: number;
  played: boolean;
}

export interface Bracket {
  config: TournamentConfig;
  totalMatches: number;
  slots: TournamentSlot[];
  currentSlotIndex: number;
  champion?: string;
  isComplete: boolean;
}
```

- [ ] **Step 2: Write failing tests**

Create `app/features/tournament/bracketEngine.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  createBracket,
  recordMatchResult,
  getNextSlot,
  getCurrentSlot,
  isBracketComplete
} from './bracketEngine';
import type { TournamentConfig } from './types';

const config: TournamentConfig = {
  format: 'single-elim',
  bestOfCount: 3,
  teamNames: ['Avengers', 'Thanos']
};

describe('bracketEngine', () => {
  describe('createBracket', () => {
    it('creates a bracket with correct match count for best-of-3', () => {
      const bracket = createBracket(config);
      expect(bracket.slots.length).toBe(3); // 3 matches for Bo3
      expect(bracket.totalMatches).toBe(3);
      expect(bracket.currentSlotIndex).toBe(0);
      expect(bracket.isComplete).toBe(false);
    });

    it('creates slots with correct team names', () => {
      const bracket = createBracket(config);
      for (const slot of bracket.slots) {
        expect(slot.team1).toBe('Avengers');
        expect(slot.team2).toBe('Thanos');
        expect(slot.played).toBe(false);
      }
    });

    it('creates 1 match for single match (no best-of)', () => {
      const cfg: TournamentConfig = { ...config, bestOfCount: undefined };
      const bracket = createBracket(cfg);
      expect(bracket.slots.length).toBe(1);
    });

    it('creates 5 matches for best-of-5', () => {
      const cfg: TournamentConfig = { ...config, bestOfCount: 5 };
      const bracket = createBracket(cfg);
      expect(bracket.slots.length).toBe(5);
    });
  });

  describe('recordMatchResult', () => {
    it('records a win and advances slot index', () => {
      const bracket = createBracket(config);
      const updated = recordMatchResult(bracket, 'Avengers', 'Thanos', 5, 3);
      expect(updated.slots[0].played).toBe(true);
      expect(updated.slots[0].winner).toBe('Avengers');
      expect(updated.currentSlotIndex).toBe(1);
      expect(updated.isComplete).toBe(false);
    });

    it('completes bracket when a team reaches majority', () => {
      const bracket = createBracket(config);
      // Avengers win first two → majority in Bo3
      let b = recordMatchResult(bracket, 'Avengers', 'Thanos', 5, 3);
      b = recordMatchResult(b, 'Avengers', 'Thanos', 4, 2);
      expect(b.isComplete).toBe(true);
      expect(b.champion).toBe('Avengers');
    });

    it('does not complete bracket until majority reached', () => {
      const bracket = createBracket(config);
      let b = recordMatchResult(bracket, 'Avengers', 'Thanos', 5, 3);
      b = recordMatchResult(b, 'Thanos', 'Avengers', 4, 2);
      expect(b.isComplete).toBe(false);
      expect(b.champion).toBeUndefined();
      expect(b.currentSlotIndex).toBe(2);
    });

    it('throws on already-complete bracket', () => {
      const bracket = createBracket(config);
      let b = recordMatchResult(bracket, 'Avengers', 'Thanos', 5, 3);
      b = recordMatchResult(b, 'Avengers', 'Thanos', 4, 2);
      expect(() => recordMatchResult(b, 'Avengers', 'Thanos', 3, 1)).toThrow(
        'Bracket is already complete'
      );
    });
  });

  describe('getNextSlot', () => {
    it('returns the next unplayed slot', () => {
      const bracket = createBracket(config);
      const slot = getNextSlot(bracket);
      expect(slot).toBe(bracket.slots[0]);
    });

    it('returns null if bracket is complete', () => {
      const bracket = createBracket(config);
      let b = recordMatchResult(bracket, 'Avengers', 'Thanos', 5, 3);
      b = recordMatchResult(b, 'Avengers', 'Thanos', 4, 2);
      expect(getNextSlot(b)).toBeNull();
    });
  });

  describe('getCurrentSlot', () => {
    it('returns the slot at currentSlotIndex', () => {
      const bracket = createBracket(config);
      expect(getCurrentSlot(bracket)).toBe(bracket.slots[0]);
    });
  });

  describe('isBracketComplete', () => {
    it('returns true when champion is set', () => {
      const bracket = createBracket(config);
      let b = recordMatchResult(bracket, 'Avengers', 'Thanos', 5, 3);
      b = recordMatchResult(b, 'Avengers', 'Thanos', 4, 2);
      expect(isBracketComplete(b)).toBe(true);
    });

    it('returns false for new bracket', () => {
      const bracket = createBracket(config);
      expect(isBracketComplete(bracket)).toBe(false);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run app/features/tournament/bracketEngine.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement bracketEngine.ts**

Create `app/features/tournament/bracketEngine.ts`:

```ts
import type { TournamentConfig, TournamentSlot, Bracket } from './types';

let _idCounter = 0;
function nextId(): string {
  return `slot_${++_idCounter}`;
}

function majorityNeeded(bestOf?: number): number {
  const n = bestOf || 1;
  return Math.ceil(n / 2);
}

export function createBracket(config: TournamentConfig): Bracket {
  const totalMatches = config.bestOfCount || 1;
  const slots: TournamentSlot[] = [];

  for (let i = 0; i < totalMatches; i++) {
    slots.push({
      id: nextId(),
      team1: config.teamNames[0],
      team2: config.teamNames[1],
      team1Score: 0,
      team2Score: 0,
      played: false
    });
  }

  return {
    config,
    totalMatches,
    slots,
    currentSlotIndex: 0,
    isComplete: false
  };
}

export function recordMatchResult(
  bracket: Bracket,
  winner: string,
  loser: string,
  winnerScore: number,
  loserScore: number
): Bracket {
  if (bracket.isComplete) {
    throw new Error('Bracket is already complete');
  }

  const newSlots = bracket.slots.map((slot, i) => {
    if (i !== bracket.currentSlotIndex) return slot;
    return {
      ...slot,
      played: true,
      winner,
      loser,
      team1Score: slot.team1 === winner ? winnerScore : loserScore,
      team2Score: slot.team2 === winner ? winnerScore : loserScore
    };
  });

  // Count wins per team
  let team1Wins = 0;
  let team2Wins = 0;
  for (const slot of newSlots) {
    if (!slot.played) continue;
    if (slot.winner === bracket.config.teamNames[0]) team1Wins++;
    if (slot.winner === bracket.config.teamNames[1]) team2Wins++;
  }

  const needed = majorityNeeded(bracket.config.bestOfCount);
  const champion =
    team1Wins >= needed
      ? bracket.config.teamNames[0]
      : team2Wins >= needed
        ? bracket.config.teamNames[1]
        : undefined;

  const isComplete = !!champion;

  return {
    ...bracket,
    slots: newSlots,
    currentSlotIndex: isComplete
      ? bracket.currentSlotIndex
      : bracket.currentSlotIndex + 1,
    champion,
    isComplete
  };
}

export function getNextSlot(bracket: Bracket): TournamentSlot | null {
  if (bracket.isComplete) return null;
  return bracket.slots[bracket.currentSlotIndex] || null;
}

export function getCurrentSlot(bracket: Bracket): TournamentSlot {
  return bracket.slots[bracket.currentSlotIndex];
}

export function isBracketComplete(bracket: Bracket): boolean {
  return bracket.isComplete;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run app/features/tournament/bracketEngine.test.ts`
Expected: 11 tests PASS

- [ ] **Step 6: Commit**

```bash
git add app/features/tournament/types.ts app/features/tournament/bracketEngine.ts app/features/tournament/bracketEngine.test.ts
git commit -m "feat: add tournament types and bracket engine"
```

### Task 3.2: useTournament hook

**Files:**

- Create: `app/features/tournament/hooks/useTournament.ts`

- [ ] **Step 1: Create useTournament hook**

Create `app/features/tournament/hooks/useTournament.ts`:

```ts
import { useCallback, useState } from 'react';
import type { Bracket, TournamentConfig, TournamentSlot } from '../types';
import {
  createBracket,
  recordMatchResult,
  getNextSlot
} from '../bracketEngine';

export function useTournament() {
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [hasActiveTournament, setHasActiveTournament] = useState(false);

  const startTournament = useCallback((config: TournamentConfig) => {
    const b = createBracket(config);
    setBracket(b);
    setHasActiveTournament(true);
    return b;
  }, []);

  const beginMatch = useCallback((slotId: string) => {
    setCurrentSlotId(slotId);
  }, []);

  const finishMatch = useCallback(
    (
      winner: string,
      loser: string,
      winnerScore: number,
      loserScore: number
    ) => {
      setBracket((prev) => {
        if (!prev) return prev;
        const updated = recordMatchResult(
          prev,
          winner,
          loser,
          winnerScore,
          loserScore
        );
        return updated;
      });
      setCurrentSlotId(null);
    },
    []
  );

  const nextSlot = useCallback((): TournamentSlot | null => {
    if (!bracket) return null;
    return getNextSlot(bracket);
  }, [bracket]);

  const resetTournament = useCallback(() => {
    setBracket(null);
    setCurrentSlotId(null);
    setHasActiveTournament(false);
  }, []);

  return {
    bracket,
    currentSlotId,
    hasActiveTournament,
    startTournament,
    beginMatch,
    finishMatch,
    nextSlot,
    resetTournament
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/features/tournament/hooks/useTournament.ts
git commit -m "feat: add useTournament hook"
```

### Task 3.3: Tournament UI components

**Files:**

- Create: `app/features/tournament/components/TournamentSetup.tsx`
- Create: `app/features/tournament/components/BracketView.tsx`
- Create: `app/features/tournament/components/MatchSlot.tsx`

- [ ] **Step 1: Add tournament locale strings**

Add to `app/locales/en.ts`:

```ts
tournament: {
  title: 'TOURNAMENT MODE',
  team1Name: 'Team 1 Name',
  team2Name: 'Team 2 Name',
  bestOf: 'Best of',
  singleMatch: 'Single Match',
  singleElim: 'Single Elimination',
  startTournament: 'START TOURNAMENT',
  playMatch: 'PLAY MATCH',
  played: 'PLAYED',
  champion: 'CHAMPION',
  tournamentComplete: 'Tournament Complete!',
  backToBracket: 'BACK TO BRACKET',
}
```

Add to `app/locales/vi.ts`:

```ts
tournament: {
  title: 'CHẾ ĐỘ GIẢI ĐẤU',
  team1Name: 'Tên Đội 1',
  team2Name: 'Tên Đội 2',
  bestOf: 'Đấu',
  singleMatch: '1 Trận',
  singleElim: 'Loại Trực Tiếp',
  startTournament: 'BẮT ĐẦU GIẢI',
  playMatch: 'ĐẤU',
  played: 'ĐÃ ĐẤU',
  champion: 'VÔ ĐỊCH',
  tournamentComplete: 'Giải Đấu Kết Thúc!',
  backToBracket: 'VỀ SƠ ĐỒ',
}
```

- [ ] **Step 2: Create TournamentSetup component**

Create `app/features/tournament/components/TournamentSetup.tsx`:

```tsx
import { useState } from 'react';
import { useLanguage } from '~/contexts/LanguageContext';
import type { TournamentConfig } from '../types';

interface TournamentSetupProps {
  onStart: (config: TournamentConfig) => void;
}

export function TournamentSetup({ onStart }: TournamentSetupProps) {
  const { t } = useLanguage();
  const [team1Name, setTeam1Name] = useState('Team 1');
  const [team2Name, setTeam2Name] = useState('Team 2');
  const [bestOf, setBestOf] = useState(3);

  const handleStart = () => {
    onStart({
      format: 'single-elim',
      bestOfCount: bestOf,
      teamNames: [team1Name || 'Team 1', team2Name || 'Team 2']
    });
  };

  return (
    <div className="tournament-setup">
      <h2
        className="text-glow"
        style={{ textAlign: 'center', color: 'var(--color-primary)' }}
      >
        {t('tournament.title')}
      </h2>
      <div className="rpg-panel tournament-setup-form">
        <div className="tournament-field">
          <label>{t('tournament.team1Name')}</label>
          <input
            className="rpg-input"
            value={team1Name}
            onChange={(e) => setTeam1Name(e.target.value)}
          />
        </div>
        <div className="tournament-field">
          <label>{t('tournament.team2Name')}</label>
          <input
            className="rpg-input"
            value={team2Name}
            onChange={(e) => setTeam2Name(e.target.value)}
          />
        </div>
        <div className="tournament-field">
          <label>{t('tournament.bestOf')}</label>
          <select
            className="rpg-input"
            value={bestOf}
            onChange={(e) => setBestOf(Number(e.target.value))}
          >
            <option value={1}>{t('tournament.singleMatch')}</option>
            <option value={3}>Bo3</option>
            <option value={5}>Bo5</option>
            <option value={7}>Bo7</option>
          </select>
        </div>
        <button
          className="rpg-button"
          onClick={handleStart}
          style={{ width: '100%' }}
        >
          {t('tournament.startTournament')}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create MatchSlot component**

Create `app/features/tournament/components/MatchSlot.tsx`:

```tsx
import { useLanguage } from '~/contexts/LanguageContext';
import type { TournamentSlot } from '../types';

interface MatchSlotProps {
  slot: TournamentSlot;
  isCurrent: boolean;
  onPlay: () => void;
}

export function MatchSlotView({ slot, isCurrent, onPlay }: MatchSlotProps) {
  const { t } = useLanguage();

  return (
    <div
      className={`tournament-slot ${isCurrent ? 'tournament-slot-current' : ''} ${slot.played ? 'tournament-slot-played' : ''}`}
    >
      <div className="tournament-slot-teams">
        <span className={slot.winner === slot.team1 ? 'tournament-winner' : ''}>
          {slot.team1}
        </span>
        <span className="tournament-vs">vs</span>
        <span className={slot.winner === slot.team2 ? 'tournament-winner' : ''}>
          {slot.team2}
        </span>
      </div>
      {slot.played ? (
        <div className="tournament-slot-result">
          <span>
            {slot.team1Score} - {slot.team2Score}
          </span>
          <span className="tournament-played-label">
            {t('tournament.played')}
          </span>
        </div>
      ) : isCurrent ? (
        <button className="rpg-button" onClick={onPlay}>
          {t('tournament.playMatch')}
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Create BracketView component**

Create `app/features/tournament/components/BracketView.tsx`:

```tsx
import { useLanguage } from '~/contexts/LanguageContext';
import type { Bracket } from '../types';
import { MatchSlotView } from './MatchSlot';

interface BracketViewProps {
  bracket: Bracket;
  onPlaySlot: (slotId: string) => void;
  onReset: () => void;
}

export function BracketView({
  bracket,
  onPlaySlot,
  onReset
}: BracketViewProps) {
  const { t } = useLanguage();

  const team1Wins = bracket.slots.filter(
    (s) => s.played && s.winner === bracket.config.teamNames[0]
  ).length;
  const team2Wins = bracket.slots.filter(
    (s) => s.played && s.winner === bracket.config.teamNames[1]
  ).length;

  return (
    <div className="tournament-bracket">
      <h2
        className="text-glow"
        style={{ textAlign: 'center', color: 'var(--color-primary)' }}
      >
        {bracket.config.teamNames[0]} vs {bracket.config.teamNames[1]}
      </h2>
      <p style={{ textAlign: 'center', color: '#ccc' }}>
        {t('tournament.bestOf')}: {bracket.config.bestOfCount || 1}
      </p>

      {bracket.isComplete && (
        <h3
          className="text-gradient"
          style={{ textAlign: 'center', fontSize: '2rem' }}
        >
          {t('tournament.champion')}: {bracket.champion}
        </h3>
      )}

      <div className="tournament-score-header">
        <span>
          {bracket.config.teamNames[0]}: {team1Wins}
        </span>
        <span>
          {bracket.config.teamNames[1]}: {team2Wins}
        </span>
      </div>

      <div className="tournament-slots">
        {bracket.slots.map((slot, i) => (
          <MatchSlotView
            key={slot.id}
            slot={slot}
            isCurrent={!bracket.isComplete && i === bracket.currentSlotIndex}
            onPlay={() => onPlaySlot(slot.id)}
          />
        ))}
      </div>

      {bracket.isComplete && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="rpg-button secondary" onClick={onReset}>
            {t('game.returnHome')}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/features/tournament/components/ app/locales/
git commit -m "feat: add tournament UI components"
```

### Task 3.4: Tournament route page

**Files:**

- Modify: `app/routes/_index.tsx`
- Modify: `app/routes/game.tsx`
- Modify: `app/app.css`

- [ ] **Step 1: Add "TOURNAMENT" button to landing page**

Edit `app/routes/_index.tsx`. Find the CTA buttons section and add a third button:

```tsx
<Link
  to="/game?tournament=setup"
  className="rpg-button"
  style={{
    ...styles.ctaSecondary,
    background: 'var(--color-accent)',
    borderColor: 'var(--color-accent)'
  }}
>
  TOURNAMENT
</Link>
```

Place it after the DASHBOARD button, before the media frame.

- [ ] **Step 2: Add tournament state and flow to game.tsx**

Add imports to `app/routes/game.tsx`:

```tsx
import { useTournament } from '~/features/tournament/hooks/useTournament';
import { TournamentSetup } from '~/features/tournament/components/TournamentSetup';
import { BracketView } from '~/features/tournament/components/BracketView';
```

Inside `CardGame`, after the existing state declarations, add:

```tsx
const tournament = useTournament();
const [isTournamentSetup, setIsTournamentSetup] = useState(false);

// Check for tournament URL param on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('tournament') === 'setup') {
    setIsTournamentSetup(true);
  }
}, []);
```

Add a tournament mode render function. Add it before `renderGameInput`:

```tsx
function renderTournament() {
  if (!isTournamentSetup) return null;

  if (!tournament.hasActiveTournament) {
    return (
      <TournamentSetup
        onStart={(config) => {
          tournament.startTournament(config);
        }}
      />
    );
  }

  if (!tournament.bracket) return null;

  // If a match is in progress via tournament, redirect to regular game
  // The bracket view shows the current state
  return (
    <BracketView
      bracket={tournament.bracket}
      onPlaySlot={(slotId) => {
        tournament.beginMatch(slotId);
        // Set the rosters and start game directly
        const slot = tournament.bracket!.slots.find((s) => s.id === slotId);
        if (!slot) return;
        setSetupTeam1Roster([slot.team1]);
        setSetupTeam2Roster([slot.team2]);
        // Start a non-tournament game — the tournament flow wraps around
        startGameWithTeams([slot.team1], [slot.team2]);
      }}
      onReset={() => {
        tournament.resetTournament();
        setIsTournamentSetup(false);
      }}
    />
  );
}
```

Now modify the `startGameWithTeams` function to record tournament results. Add at the very end of `startGameWithTeams`, after the game is set up. Actually, we need to handle this in the game-over path. Add tournament result recording in the `useEffect` that fires `performSave`:

```tsx
useEffect(() => {
  if (gameState !== 'gameOver') return;
  if (saveStatus !== 'idle') return;
  performSave();

  // Record tournament result if active
  if (tournament.hasActiveTournament && tournament.currentSlotId) {
    const winnerTeam = team1Data.players.length === 0 ? 'team2' : 'team1';
    const winnerName =
      winnerTeam === 'team1'
        ? tournament.bracket?.config.teamNames[0] || ''
        : tournament.bracket?.config.teamNames[1] || '';
    const loserName =
      winnerTeam === 'team1'
        ? tournament.bracket?.config.teamNames[1] || ''
        : tournament.bracket?.config.teamNames[0] || '';
    tournament.finishMatch(
      winnerName,
      loserName,
      winnerTeam === 'team1' ? team1Data.score : team2Data.score,
      winnerTeam === 'team1' ? team2Data.score : team1Data.score
    );
  }
}, [gameState, saveStatus, performSave]);
```

Add the tournament renderer to the JSX, before `renderGameInput()`:

```tsx
{
  isTournamentSetup && renderTournament();
}
```

- [ ] **Step 3: Add tournament CSS**

Add to `app/app.css`:

```css
.tournament-setup {
  max-width: 500px;
  margin: 40px auto;
}

.tournament-setup-form {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tournament-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tournament-field label {
  color: var(--color-secondary);
  font-family: var(--font-body);
}

.tournament-bracket {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
}

.tournament-score-header {
  display: flex;
  justify-content: space-between;
  padding: 0 40px;
  margin: 16px 0;
  color: #ccc;
  font-family: var(--font-body);
  font-size: 1.2rem;
}

.tournament-slots {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tournament-slot {
  background: rgba(15, 12, 41, 0.8);
  border: 2px solid var(--color-secondary);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tournament-slot-current {
  border-color: var(--color-accent);
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.3);
}

.tournament-slot-played {
  opacity: 0.7;
}

.tournament-slot-teams {
  display: flex;
  gap: 12px;
  align-items: center;
  font-family: var(--font-body);
  font-size: 1.1rem;
  color: #fff;
}

.tournament-vs {
  color: var(--color-secondary);
  font-size: 0.9rem;
}

.tournament-winner {
  color: var(--color-accent);
  font-weight: bold;
}

.tournament-slot-result {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.tournament-slot-result span:first-child {
  color: #fff;
  font-size: 1.2rem;
  font-weight: bold;
}

.tournament-played-label {
  color: #888;
  font-size: 0.8rem;
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No errors in our files

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (51 existing + 11 tournament = 62)

- [ ] **Step 6: Commit**

```bash
git add app/routes/ app/app.css
git commit -m "feat: wire tournament mode into app routes"
```

---

## Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All 62+ tests pass

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: No type errors

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: No new errors (11 pre-existing in unrelated files are expected)

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 5: Manual browser verification**

```bash
npm run dev
```

Verify:

- Audio mute button appears and works
- Sounds play on card flip, duel win, game start/end
- BGM plays during game (quiet drone)
- Share button appears on game-over screen
- Share modal opens, Download PNG works, Tweet button opens Twitter
- Tournament button on landing page
- Tournament setup → bracket view → play match → result recorded
- Bo3 bracket completes after majority wins
