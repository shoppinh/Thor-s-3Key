import type { LocalDuelEvent } from '~/features/dashboard/types';

export const POWERUP_LABELS: Record<string, string> = {
  revealTwo: 'Reveal Two',
  lifeShield: 'Life Shield',
  removeWorst: 'Remove Worst',
  secondChance: 'Second Chance'
};

export type PowerUpLabelMap = Partial<typeof POWERUP_LABELS>;

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

export function summarizePowerUps(
  events: LocalDuelEvent[],
  labels: PowerUpLabelMap = POWERUP_LABELS
): PowerUpSummary[] {
  const counts = new Map<string, number>();
  const labelFor = (key: keyof typeof POWERUP_LABELS) =>
    labels[key] || POWERUP_LABELS[key];

  for (const event of events) {
    const p = event.powerUpsUsed;
    if (p.revealTwo)
      counts.set(
        labelFor('revealTwo'),
        (counts.get(labelFor('revealTwo')) || 0) + 1
      );
    if (p.lifeShield)
      counts.set(
        labelFor('lifeShield'),
        (counts.get(labelFor('lifeShield')) || 0) + 1
      );
    if (p.removeWorst?.length) {
      counts.set(
        labelFor('removeWorst'),
        (counts.get(labelFor('removeWorst')) || 0) + p.removeWorst.length
      );
    }
    if (p.secondChance?.length) {
      counts.set(
        labelFor('secondChance'),
        (counts.get(labelFor('secondChance')) || 0) + p.secondChance.length
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
  date: string;
  labels: {
    title: string;
    mvpLabel: string;
    powerUpsLabel: string;
    durationLabel: string;
    footer: string;
  };
  colors?: {
    background: string;
    border: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    muted: string;
  };
}

export function renderMatchCardToCanvas(
  data: MatchCardData
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;
  const colors = data.colors || {
    background: '#0a0a1a',
    border: '#ffd700',
    primary: '#ffd700',
    secondary: '#00ff88',
    accent: '#aaa',
    text: '#ffffff',
    muted: '#888'
  };

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, 600, 400);

  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 580, 380);

  ctx.fillStyle = colors.primary;
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(data.labels.title, 300, 50);

  ctx.fillStyle = colors.text;
  ctx.font = 'bold 28px monospace';
  ctx.fillText(
    `${data.team1Name}  ${data.team1Score} - ${data.team2Score}  ${data.team2Name}`,
    300,
    100
  );

  ctx.fillStyle = colors.primary;
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`${data.winnerName}`, 300, 140);

  if (data.mvpName) {
    ctx.fillStyle = colors.secondary;
    ctx.font = '16px monospace';
    ctx.fillText(`${data.labels.mvpLabel} ${data.mvpName}`, 300, 180);
  }

  let y = 220;
  if (data.powerUps.length > 0) {
    ctx.fillStyle = colors.accent;
    ctx.font = '14px monospace';
    ctx.fillText(data.labels.powerUpsLabel, 300, y);
    y += 24;
    ctx.fillStyle = colors.text;
    ctx.font = '13px monospace';
    for (const pu of data.powerUps) {
      ctx.fillText(`${pu.name} x${pu.count}`, 300, y);
      y += 20;
    }
  }

  y = Math.max(y + 10, 320);
  const mins = Math.floor(data.durationSeconds / 60);
  const secs = data.durationSeconds % 60;
  ctx.fillStyle = colors.muted;
  ctx.font = '12px monospace';
  ctx.fillText(
    `${data.labels.durationLabel} ${mins}m ${secs}s  |  ${data.date}`,
    300,
    y
  );

  ctx.fillStyle = colors.muted;
  ctx.font = '11px monospace';
  ctx.fillText(data.labels.footer, 300, y + 24);

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
