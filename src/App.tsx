import { useCallback, useMemo, useState } from "react";
import type { GameId, GameMeta } from "./types";
import {
  load,
  loginAsAdmin,
  loginAsUser,
  logoutUser,
  recordGuestPlay,
  recordSession,
  registerUser,
  userExists
} from "./storage";
import { ReflexGame } from "./games/ReflexGame";
import { FlashGame } from "./games/FlashGame";
import { MemoryGame } from "./games/MemoryGame";
import { ParityGame } from "./games/ParityGame";
import { StroopGame } from "./games/StroopGame";

const GAMES: GameMeta[] = [
  {
    id: "reflex",
    title: "Reflejo táctico",
    tag: "Velocidad + Control",
    description: "Decisiones SI/NO con reglas cambiantes, penalización por falsos positivos.",
    emoji: "?"
  },
  {
    id: "flash",
    title: "Flash adaptativo",
    tag: "Memoria de trabajo",
    description: "Secuencias alfanuméricas con transformaciones, reversa y filtros.",
    emoji: "??"
  },
  {
    id: "memory",
    title: "Matriz de ruta",
    tag: "Espacial avanzada",
    description: "Cuadrícula 4x4, secuencias largas y sistema de vidas.",
    emoji: "??"
  },
  {
    id: "parity",
    title: "Lógica exprés",
    tag: "Cálculo mental",
    description: "Operaciones rápidas con reglas dinámicas: paridad, signo, primos y múltiplos.",
    emoji: "?"
  },
  {
    id: "stroop",
    title: "Stroop multicapa",
    tag: "Atención ejecutiva",
    description: "Cambia entre modo tinta, palabra y coincidencia bajo presión temporal.",
    emoji: "??"
  }
];

const WHATSAPP_PHONE = "092331019";
const PREMIUM_MESSAGE = "quiero obtener acceso premium de la app";
const ADMIN_EMAIL = "admin@magiclumosity.app";
const ADMIN_PASSWORD = "MagicAdmin2026";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function buildWhatsappLink(email: string): string {
  const text = `${PREMIUM_MESSAGE}. Mail: ${email.trim().toLowerCase()}`;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

export default function App() {
  const [active, setActive] = useState<GameId | null>(null);
  const [persist, setPersist] = useState(load);
  const [guestMode, setGuestMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [waEmail, setWaEmail] = useState("");
  const [adminNewUserEmail, setAdminNewUserEmail] = useState("");
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waReason, setWaReason] = useState<"no-user" | "guest-limit">("no-user");
  const [loginError, setLoginError] = useState("");
  const [waError, setWaError] = useState("");
  const [adminError, setAdminError] = useState("");

  const currentRole = persist.userRole ?? (persist.userEmail ? "user" : null);
  const isLogged = Boolean(persist.userEmail && currentRole);
  const isAdmin = currentRole === "admin";
  const canEnter = isLogged || guestMode;

  const handleDone = useCallback(
    (id: GameId) => (score: number) => {
      const sessionState = recordSession(id, score);
      if (!isLogged && guestMode) {
        const guestState = recordGuestPlay(id);
        setPersist(guestState);
        return;
      }
      setPersist(sessionState);
    },
    [guestMode, isLogged]
  );

  const goHome = useCallback(() => setActive(null), []);

  const meta = active ? GAMES.find((g) => g.id === active) : null;
  const cardClickHint = useMemo(
    () => (!isLogged && guestMode ? "Modo invitado: una sola partida por juego." : ""),
    [guestMode, isLogged]
  );

  const openWhatsappModal = (reason: "no-user" | "guest-limit", emailSeed = "") => {
    setWaReason(reason);
    setWaEmail(emailSeed.trim().toLowerCase());
    setWaError("");
    setWaModalOpen(true);
  };

  const handleLogin = () => {
    const clean = loginEmail.trim().toLowerCase();
    if (!isValidEmail(clean)) {
      setLoginError("Ingresá un mail válido para continuar.");
      return;
    }
    if (clean === ADMIN_EMAIL) {
      if (loginPassword !== ADMIN_PASSWORD) {
        setLoginError("Clave de admin incorrecta.");
        return;
      }
      setPersist(loginAsAdmin(clean));
      setLoginError("");
      setLoginPassword("");
      setGuestMode(false);
      return;
    }
    if (!userExists(clean)) {
      setLoginError("Usuario no registrado. Solicitá el alta premium.");
      return;
    }
    setPersist(loginAsUser(clean));
    setGuestMode(false);
    setLoginError("");
    setLoginPassword("");
  };

  const handleOpenGame = (id: GameId) => {
    if (!isLogged && guestMode && (persist.guestPlays[id] ?? 0) >= 1) {
      openWhatsappModal("guest-limit", loginEmail);
      return;
    }
    setActive(id);
  };

  const requestPremiumViaWhatsApp = () => {
    const clean = waEmail.trim().toLowerCase();
    if (!isValidEmail(clean)) {
      setWaError("Ingresá un mail válido para solicitar acceso premium.");
      return;
    }
    const link = buildWhatsappLink(clean);
    window.location.href = link;
  };

  const handleLogout = () => {
    setPersist(logoutUser());
    setGuestMode(false);
    setActive(null);
    setLoginEmail("");
    setLoginPassword("");
    setLoginError("");
  };

  const handleAdminCreateUser = () => {
    if (!isAdmin) return;
    const clean = adminNewUserEmail.trim().toLowerCase();
    if (!isValidEmail(clean)) {
      setAdminError("Ingresá un mail válido.");
      return;
    }
    const { next, created } = registerUser(clean);
    setPersist(next);
    if (!created) {
      setAdminError("Ese usuario ya existe.");
      return;
    }
    setAdminError("");
    setAdminNewUserEmail("");
  };

  const sortedUsers = useMemo(
    () => [...persist.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [persist.users]
  );

  const formatAltaDate = (isoDate: string) =>
    new Intl.DateTimeFormat("es-UY", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(isoDate));

  return (
    <>
      {!canEnter && (
        <div className="auth-shell">
          <header className="app-header">
            <h1>MagicLumosity</h1>
            <p>Ingresá con tu mail o probá como invitado.</p>
          </header>
          <div className="auth-card">
            <label htmlFor="login-email">Mail</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
            <label htmlFor="login-password">Clave (solo para admin)</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Clave de admin"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            <button type="button" className="big-btn" onClick={handleLogin}>
              Iniciar sesión
            </button>
            <button
              type="button"
              className="big-btn secondary"
              onClick={() => openWhatsappModal("no-user", loginEmail)}
            >
              No tengo usuario, solicitar acceso premium
            </button>
            <button type="button" className="big-btn secondary" onClick={() => setGuestMode(true)}>
              Ingresar sin loguearme
            </button>
            <p className="game-instructions admin-hint">
              Admin de código: <strong>{ADMIN_EMAIL}</strong>
            </p>
            {loginError && <p className="auth-error">{loginError}</p>}
          </div>
        </div>
      )}
      {!active && canEnter && (
        <>
          <header className="app-header home-header">
            <h1>MagicLumosity</h1>
            <p>
              {isAdmin
                ? `Entraste como administrador (${persist.userEmail}).`
                : isLogged
                ? `Entraste con ${persist.userEmail}.`
                : "Modo invitado activo: una sola partida por juego."}
            </p>
            <button type="button" className="big-btn secondary logout-btn" onClick={handleLogout}>
              {isLogged ? "Cerrar sesión" : "Salir modo invitado"}
            </button>
          </header>
          {isAdmin && (
            <div className="admin-card">
              <h3>Alta de usuarios</h3>
              <p>Creá cuentas premium con fecha de alta registrada.</p>
              <input
                type="email"
                autoComplete="off"
                placeholder="mail del nuevo usuario"
                value={adminNewUserEmail}
                onChange={(e) => setAdminNewUserEmail(e.target.value)}
              />
              <button type="button" className="big-btn" onClick={handleAdminCreateUser}>
                Dar de alta
              </button>
              {adminError && <p className="auth-error">{adminError}</p>}
              <div className="user-list">
                {sortedUsers.length === 0 ? (
                  <p className="game-instructions">Todavía no hay usuarios dados de alta.</p>
                ) : (
                  sortedUsers.map((user) => (
                    <div key={user.email} className="user-row">
                      <span>{user.email}</span>
                      <span>Alta: {formatAltaDate(user.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <div className="stats-bar">
            <div className="stat-pill">
              Racha: <strong>{persist.streak}</strong> día{persist.streak === 1 ? "" : "s"}
            </div>
            <div className="stat-pill">
              Sesiones: <strong>{persist.totalPlays}</strong>
            </div>
          </div>
          {cardClickHint && <p className="game-instructions">{cardClickHint}</p>}
          <div className="game-grid">
            {GAMES.map((g) => (
              <button key={g.id} type="button" className="game-card" onClick={() => handleOpenGame(g.id)}>
                <div className="game-card-icon" aria-hidden>
                  {g.emoji}
                </div>
                <span className="tag">{g.tag}</span>
                <h2>{g.title}</h2>
                <p>{g.description}</p>
                {!isLogged && guestMode && (
                  <p className="game-instructions" style={{ marginTop: 8 }}>
                    Intento invitado: {persist.guestPlays[g.id] ?? 0}/1
                  </p>
                )}
                {(persist.bestScores[g.id] ?? 0) > 0 && (
                  <p className="game-instructions" style={{ marginTop: 8 }}>
                    Mejor: {persist.bestScores[g.id]} pts
                  </p>
                )}
              </button>
            ))}
          </div>
          <p className="footer-note">
            Sesiones rápidas de alta carga cognitiva. Instalá como PWA para abrirla como app nativa.
          </p>
        </>
      )}
      {active && meta && (
        <>
          <div className="screen-title">
            <button type="button" className="back-btn" onClick={goHome} aria-label="Volver">
              ?
            </button>
            <h2>
              {meta.emoji} {meta.title}
            </h2>
          </div>
          {active === "reflex" && <ReflexGame onDone={handleDone("reflex")} onBack={goHome} />}
          {active === "flash" && <FlashGame onDone={handleDone("flash")} onBack={goHome} />}
          {active === "memory" && <MemoryGame onDone={handleDone("memory")} onBack={goHome} />}
          {active === "parity" && <ParityGame onDone={handleDone("parity")} onBack={goHome} />}
          {active === "stroop" && <StroopGame onDone={handleDone("stroop")} onBack={goHome} />}
        </>
      )}
      {waModalOpen && (
        <div className="overlay">
          <div className="modal-card">
            <h3>{waReason === "guest-limit" ? "Ya usaste tu intento" : "Solicitar acceso premium"}</h3>
            <p>
              {waReason === "guest-limit"
                ? "Para seguir jugando, creá tu usuario. Te redirigimos a WhatsApp."
                : "Ingresá tu mail y te redirigimos a WhatsApp para pedir acceso premium."}
            </p>
            <input
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={waEmail}
              onChange={(e) => setWaEmail(e.target.value)}
            />
            <button type="button" className="big-btn" onClick={requestPremiumViaWhatsApp}>
              Solicitar por WhatsApp
            </button>
            <button type="button" className="big-btn secondary" onClick={() => setWaModalOpen(false)}>
              Cancelar
            </button>
            {waError && <p className="auth-error">{waError}</p>}
          </div>
        </div>
      )}
    </>
  );
}
