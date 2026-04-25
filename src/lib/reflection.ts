import type { MindSculptSessionSummary } from "@/lib/sessionMetrics";

export type MindSculptReflection = {
  title: string;
  reflection: string;
  questions: string[];
};

export function generateReflection(summary: MindSculptSessionSummary): MindSculptReflection {
  let title = "Shape of the Moment";
  let reflection = `Your sculpture shows a pattern of ${summary.movementEnergy}, ${summary.smoothness}, and ${summary.density}. What does that shape seem to say that words did not?`;

  if (
    summary.expressionMode === "overwhelmed" &&
    summary.movementEnergy === "high" &&
    summary.smoothness === "jagged"
  ) {
    title = "Compressed Momentum";
    reflection = "Your sculpture became fast, dense, and jagged. That may point to pressure or urgency. Does this feel more like stress, frustration, or feeling overloaded?";
  } else if (
    summary.expressionMode === "calm" &&
    summary.smoothness === "smooth" &&
    summary.movementEnergy === "low"
  ) {
    title = "Quiet Current";
    reflection = "Your sculpture moved slowly and smoothly, with softer changes. This may reflect steadiness or a need for quiet. What helped create that sense of calm?";
  } else if (
    summary.expressionMode === "numb" &&
    summary.audioIntensity === "quiet" &&
    summary.density === "sparse"
  ) {
    title = "Muted Outline";
    reflection = "Your sculpture stayed muted and sparse. Rather than forcing an interpretation, it may be worth asking: does this feel like quiet, tiredness, or distance from the feeling?";
  } else if (summary.expressionMode === "hopeful" && summary.expansion === "expansive") {
    title = "Lifted Horizon";
    reflection = "Your sculpture expanded upward and outward. That may suggest energy, possibility, or relief. What part of that feeling do you want to carry forward?";
  }

  return {
    title,
    reflection,
    questions: [
      "What part of the sculpture feels most true to what you were feeling?",
      "If this sculpture had a title, what would you call it?",
    ],
  };
}
