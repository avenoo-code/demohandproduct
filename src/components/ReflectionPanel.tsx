import type { MindSculptReflection } from "@/lib/reflection";
import type { MindSculptSessionSummary } from "@/lib/sessionMetrics";

type Props = {
  summary: MindSculptSessionSummary | null;
  reflection: MindSculptReflection | null;
};

export function ReflectionPanel({ summary, reflection }: Props) {
  if (!summary || !reflection) return null;

  return (
    <aside className="absolute right-4 top-4 z-50 w-[360px] max-w-[90vw] rounded-2xl border border-white/20 bg-black/35 p-4 text-white shadow-[0_0_40px_rgba(255,139,170,.25)] backdrop-blur-md">
      <h2 className="text-xl font-semibold">{reflection.title}</h2>
      <p className="mt-2 text-sm text-rose-100">{reflection.reflection}</p>

      <div className="mt-3 rounded-lg bg-black/25 p-3 text-xs">
        <p>Mode: {summary.expressionMode}</p>
        <p>Style: {summary.strokeStyle}</p>
        <p>Strokes: {summary.totalStrokes}</p>
        <p>Points: {summary.totalPoints}</p>
        <p>Movement Energy: {summary.movementEnergy}</p>
        <p>Smoothness: {summary.smoothness}</p>
        <p>Density: {summary.density}</p>
        <p>Expansion: {summary.expansion}</p>
        <p>Audio: {summary.audioIntensity}</p>
        <p>Silence pattern: {summary.silencePattern}</p>
      </div>

      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-violet-100">
        {reflection.questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ul>
    </aside>
  );
}
