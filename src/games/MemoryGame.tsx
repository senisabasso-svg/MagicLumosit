import { useEffect, useRef, useState } from "react";

const GRID_SIZE = 4;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const ROUNDS = 7;

type Phase = "watch" | "play" | "result";

type Props = {
  onDone: (score: number) => void;
  onBack: () => void;
};

function randomUniqueSequence(len: number): number[] {
  const pool = Array.from({ length: TOTAL_CELLS }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, len);
}

export function MemoryGame({ onDone, onBack }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("watch");
  const [highlight, setHighlight] = useState<number | null>(null);
  const [mistakeCell, setMistakeCell] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(2);
  const [progress, setProgress] = useState(0);

  const sequenceRef = useRef<number[]>([]);
  const indexRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(2);
  const doneRef = useRef(false);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const sequenceLength = (r: number) => Math.min(10, 4 + r);

  const playSequence = (seq: number[], roundIndex: number) => {
    clearTimers();
    setPhase("watch");
    setProgress(0);
    indexRef.current = 0;
    let cursor = 0;
    const stepMs = Math.max(260, 420 - roundIndex * 25);

    seq.forEach((cell) => {
      const show = window.setTimeout(() => setHighlight(cell), cursor + 120);
      const hide = window.setTimeout(() => setHighlight(null), cursor + stepMs);
      timersRef.current.push(show, hide);
      cursor += stepMs + 60;
    });

    const end = window.setTimeout(() => {
      setPhase("play");
      setHighlight(null);
    }, cursor + 160);
    timersRef.current.push(end);
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    if (doneRef.current) return;
    const seq = randomUniqueSequence(sequenceLength(round));
    sequenceRef.current = seq;
    playSequence(seq, round);
  }, [round]);

  const finish = () => {
    clearTimers();
    setPhase("result");
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

  const retryRound = () => {
    const seq = randomUniqueSequence(sequenceLength(round));
    sequenceRef.current = seq;
    playSequence(seq, round);
  };

  const onPick = (cell: number) => {
    if (phase !== "play") return;
    const expected = sequenceRef.current[indexRef.current];
    if (cell !== expected) {
      setMistakeCell(cell);
      window.setTimeout(() => setMistakeCell(null), 300);
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current < 0) {
        finish();
        return;
      }
      window.setTimeout(retryRound, 450);
      return;
    }

    indexRef.current += 1;
    setProgress(indexRef.current);
    if (indexRef.current >= sequenceRef.current.length) {
      const gained = 80 + sequenceRef.current.length * 18 + livesRef.current * 12;
      scoreRef.current += gained;
      setScore(scoreRef.current);
      window.setTimeout(nextRound, 450);
    }
  };

  if (phase === "result") {
    return (
      <div className="game-shell">
        <p className="score-line">
          Puntuación final: <strong>{score}</strong>
        </p>
        <p className="game-instructions">Rondas superadas: {Math.min(ROUNDS, round + 1)}</p>
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
        <span className="hud-chip">Vidas {Math.max(0, lives)}</span>
        <span className="hud-chip">Puntos {score}</span>
      </div>
      <p className="game-instructions">
        {phase === "watch"
          ? `Memorizá ${sequenceRef.current.length || sequenceLength(round)} casillas en orden.`
          : `Repetí la secuencia (${progress}/${sequenceRef.current.length}).`}
      </p>

      <div className="grid-memory grid-4">
        {Array.from({ length: TOTAL_CELLS }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`cell-btn ${highlight === i ? "highlight" : ""} ${mistakeCell === i ? "wrong" : ""}`}
            onClick={() => onPick(i)}
            disabled={phase !== "play"}
            aria-label={`Casilla ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
