export type ExpressionMode =
  | "calm"
  | "overwhelmed"
  | "anger"
  | "scattered"
  | "hopeful"
  | "numb"
  | "custom";

export type StrokeStyle =
  | "balloon"
  | "ribbon"
  | "glass"
  | "smoke"
  | "crystal"
  | "spark"
  | "thread"
  | "ink";

export type ExpressionVisualConfig = {
  label: string;
  palette: string[];
  glow: number;
  jitter: number;
  particleRate: number;
  drift: number;
  strokeRadiusMultiplier: number;
  opacity: number;
  movementDamping: number;
};

export const EXPRESSION_MODES: Record<ExpressionMode, ExpressionVisualConfig> = {
  calm: {
    label: "Calm",
    palette: ["#8ab6ff", "#b6b7ff", "#9fd8ff"],
    glow: 0.35,
    jitter: 0.01,
    particleRate: 0.2,
    drift: 0.06,
    strokeRadiusMultiplier: 0.86,
    opacity: 0.65,
    movementDamping: 0.82,
  },
  overwhelmed: {
    label: "Overwhelmed",
    palette: ["#8f3fff", "#ff4b6e", "#ff9d3f"],
    glow: 0.8,
    jitter: 0.05,
    particleRate: 0.8,
    drift: 0.16,
    strokeRadiusMultiplier: 1.2,
    opacity: 0.78,
    movementDamping: 0.52,
  },
  anger: {
    label: "Anger",
    palette: ["#ff3a2d", "#ff7b00", "#ffb347"],
    glow: 0.95,
    jitter: 0.08,
    particleRate: 0.9,
    drift: 0.2,
    strokeRadiusMultiplier: 1.1,
    opacity: 0.88,
    movementDamping: 0.45,
  },
  scattered: {
    label: "Scattered",
    palette: ["#5dd9ff", "#d57bff", "#ffc857", "#7dffa1"],
    glow: 0.65,
    jitter: 0.06,
    particleRate: 0.72,
    drift: 0.18,
    strokeRadiusMultiplier: 0.95,
    opacity: 0.68,
    movementDamping: 0.58,
  },
  hopeful: {
    label: "Hopeful",
    palette: ["#ffd98f", "#ffd0f3", "#ffffff", "#ffb777"],
    glow: 0.55,
    jitter: 0.02,
    particleRate: 0.5,
    drift: 0.22,
    strokeRadiusMultiplier: 0.98,
    opacity: 0.74,
    movementDamping: 0.76,
  },
  numb: {
    label: "Numb",
    palette: ["#8da0b8", "#8ca0c8", "#95a4ad"],
    glow: 0.2,
    jitter: 0.006,
    particleRate: 0.12,
    drift: 0.02,
    strokeRadiusMultiplier: 0.74,
    opacity: 0.45,
    movementDamping: 0.92,
  },
  custom: {
    label: "Custom",
    palette: ["#6ec4ff", "#ba9cff", "#ff88b8", "#ffd07e"],
    glow: 0.45,
    jitter: 0.03,
    particleRate: 0.35,
    drift: 0.1,
    strokeRadiusMultiplier: 1,
    opacity: 0.7,
    movementDamping: 0.7,
  },
};

export const STROKE_STYLE_LABELS: Record<StrokeStyle, string> = {
  balloon: "Balloon",
  ribbon: "Ribbon",
  glass: "Glass",
  smoke: "Smoke",
  crystal: "Crystal",
  spark: "Spark",
  thread: "Thread",
  ink: "Ink",
};
