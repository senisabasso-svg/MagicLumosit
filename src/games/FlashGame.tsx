import { useEffect, useRef, useState } from "react";

const ROUNDS = 8;
const MODES = ["exacto", "reverso", "solo-digitos", "solo-letras", "desplazar"] as const;

type Mode = (typeof MODES)[number];

type Challenge = {
  sequence: string;
  mode: Mode;
  answer: string;
  showMs: number;
};

type Props = {
  onDone: (score: number) => void;
  onBack: () => void;
};

function randomChar(): string {
  const fromDigit = Math.random() < 0.5;
  if (fromDigit) return String(Math.floor(Math.random() * 10));
  return String.fromCharCode(65 + Math.floor(Math.random() * 26));
}

function buildSequence(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += randomChar();
  return out;
}

function shiftToken(char: string): string {
  if (/\d/.test(char)) return String((Number(char) + 1) % 10);
  const code = char.charCodeAt(0) - 65;
  return String.fromCharCode(65 + ((code + 1) % 26));
}

function solve(sequence: string, mode: Mode): string {
  if (mode === "exacto") return sequence;
  if (mode === "reverso") return sequence.split("").reverse().join("");
  if (mode === "solo-digitos") return sequence.replace(/[A-Z]/g, "");
  if (mode === "solo-letras") return sequence.replace(/\d/g, "");
  return sequence
    .split("")
    .map((char) => shiftToken(char))
    .join("");
}

function modeHelp(mode: Mode): string {
  if (mode === "exacto") return "Escribí la secuencia exacta";
  if (mode === "reverso") return "Escribila al revés";
  if (mode === "solo-digitos") return "Escribí solo los dígitos";
  if (mode === "solo-letras") return "Escribí solo las letras";
  return "Desplazá cada símbolo +1 (9->0, Z->A)";
}

function createChallenge(round: number): Challenge {
  const len = Math.min(10, 4 + round);
  const mode = MODES[(round + Math.floor(Math.random() * MODES.length)) % MODES.length];
  const sequence = buildSequence(len);
  return {
    sequence,
    mode,
    answer: solve(sequence, mode),
    showMs: Math.max(1200, 2600 - round * 170)
  };
}

export function FlashGame({ onDone, onBack }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"show" | "input" | "result">("show");
  const [challenge, setChallenge] = useState<Challenge>(() => createChallenge(0));
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");

  const scoreRef = useRef(0);
  const shownAtRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const next = createChallenge(round);
    setChallenge(next);
    setPhase("show");
    setInput("");
    setFeedback("");
    shownAtRef.current = performance.now();
    const t = window.setTimeout(() => setPhase("input"), next.showMs);
    return () => window.clearTimeout(t);
  }, [round]);

  const finish = () => {
    setPhase("result");
    if (!doneRef.current) {
      doneRef.current = true;
      onDone(scoreRef.current);
    }
  };

  const submit = () => {
    if (phase !== "input") return;
    const normalized = input.toUpperCase().replace(/\s+/g, "");
    const correct = challenge.answer;
    const ok = normalized === correct;
    const elapsed = Math.round(performance.now() - shownAtRef.current);

    if (ok) {
      const reward = 90 + challenge.sequence.length * 14 + Math.max(0, 1200 - elapsed) / 20;
      scoreRef.current += Math.round(reward);
      setScore(scoreRef.current);
      setFeedback(`Correcto (+${Math.round(reward)})`);
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - 35);
      setScore(scoreRef.current);
      setFeedback(`Era: ${correct}`);
    }

    const nextRound = round + 1;
    if (nextRound >= ROUNDS) {
      window.setTimeout(finish, 500);
      return;
    }
    window.setTimeout(() => setRound(nextRound), 700);
  };

  if (phase === "result") {
    return (
      <div className="game-shell">
        <p className="score-line">
          Puntuación final: <strong>{score}</strong>
        </p>
        <p className="game-instructions">Modalidades completadas: {ROUNDS}</p>
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
        <span className="hud-chip">Puntos {score}</span>
      </div>
      <p className="game-instructions">{modeHelp(challenge.mode)}</p>
      <div className="mode-pill">Modo: {challenge.mode}</div>

      {phase === "show" ? (
        <div className="num-display">{challenge.sequence}</div>
      ) : (
        <>
          <div className="num-display" style={{ opacity: 0.35 }}>
            {"*".repeat(Math.max(4, challenge.sequence.length))}
          </div>
          <div className="input-row">
            <input
              autoComplete="off"
              spellCheck={false}
              placeholder="Tu respuesta"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase().slice(0, 14))}
            />
          </div>
          <button type="button" className="big-btn" onClick={submit}>
            Validar
          </button>
          {feedback && <p className="game-instructions">{feedback}</p>}
        </>
      )}
    </div>
  );
}
