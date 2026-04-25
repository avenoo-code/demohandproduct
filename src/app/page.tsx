"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { useAppSettings } from "@/hooks/useAppSettings";
import { useThreeScene } from "@/hooks/useThreeScene";
import { useGestureLoop } from "@/hooks/useGestureLoop";
import { useAudioMetrics } from "@/hooks/useAudioMetrics";
import { MindSculptControls } from "@/components/MindSculptControls";
import { ReflectionPanel } from "@/components/ReflectionPanel";
import { clearAllStrokes, releaseActiveStroke } from "@/lib/balloon/stroke";
import { EXPRESSION_MODES, type ExpressionMode, type StrokeStyle } from "@/lib/expressionModes";
import {
  createSessionTracker,
  recordGestureEvent,
  recordPoint,
  recordStrokeStart,
  toSummary,
  type MindSculptSessionSummary,
} from "@/lib/sessionMetrics";
import { generateReflection, type MindSculptReflection } from "@/lib/reflection";
import type { BalloonState, HoldActionType, HoldState, PinchReleaseState, DrawPoint } from "@/lib/types";

export default function Home() {
  const [canvasSize, setCanvasSize] = useState([0, 0]);
  const [holdCountdown, setHoldCountdown] = useState<{ action: HoldActionType; seconds: number } | null>(null);
  const [expressionMode, setExpressionMode] = useState<ExpressionMode>("overwhelmed");
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>("spark");
  const [sessionActive, setSessionActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState<MindSculptSessionSummary | null>(null);
  const [reflection, setReflection] = useState<MindSculptReflection | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);

  const sessionActiveRef = useRef(false);
  const expressionModeRef = useRef(expressionMode);
  const metricsRef = useRef(createSessionTracker());

  const {
    themeMode,
    toggleThemeMode,
    enableBalloonFallRef,
    enableGestureWindRef,
    windStateRef,
    windTargetRef,
    waveGestureStateRef,
  } = useAppSettings();

  const { metrics: audioMetrics, start: startAudio, stop: stopAudio, resetSessionStats } = useAudioMetrics();

  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkCanvasRef = useRef<HTMLCanvasElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);

  const previousDrawPointRef = useRef<DrawPoint>({ x: 0, y: 0 });
  const balloonStateRef = useRef<BalloonState>({
    strokes: [],
    activeStroke: null,
    idSeed: 0,
    tankDepth: 360,
    visuals: {
      expressionMode,
      strokeStyle,
      speed: 0,
      audioVolume: 0,
      directionChanges: 0,
    },
  });
  const holdStateRef = useRef<HoldState>({
    action: null,
    token: 0,
    startedAt: 0,
    pendingLostAt: null,
    lastShownSecond: 0,
    rearmBlockedAction: null,
  });
  const pinchReleaseStateRef = useRef<PinchReleaseState>({ lostAt: null });

  const { threeRef, canvasSizeRef } = useThreeScene({
    containerRef: threeContainerRef,
    themeMode,
    expressionModeRef,
    sessionActiveRef,
    balloonStateRef,
    windStateRef,
    windTargetRef,
    enableBalloonFallRef,
    onResize: (w, h) => setCanvasSize([w, h]),
  });

  const lastOpenPalmRef = useRef(false);
  const lastFistRef = useRef(false);
  const lastStrokeIdRef = useRef<number | null>(null);

  const onGestureFrame = useCallback(
    (frame: { handPresent: boolean; isDrawing: boolean; openPalmDetected: boolean; fistDetected: boolean; point?: { x: number; y: number; z: number }; speed: number }) => {
      balloonStateRef.current.visuals.speed = frame.speed;
      balloonStateRef.current.visuals.audioVolume = audioMetrics.volume;

      if (frame.openPalmDetected && !lastOpenPalmRef.current) {
        recordGestureEvent(metricsRef.current, "openPalm");
      }
      if (frame.fistDetected && !lastFistRef.current) {
        recordGestureEvent(metricsRef.current, "fist");
      }
      lastOpenPalmRef.current = frame.openPalmDetected;
      lastFistRef.current = frame.fistDetected;

      const activeStrokeId = balloonStateRef.current.activeStroke?.id ?? null;
      if (activeStrokeId && activeStrokeId !== lastStrokeIdRef.current) {
        recordStrokeStart(metricsRef.current);
        lastStrokeIdRef.current = activeStrokeId;
      }

      if (frame.point) {
        recordPoint(metricsRef.current, new THREE.Vector3(frame.point.x, frame.point.y, frame.point.z), frame.isDrawing, performance.now());
      }
    },
    [audioMetrics.volume]
  );

  useGestureLoop({
    sessionActiveRef,
    videoRef,
    landmarkCanvasRef,
    canvasSizeRef,
    threeRef,
    balloonStateRef,
    windTargetRef,
    waveGestureStateRef,
    holdStateRef,
    pinchReleaseStateRef,
    previousDrawPointRef,
    enableGestureWindRef,
    setHoldCountdown,
    toggleThemeMode,
    onCameraStatusChange: setCameraReady,
    onGestureFrame,
    onResetGesture: () => recordGestureEvent(metricsRef.current, "reset"),
  });

  const startReflection = useCallback(async () => {
    setSummary(null);
    setReflection(null);
    metricsRef.current = createSessionTracker();
    resetSessionStats();
    sessionActiveRef.current = true;
    setSessionActive(true);
    if (micEnabled) {
      await startAudio();
    }
  }, [micEnabled, resetSessionStats, startAudio]);

  const finishReflection = useCallback(() => {
    sessionActiveRef.current = false;
    setSessionActive(false);
    stopAudio();

    const three = threeRef.current;
    if (three && balloonStateRef.current.activeStroke) {
      releaseActiveStroke(balloonStateRef.current, three.scene, pinchReleaseStateRef.current, previousDrawPointRef.current);
    }

    const sessionSummary = toSummary(metricsRef.current, expressionMode, strokeStyle, audioMetrics, transcript || undefined);
    setSummary(sessionSummary);
    setReflection(generateReflection(sessionSummary));
  }, [audioMetrics, expressionMode, stopAudio, strokeStyle, threeRef, transcript]);

  const resetSculpture = useCallback(() => {
    const three = threeRef.current;
    if (three) {
      clearAllStrokes(balloonStateRef.current, three.scene, pinchReleaseStateRef.current, previousDrawPointRef.current);
    }
    metricsRef.current = createSessionTracker();
    recordGestureEvent(metricsRef.current, "reset");
    setSummary(null);
    setReflection(null);
    setTranscript("");
  }, [threeRef]);

  expressionModeRef.current = expressionMode;
  balloonStateRef.current.visuals.expressionMode = expressionMode;
  balloonStateRef.current.visuals.strokeStyle = strokeStyle;
  balloonStateRef.current.visuals.audioVolume = audioMetrics.volume;

  const modeTint = useMemo(() => EXPRESSION_MODES[expressionMode].palette[0], [expressionMode]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: "radial-gradient(circle at top, #1b1633 0%, #080a14 65%)" }}>
      <div ref={threeContainerRef} className="fixed inset-0 z-0" />

      <canvas
        ref={landmarkCanvasRef}
        className="fixed inset-0 z-20 pointer-events-none"
        width={canvasSize[0] || 640}
        height={canvasSize[1] || 480}
        style={{ transform: "rotateY(180deg)" }}
      />

      <video
        playsInline
        ref={videoRef}
        autoPlay
        muted
        className="fixed right-4 bottom-4 w-36 rounded-xl border border-white/20 z-30"
        style={{ transform: "rotateY(180deg)", opacity: 0.85 }}
      />

      <MindSculptControls
        isSessionActive={sessionActive}
        expressionMode={expressionMode}
        setExpressionMode={setExpressionMode}
        strokeStyle={strokeStyle}
        setStrokeStyle={setStrokeStyle}
        onStart={startReflection}
        onFinish={finishReflection}
        onReset={resetSculpture}
        micEnabled={micEnabled}
        setMicEnabled={setMicEnabled}
        cameraReady={cameraReady}
        micUnavailable={audioMetrics.micDenied}
        transcript={transcript}
        setTranscript={setTranscript}
      />

      <ReflectionPanel summary={summary} reflection={reflection} />

      <div className="pointer-events-none fixed bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/20 bg-black/30 px-4 py-1 text-xs text-violet-100">
        Emotion goes in → 3D expression comes out → insight comes back.
      </div>

      {holdCountdown !== null && (
        <div className="fixed inset-0 z-45 flex items-center justify-center pointer-events-none text-white">
          <div className="rounded-xl border border-white/30 bg-black/45 px-6 py-4 text-center font-semibold text-2xl">
            <div>{holdCountdown.action === "clear" ? "Hold fist to clear" : "Hold to switch theme"}</div>
            <div className="text-4xl mt-1">{holdCountdown.seconds}</div>
          </div>
        </div>
      )}

      <div className="fixed left-4 bottom-4 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs text-white/85" style={{ boxShadow: `0 0 18px ${modeTint}60` }}>
        Privacy: raw video/audio is processed live only in your browser. MindSculpt stores session metrics only.
      </div>
    </div>
  );
}
