import { useCallback, useState } from "react";
import type { GameId, GameMeta } from "./types";
import { load, recordSession } from "./storage";
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

export default function App() {
  const [active, setActive] = useState<GameId | null>(null);
  const [persist, setPersist] = useState(load);

  const handleDone = useCallback((id: GameId) => (score: number) => {
    setPersist(recordSession(id, score));
  }, []);

  const goHome = useCallback(() => setActive(null), []);

  const meta = active ? GAMES.find((g) => g.id === active) : null;

  return (
    <>
      {!active && (
        <>
          <header className="app-header">
            <h1>MagicLumosity</h1>
            <p>Entrenamiento cognitivo intensivo, optimizado para celular.</p>
          </header>
          <div className="stats-bar">
            <div className="stat-pill">
              Racha: <strong>{persist.streak}</strong> día{persist.streak === 1 ? "" : "s"}
            </div>
            <div className="stat-pill">
              Sesiones: <strong>{persist.totalPlays}</strong>
            </div>
          </div>
          <div className="game-grid">
            {GAMES.map((g) => (
              <button key={g.id} type="button" className="game-card" onClick={() => setActive(g.id)}>
                <div className="game-card-icon" aria-hidden>
                  {g.emoji}
                </div>
                <span className="tag">{g.tag}</span>
                <h2>{g.title}</h2>
                <p>{g.description}</p>
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
    </>
  );
}
