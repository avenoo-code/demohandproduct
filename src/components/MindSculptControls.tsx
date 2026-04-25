import type { ExpressionMode, StrokeStyle } from "@/lib/expressionModes";
import { EXPRESSION_MODES, STROKE_STYLE_LABELS } from "@/lib/expressionModes";

type Props = {
  isSessionActive: boolean;
  expressionMode: ExpressionMode;
  setExpressionMode: (mode: ExpressionMode) => void;
  strokeStyle: StrokeStyle;
  setStrokeStyle: (style: StrokeStyle) => void;
  onStart: () => void;
  onFinish: () => void;
  onReset: () => void;
  micEnabled: boolean;
  setMicEnabled: (enabled: boolean) => void;
  cameraReady: boolean;
  micUnavailable: boolean;
  transcript: string;
  setTranscript: (value: string) => void;
};

export function MindSculptControls({
  isSessionActive,
  expressionMode,
  setExpressionMode,
  strokeStyle,
  setStrokeStyle,
  onStart,
  onFinish,
  onReset,
  micEnabled,
  setMicEnabled,
  cameraReady,
  micUnavailable,
  transcript,
  setTranscript,
}: Props) {
  return (
    <div className="absolute left-4 top-4 z-50 w-[360px] max-w-[90vw] rounded-2xl border border-white/20 bg-black/35 p-4 text-white shadow-[0_0_40px_rgba(124,98,255,.3)] backdrop-blur-md">
      <h1 className="text-2xl font-semibold tracking-tight">MindSculpt</h1>
      <p className="text-sm text-violet-100">Turn feeling into form.</p>
      <p className="mt-2 text-xs text-violet-100/90">
        Use your hand and voice to create a living 3D expression of what you&apos;re feeling. This is not a diagnosis or therapy tool. It is a creative reflection space.
      </p>
      <p className="mt-2 rounded-lg border border-amber-200/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100">
        MindSculpt is a reflective creative tool. It does not diagnose, treat, or replace professional care.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <label className="col-span-2">Expression Mode</label>
        <select
          className="col-span-2 rounded-lg border border-white/20 bg-black/40 px-2 py-2"
          value={expressionMode}
          onChange={(e) => setExpressionMode(e.target.value as ExpressionMode)}
          disabled={isSessionActive}
        >
          {Object.entries(EXPRESSION_MODES).map(([mode, cfg]) => (
            <option key={mode} value={mode}>
              {cfg.label}
            </option>
          ))}
        </select>

        <label className="col-span-2">Stroke Style</label>
        <select
          className="col-span-2 rounded-lg border border-white/20 bg-black/40 px-2 py-2"
          value={strokeStyle}
          onChange={(e) => setStrokeStyle(e.target.value as StrokeStyle)}
          disabled={isSessionActive}
        >
          {Object.entries(STROKE_STYLE_LABELS).map(([style, label]) => (
            <option key={style} value={style}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="rounded-lg bg-violet-500 px-3 py-2 text-sm" onClick={onStart} disabled={isSessionActive}>
          Start Reflection
        </button>
        <button className="rounded-lg bg-rose-500 px-3 py-2 text-sm" onClick={onFinish} disabled={!isSessionActive}>
          Finish Reflection
        </button>
        <button className="rounded-lg bg-slate-700 px-3 py-2 text-sm" onClick={onReset}>
          Reset Sculpture
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <button className="rounded border border-white/25 px-2 py-1" onClick={() => setMicEnabled(!micEnabled)}>
          Mic: {micEnabled ? "On" : "Off"}
        </button>
        <span>Camera: {cameraReady ? "Ready" : "Waiting"}</span>
      </div>
      {micUnavailable && <p className="mt-2 text-xs text-amber-200">Mic unavailable. Gesture-only mode active.</p>}

      <label className="mt-3 block text-xs">Optional: type a few words about what you were feeling.</label>
      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        className="mt-1 h-16 w-full rounded-lg border border-white/20 bg-black/40 p-2 text-xs"
        placeholder="A few words..."
      />

      <div className="mt-3 text-[11px] text-violet-100/80">
        <strong>Gesture guide:</strong> Pinch = draw · Open palm = release/move · Fist hold = clear · Finish Reflection = generate insight
      </div>
    </div>
  );
}
