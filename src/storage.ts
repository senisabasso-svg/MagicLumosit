const KEY = "magiclumosity-v1";

export type Persisted = {
  totalPlays: number;
  bestScores: Record<string, number>;
  lastPlayDay: string | null;
  streak: number;
};

const defaultState: Persisted = {
  totalPlays: 0,
  bestScores: {},
  lastPlayDay: null,
  streak: 0
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      totalPlays: parsed.totalPlays ?? 0,
      bestScores: parsed.bestScores ?? {},
      lastPlayDay: parsed.lastPlayDay ?? null,
      streak: parsed.streak ?? 0
    };
  } catch {
    return { ...defaultState };
  }
}

export function save(next: Persisted): void {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function recordSession(gameId: string, score: number): Persisted {
  const prev = load();
  const day = todayKey();
  let streak = prev.streak;
  if (prev.lastPlayDay === null) streak = 1;
  else if (prev.lastPlayDay === day) streak = prev.streak;
  else {
    const y = new Date(prev.lastPlayDay);
    const t = new Date(day);
    const diff = (t.getTime() - y.getTime()) / 86400000;
    streak = diff === 1 ? prev.streak + 1 : 1;
  }
  const best = Math.max(prev.bestScores[gameId] ?? 0, score);
  const next: Persisted = {
    totalPlays: prev.totalPlays + 1,
    bestScores: { ...prev.bestScores, [gameId]: best },
    lastPlayDay: day,
    streak
  };
  save(next);
  return next;
}
