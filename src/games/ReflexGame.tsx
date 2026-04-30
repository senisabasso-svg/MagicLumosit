import { useEffect, useRef, useState } from "react";

const TRIALS = 12;
const STIMULUS_MS = 1700;

const COLORS = [
  { id: "violeta", css: "#a78bfa" },
  { id: "cian", css: "#22d3ee" },
  { id: "lima", css: "#84cc16" },
  { id: "coral", css: "#fb7185" }
] as const;

const SHAPES = ["circulo", "triangulo", "cuadrado", "rombo"] as const;

type ColorId = (typeof COLORS)[number]["id"];
type ShapeId = (typeof SHAPES)[number];

type Stimulus = {
  color: ColorId;
  shape: ShapeId;
  symbol: string;
};

type Rule = {
  id: string;
  label: string;
  check: (s: Stimulus) => boolean;
};

const RULES: Rule[] = [
  {
    id: "color-cian",
    label: "Tocá SI solo si el color es cian",
    check: (s) => s.color === "cian"
  },
  {
    id: "shape-triangulo",
    label: "Tocá SI solo si la forma es triángulo",
    check: (s) => s.shape === "triangulo"
  },
  {
    id: "mismatch",
    label: "Tocá SI si color y forma NO combinan",
    check: (s) => {
      const map: Record<ColorId, ShapeId> = {
        violeta: "circulo",
        cian: "triangulo",
        lima: "cuadrado",
        coral: "rombo"
      };
      return map[s.color] !== s.shape;
    }
  }
];

const SYMBOL_BY_SHAPE: Record<ShapeId, string> = {
  circulo: "?",
  triangulo: "?",
  cuadrado: "¦",
  rombo: "?"
};

type Phase = "ready" | "waiting" | "active" | "feedback" | "result";

type Props = {
  onDone: (score: number) => void;
  onBack: () => void;
};

function sample<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createStimulus(): Stimulus {
  const color = sample(COLORS).id;
  const shape = sample(SHAPES);
  return { color, shape, symbol: SYMBOL_BY_SHAPE[shape] };
}

export function ReflexGame({ onDone, onBack }: Props) {
  const [trial, setTrial] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [avgRt, setAvgRt] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [stimulus, setStimulus] = useState<Stimulus | null>(null);
  const [finished, setFinished] = useState(false);

  const scoreRef = useRef(0);
  const hitsRef = useRef(0);
  const totalRtRef = useRef(0);
  const activeSinceRef = useRef(0);
  const currentRuleRef = useRef<Rule>(RULES[0]);
  const stimulusRef = useRef<Stimulus | null>(null);
  const timersRef = useRef<number[]>([]);
  const reportedRef = useRef(false);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const finish = () => {
    setFinished(true);
    setPhase("result");
    if (!reportedRef.current) {
      reportedRef.current = true;
      onDone(scoreRef.current);
    }
  };

  const queueNext = (nextTrial: number) => {
    if (nextTrial >= TRIALS) {
      finish();
      return;
    }
    setTrial(nextTrial);
    setPhase("ready");
  };

  const applyAnswer = (answerYes: boolean, timeout = false) => {
    if (phase !== "active") return;
    const currentStimulus = stimulusRef.current;
    if (!currentStimulus) return;

    clearTimers();

    const shouldYes = currentRuleRef.current.check(currentStimulus);
    const rt = Math.max(0, performance.now() - activeSinceRef.current);
    const correct = timeout ? !shouldYes : answerYes === shouldYes;

    if (correct) {
      const speedBonus = Math.max(10, Math.floor(120 - rt / 14));
      const gained = 70 + speedBonus;
      scoreRef.current += gained;
      hitsRef.current += 1;
      totalRtRef.current += rt;
      setScore(scoreRef.current);
      setHits(hitsRef.current);
      setAvgRt(Math.round(totalRtRef.current / hitsRef.current));
      setFeedback(`+${gained} | ${Math.round(rt)} ms`);
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - 30);
      setScore(scoreRef.current);
      if (timeout) setFeedback("Tiempo agotado (-30)");
      else setFeedback("Error de decisión (-30)");
    }

    setPhase("feedback");
    const t = window.setTimeout(() => queueNext(trial + 1), 650);
    timersRef.current.push(t);
  };

  const startTrial = () => {
    if (phase !== "ready" || finished) return;
    const rule = RULES[Math.floor(trial / 4) % RULES.length];
    currentRuleRef.current = rule;
    const next = createStimulus();
    stimulusRef.current = next;
    setStimulus(next);
    setFeedback("");
    setPhase("waiting");

    const wait = 550 + Math.random() * 1300;
    const t1 = window.setTimeout(() => {
      activeSinceRef.current = performance.now();
      setPhase("active");
      const t2 = window.setTimeout(() => applyAnswer(false, true), STIMULUS_MS);
      timersRef.current.push(t2);
    }, wait);
    timersRef.current.push(t1);
  };

  const rule = currentRuleRef.current;

  if (phase === "result") {
    return (
      <div className="game-shell">
        <div className="hud-row">
          <span className="hud-chip">Aciertos {hits}/{TRIALS}</span>
          <span className="hud-chip">RT medio {avgRt || 0} ms</span>
        </div>
        <p className="score-line">
          Puntuación final: <strong>{score}</strong>
        </p>
        <button type="button" className="big-btn" onClick={onBack}>
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="game-shell">
      <div className="hud-row">
        <span className="hud-chip">Ronda {trial + 1}/{TRIALS}</span>
        <span className="hud-chip">Puntos {score}</span>
      </div>
      <p className="game-instructions">{rule.label}</p>

      <div className="stimulus-card">
        {phase === "ready" && <span className="muted-big">Preparado</span>}
        {phase === "waiting" && <span className="muted-big">...</span>}
        {(phase === "active" || phase === "feedback") && stimulus && (
          <>
            <span className="stim-symbol" style={{ color: COLORS.find((c) => c.id === stimulus.color)?.css }}>
              {stimulus.symbol}
            </span>
            <span className="stim-label">
              {stimulus.color} + {stimulus.shape}
            </span>
          </>
        )}
      </div>

      {feedback && <p className="game-instructions">{feedback}</p>}

      {phase === "ready" ? (
        <button type="button" className="big-btn" onClick={startTrial}>
          Iniciar ronda
        </button>
      ) : (
        <div className="option-grid two">
          <button type="button" className="option-btn" onClick={() => applyAnswer(true)} disabled={phase !== "active"}>
            SI
          </button>
          <button
            type="button"
            className="option-btn secondary"
            onClick={() => applyAnswer(false)}
            disabled={phase !== "active"}
          >
            NO
          </button>
        </div>
      )}
    </div>
  );
}
