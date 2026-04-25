import * as THREE from "three";
import type { ExpressionMode, StrokeStyle } from "@/lib/expressionModes";
import type { AudioMetrics } from "@/hooks/useAudioMetrics";

export type MindSculptSessionSummary = {
  expressionMode: ExpressionMode;
  strokeStyle: StrokeStyle;
  totalStrokes: number;
  totalPoints: number;
  drawingDurationSeconds: number;
  movementEnergy: "low" | "medium" | "high";
  smoothness: "smooth" | "mixed" | "jagged";
  density: "sparse" | "moderate" | "dense";
  expansion: "contained" | "balanced" | "expansive";
  audioIntensity: "quiet" | "moderate" | "intense" | "unavailable";
  silencePattern: "few pauses" | "some pauses" | "many pauses" | "unavailable";
  transcript?: string;
  dominantVisualDescription: string;
};

export type SessionTracker = {
  startedAt: number;
  activeDrawingMs: number;
  totalPoints: number;
  totalStrokes: number;
  totalDistance: number;
  speedSum: number;
  speedSamples: number;
  maxSpeed: number;
  directionChanges: number;
  pauseCount: number;
  openPalmEvents: number;
  fistEvents: number;
  resetEvents: number;
  bounds: THREE.Box3;
  prevPoint: THREE.Vector3 | null;
  prevVector: THREE.Vector3 | null;
  prevTs: number | null;
  pauseStartedAt: number | null;
};

export function createSessionTracker(): SessionTracker {
  return {
    startedAt: performance.now(),
    activeDrawingMs: 0,
    totalPoints: 0,
    totalStrokes: 0,
    totalDistance: 0,
    speedSum: 0,
    speedSamples: 0,
    maxSpeed: 0,
    directionChanges: 0,
    pauseCount: 0,
    openPalmEvents: 0,
    fistEvents: 0,
    resetEvents: 0,
    bounds: new THREE.Box3(),
    prevPoint: null,
    prevVector: null,
    prevTs: null,
    pauseStartedAt: null,
  };
}

export function recordStrokeStart(tracker: SessionTracker) {
  tracker.totalStrokes += 1;
}

export function recordGestureEvent(tracker: SessionTracker, type: "openPalm" | "fist" | "reset") {
  if (type === "openPalm") tracker.openPalmEvents += 1;
  if (type === "fist") tracker.fistEvents += 1;
  if (type === "reset") tracker.resetEvents += 1;
}

export function recordPoint(tracker: SessionTracker, point: THREE.Vector3, isDrawing: boolean, timestamp: number) {
  tracker.totalPoints += 1;
  tracker.bounds.expandByPoint(point);

  if (tracker.prevPoint && tracker.prevTs !== null) {
    const distance = point.distanceTo(tracker.prevPoint);
    const dt = Math.max(0.001, (timestamp - tracker.prevTs) / 1000);
    const speed = distance / dt;

    tracker.totalDistance += distance;
    tracker.speedSum += speed;
    tracker.speedSamples += 1;
    tracker.maxSpeed = Math.max(tracker.maxSpeed, speed);

    const vec = point.clone().sub(tracker.prevPoint).normalize();
    if (tracker.prevVector) {
      const angle = tracker.prevVector.angleTo(vec);
      if (angle > Math.PI / 3) {
        tracker.directionChanges += 1;
      }
    }
    tracker.prevVector = vec;

    if (speed < 7) {
      if (!tracker.pauseStartedAt) tracker.pauseStartedAt = timestamp;
      if (tracker.pauseStartedAt && timestamp - tracker.pauseStartedAt > 700) {
        tracker.pauseCount += 1;
        tracker.pauseStartedAt = timestamp + 99999;
      }
    } else {
      tracker.pauseStartedAt = null;
    }

    if (isDrawing) {
      tracker.activeDrawingMs += dt * 1000;
    }
  }

  tracker.prevPoint = point.clone();
  tracker.prevTs = timestamp;
}

export function toSummary(
  tracker: SessionTracker,
  expressionMode: ExpressionMode,
  strokeStyle: StrokeStyle,
  audio: AudioMetrics,
  transcript?: string
): MindSculptSessionSummary {
  const drawingDurationSeconds = (performance.now() - tracker.startedAt) / 1000;
  const averageSpeed = tracker.speedSamples > 0 ? tracker.speedSum / tracker.speedSamples : 0;
  const activeDrawingSeconds = Math.max(1, tracker.activeDrawingMs / 1000);
  const densityScore = tracker.totalPoints / activeDrawingSeconds;

  const size = tracker.bounds.getSize(new THREE.Vector3());
  const expansionMagnitude = size.length();

  const movementEnergy = tracker.maxSpeed > 110 || averageSpeed > 45 ? "high" : tracker.maxSpeed > 50 ? "medium" : "low";
  const smoothness = tracker.directionChanges > Math.max(8, tracker.totalPoints * 0.18)
    ? "jagged"
    : tracker.directionChanges > Math.max(3, tracker.totalPoints * 0.08)
      ? "mixed"
      : "smooth";
  const density = densityScore > 40 ? "dense" : densityScore > 18 ? "moderate" : "sparse";
  const expansion = expansionMagnitude > 900 ? "expansive" : expansionMagnitude > 500 ? "balanced" : "contained";

  const audioIntensity = !audio.available
    ? "unavailable"
    : audio.averageIntensity > 0.24 || audio.peakIntensity > 0.42
      ? "intense"
      : audio.averageIntensity > 0.1
        ? "moderate"
        : "quiet";

  const silencePattern = !audio.available
    ? "unavailable"
    : audio.silenceDuration > 4
      ? "many pauses"
      : audio.silenceDuration > 2
        ? "some pauses"
        : "few pauses";

  return {
    expressionMode,
    strokeStyle,
    totalStrokes: tracker.totalStrokes,
    totalPoints: tracker.totalPoints,
    drawingDurationSeconds,
    movementEnergy,
    smoothness,
    density,
    expansion,
    audioIntensity,
    silencePattern,
    transcript,
    dominantVisualDescription: `${movementEnergy}, ${smoothness}, ${density} with ${expansion} motion`,
  };
}
