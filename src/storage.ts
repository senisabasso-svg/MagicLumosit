const KEY = "magiclumosity-v1";

export type UserRole = "admin" | "user";

export type RegisteredUser = {
  email: string;
  password: string;
  createdAt: string;
};

export type Persisted = {
  totalPlays: number;
  bestScores: Record<string, number>;
  lastPlayDay: string | null;
  streak: number;
  userEmail: string | null;
  userRole: UserRole | null;
  users: RegisteredUser[];
  guestPlays: Record<string, number>;
};

const defaultState: Persisted = {
  totalPlays: 0,
  bestScores: {},
  lastPlayDay: null,
  streak: 0,
  userEmail: null,
  userRole: null,
  users: [],
  guestPlays: {}
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const users =
      parsed.users?.map((user) => ({
        email: user.email?.trim().toLowerCase() ?? "",
        password: user.password ?? "",
        createdAt: user.createdAt ?? new Date().toISOString()
      })) ?? [];
    return {
      totalPlays: parsed.totalPlays ?? 0,
      bestScores: parsed.bestScores ?? {},
      lastPlayDay: parsed.lastPlayDay ?? null,
      streak: parsed.streak ?? 0,
      userEmail: parsed.userEmail ?? null,
      userRole: parsed.userRole ?? null,
      users,
      guestPlays: parsed.guestPlays ?? {}
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
    streak,
    userEmail: prev.userEmail,
    userRole: prev.userRole,
    users: prev.users,
    guestPlays: prev.guestPlays
  };
  save(next);
  return next;
}

export function loginAsUser(email: string): Persisted {
  const prev = load();
  const next: Persisted = {
    ...prev,
    userEmail: email.trim().toLowerCase() || null,
    userRole: "user"
  };
  save(next);
  return next;
}

export function loginAsAdmin(email: string): Persisted {
  const prev = load();
  const next: Persisted = {
    ...prev,
    userEmail: email.trim().toLowerCase() || null,
    userRole: "admin"
  };
  save(next);
  return next;
}

export function logoutUser(): Persisted {
  const prev = load();
  const next: Persisted = {
    ...prev,
    userEmail: null,
    userRole: null
  };
  save(next);
  return next;
}

export function registerUser(email: string, password: string): { next: Persisted; created: boolean } {
  const prev = load();
  const clean = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  if (!clean || !cleanPassword) return { next: prev, created: false };
  const exists = prev.users.some((u) => u.email === clean);
  if (exists) return { next: prev, created: false };
  const next: Persisted = {
    ...prev,
    users: [...prev.users, { email: clean, password: cleanPassword, createdAt: new Date().toISOString() }]
  };
  save(next);
  return { next, created: true };
}

export function authenticateUser(email: string, password: string): boolean {
  const clean = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  return load().users.some((u) => u.email === clean && u.password === cleanPassword);
}

export function recordGuestPlay(gameId: string): Persisted {
  const prev = load();
  const nextGuestPlays = {
    ...prev.guestPlays,
    [gameId]: (prev.guestPlays[gameId] ?? 0) + 1
  };
  const next: Persisted = {
    ...prev,
    guestPlays: nextGuestPlays
  };
  save(next);
  return next;
}
