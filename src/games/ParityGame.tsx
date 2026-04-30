import { useEffect, useRef, useState } from "react";

const ROUNDS = 10;

type RuleType = "paridad" | "signo" | "multiple3" | "primo";

type Challenge = {
  expression: string;
  value: number;
  rule: RuleType;
};

type Props = {
  onDone: (score: number) => void;
  onBack: () => void;
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isPrime(n: number): boolean {
  if (n <= 1 || n % 1 !== 0) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function createChallenge(round: number): Challenge {
  const a = randomInt(-18, 28);
  const b = randomInt(2, 14);
  const op = sample<["+", "-", "x"]>(["+", "-", "x"]);
  const value = op === "+" ? a + b : op === "-" ? a - b : a * b;
  const expression = `${a} ${op} ${b}`;
  const order: RuleType[] = ["paridad", "multiple3", "signo", "primo"];
  return { expression, value, rule: order[round % order.length] };
}

function sample<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function ruleText(rule: RuleType): string {
  if (rule === "paridad") return "¿El resultado es par?";
  if (rule === "multiple3") return "¿Es múltiplo de 3?";
  if (rule === "signo") return "¿Es positivo?";
  return "¿Es número primo?";
}

function evaluate(rule: RuleType, value: number): boolean {
  if (rule === "paridad") return value % 2 === 0;
  if (rule === "multiple3") return value % 3 === 0;
  if (rule === "signo") return value > 0;
  return isPrime(value);
}

export function ParityGame({ onDone, onBack }: Props) {
  const [round, setRound] = useState(0);
  const [challenge, setChallenge] = useState<Challenge>(() => createChallenge(0));
  const [score, setScore] = useState(0);
  const [leftMs, setLeftMs] = useState(3200);
  const [feedback, setFeedback] = useState("");
  const [finished, setFinished] = useState(false);

  const scoreRef = useRef(0);
  const answeredRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (finished) return;
    answeredRef.current = false;
    const next = createChallenge(round);
    setChallenge(next);
    setFeedback("");
    const limit = Math.max(1400, 3200 - round * 180);
    setLeftMs(limit);
    const started = performance.now();

    const timer = window.setInterval(() => {
      if (answeredRef.current) return;
      const elapsed = performance.now() - started;
      const remain = Math.max(0, limit - elapsed);
      setLeftMs(remain);
      if (remain <= 0) {
        answeredRef.current = true;
        setFeedback("Sin tiempo (-20)");
        scoreRef.current = Math.max(0, scoreRef.current - 20);
        setScore(scoreRef.current);
        window.setTimeout(advanceRound, 450);
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

  const advanceRound = () => {
    setRound((prev) => {
      const nr = prev + 1;
      if (nr >= ROUNDS) {
        finish();
        return prev;
      }
      return nr;
    });
  };

  const answer = (yes: boolean) => {
    if (finished || answeredRef.current) return;
    answeredRef.current = true;
    const expected = evaluate(challenge.rule, challenge.value);
    if (yes === expected) {
      const gained = 70 + Math.round(leftMs / 26);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      setFeedback(`Correcto (+${gained})`);
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - 28);
      setScore(scoreRef.current);
      setFeedback(`Error (-28) · valor ${challenge.value}`);
    }
    window.setTimeout(advanceRound, 450);
  };

  if (finished) {
    return (
      <div className="game-shell">
        <p className="score-line">
          Puntuación final: <strong>{score}</strong>
        </p>
        <p className="game-instructions">Rondas completadas: {ROUNDS}</p>
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
        <span className="hud-chip">Tiempo {(leftMs / 1000).toFixed(1)}s</span>
        <span className="hud-chip">Puntos {score}</span>
      </div>

      <p className="game-instructions">{ruleText(challenge.rule)}</p>
      <div className="math-challenge">{challenge.expression}</div>

      <div className="option-grid two">
        <button type="button" className="option-btn" onClick={() => answer(true)}>
          SI
        </button>
        <button type="button" className="option-btn secondary" onClick={() => answer(false)}>
          NO
        </button>
      </div>
      {feedback && <p className="game-instructions">{feedback}</p>}
    </div>
  );
}
