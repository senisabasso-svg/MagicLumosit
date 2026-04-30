import { useEffect, useMemo, useRef, useState } from "react";

const ROUNDS = 12;

const COLORS = [
  { id: "rojo", label: "Rojo", css: "#ef4444" },
  { id: "verde", label: "Verde", css: "#22c55e" },
  { id: "azul", label: "Azul", css: "#3b82f6" },
  { id: "amarillo", label: "Amarillo", css: "#facc15" }
] as const;

type ColorId = (typeof COLORS)[number]["id"];
type Mode = "tinta" | "palabra" | "coinciden";

type Challenge = {
  word: (typeof COLORS)[number];
  ink: (typeof COLORS)[number];
  mode: Mode;
};

type Props = {
  onDone: (score: number) => void;
  onBack: () => void;
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildChallenge(round: number): Challenge {
  const modeOrder: Mode[] = ["tinta", "palabra", "coinciden"];
  const mode = modeOrder[round % modeOrder.length];
  const word = pick(COLORS);
  const maybeMatch = Math.random() < 0.35;
  const ink = maybeMatch ? word : pick(COLORS.filter((c) => c.id !== word.id));
  return { word, ink, mode };
}

export function StroopGame({ onDone, onBack }: Props) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [leftMs, setLeftMs] = useState(2800);

  const challenge = useMemo(() => buildChallenge(round), [round]);
  const scoreRef = useRef(0);
  const answeredRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (finished) return;
    answeredRef.current = false;
    setFeedback("");
    const limit = Math.max(1200, 2800 - round * 120);
    setLeftMs(limit);
    const started = performance.now();

    const timer = window.setInterval(() => {
      if (answeredRef.current) return;
      const remain = Math.max(0, limit - (performance.now() - started));
      setLeftMs(remain);
      if (remain <= 0) {
        answeredRef.current = true;
        scoreRef.current = Math.max(0, scoreRef.current - 25);
        setScore(scoreRef.current);
        setFeedback("Sin tiempo (-25)");
        window.setTimeout(nextRound, 420);
      }
    }, 70);

    return () => window.clearInterval(timer);
  }, [round, finished]);

  const finish = () => {
    setFinished(true);
    if (!doneRef.current) {
      doneRef.current = true;
      onDone(scoreRef.current);
    }
  };

  const nextRound = () => {
    setRound((prev) => {
      const nr = prev + 1;
      if (nr >= ROUNDS) {
        finish();
        return prev;
      }
      return nr;
    });
  };

  const prompt =
    challenge.mode === "tinta"
      ? "Elegí color de la tinta"
      : challenge.mode === "palabra"
        ? "Elegí el significado de la palabra"
        : "¿Coinciden palabra y tinta?";

  const answerColor = (id: ColorId) => {
    if (answeredRef.current || finished || challenge.mode === "coinciden") return;
    answeredRef.current = true;
    const expected = challenge.mode === "tinta" ? challenge.ink.id : challenge.word.id;
    const ok = id === expected;
    if (ok) {
      const gained = 65 + Math.round(leftMs / 24);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setFeedback(`Correcto (+${gained})`);
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - 24);
      setScore(scoreRef.current);
      setFeedback(`Error (-24) · era ${expected}`);
    }
    window.setTimeout(nextRound, 420);
  };

  const answerMatch = (yes: boolean) => {
    if (answeredRef.current || finished || challenge.mode !== "coinciden") return;
    answeredRef.current = true;
    const expected = challenge.word.id === challenge.ink.id;
    const ok = yes === expected;
    if (ok) {
      const gained = 70 + Math.round(leftMs / 22);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setFeedback(`Correcto (+${gained})`);
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - 26);
      setScore(scoreRef.current);
      setFeedback("Error (-26)");
    }
    window.setTimeout(nextRound, 420);
  };

  if (finished) {
    return (
      <div className="game-shell">
        <p className="score-line">
          Puntuación final: <strong>{score}</strong>
        </p>
        <p className="game-instructions">Interferencias completadas: {ROUNDS}</p>
        <button type="button" className="big-btn" onClick={onBack}>
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="game-shell">
      <div className="hud-row">
        <span className="hud-chip">Ronda {round + 1}/{ROUNDS}</span>
        <span className="hud-chip">Modo {challenge.mode}</span>
        <span className="hud-chip">Tiempo {(leftMs / 1000).toFixed(1)}s</span>
      </div>

      <p className="game-instructions">{prompt}</p>
      <div className="math-challenge" style={{ color: challenge.ink.css, fontSize: "2.25rem" }}>
        {challenge.word.label.toUpperCase()}
      </div>

      {challenge.mode === "coinciden" ? (
        <div className="option-grid two">
          <button type="button" className="option-btn" onClick={() => answerMatch(true)}>
            SI
          </button>
          <button type="button" className="option-btn secondary" onClick={() => answerMatch(false)}>
            NO
          </button>
        </div>
      ) : (
        <div className="stroop-options">
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="color-btn"
              style={{ background: c.css, color: "#0c1222" }}
              onClick={() => answerColor(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {feedback && <p className="game-instructions">{feedback}</p>}
      <p className="game-instructions">Puntos: {score}</p>
    </div>
  );
}
