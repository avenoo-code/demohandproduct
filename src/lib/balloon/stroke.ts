import * as THREE from "three";
import type { BalloonState, ThreeState, PinchReleaseState, DrawPoint } from "../types";
import {
  SMOOTHING_FACTOR,
  MIN_POINTS_FOR_BALLOON,
  MIN_POINT_DISTANCE,
  WAVE_PERIOD,
  WAVE_DEPTH_RATIO,
  DRAWING_ANIMATION_PERIOD,
  DRAWING_ANIMATION_AMPLITUDE,
  END_CAP_PROTRUSION,
  END_CAP_WIDTH_SEGMENTS,
  END_CAP_HEIGHT_SEGMENTS,
  SWAY_STRENGTH,
  BALLOON_DEFAULT_RADIUS,
  BALLOON_RADIUS_VARIANCE,
} from "../constants";
import { rebuildBalloonGeometry, clampInsideTank } from "./geometry";
import { EXPRESSION_MODES } from "@/lib/expressionModes";

export function addPointToActiveStroke(
  x: number,
  y: number,
  three: ThreeState,
  canvasSize: { width: number; height: number },
  balloonState: BalloonState
): { point: THREE.Vector3; startedStroke: boolean } {
  const depth = balloonState.tankDepth;
  const worldX = x - canvasSize.width / 2;
  const worldY = canvasSize.height / 2 - y;
  const wave = Math.sin(performance.now() / WAVE_PERIOD + balloonState.idSeed) * (depth * WAVE_DEPTH_RATIO);
  const modeConfig = EXPRESSION_MODES[balloonState.visuals.expressionMode];
  const jitter = modeConfig.jitter;
  const worldZ = wave + (Math.random() - 0.5) * depth * jitter;

  const point = new THREE.Vector3(worldX, worldY, worldZ);
  clampInsideTank(point, three);

  if (!balloonState.activeStroke) {
    const colorHex = modeConfig.palette[Math.floor(Math.random() * modeConfig.palette.length)];
    const color = new THREE.Color(colorHex);
    const material = makeMaterial(balloonState.visuals.strokeStyle, color, modeConfig.opacity, modeConfig.glow, balloonState.visuals.audioVolume);

    const starterCurve = new THREE.CatmullRomCurve3([point.clone(), point.clone().add(new THREE.Vector3(1, 1, 0))]);
    const radius = computeRadius(balloonState);
    const starterGeometry = new THREE.TubeGeometry(starterCurve, 8, radius, radialSegmentsForStyle(balloonState.visuals.strokeStyle), false);
    const mesh = new THREE.Mesh(starterGeometry, material);
    const startCap = new THREE.Mesh(new THREE.SphereGeometry(radius * END_CAP_PROTRUSION, END_CAP_WIDTH_SEGMENTS, END_CAP_HEIGHT_SEGMENTS), material);
    const endCap = new THREE.Mesh(new THREE.SphereGeometry(radius * END_CAP_PROTRUSION, END_CAP_WIDTH_SEGMENTS, END_CAP_HEIGHT_SEGMENTS), material);

    startCap.position.copy(point);
    endCap.position.copy(point);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    startCap.castShadow = true;
    endCap.castShadow = true;

    three.sculptureGroup.add(mesh, startCap, endCap);

    balloonState.activeStroke = {
      id: ++balloonState.idSeed,
      points: [point],
      mesh,
      startCap,
      endCap,
      color,
      velocityY: 0,
      settled: false,
      bounce: 1,
      baseRadius: radius,
      minY: point.y,
      maxY: point.y,
      velocityX: (Math.random() - 0.5) * 8,
      velocityZ: (Math.random() - 0.5) * 8,
      swayPhase: Math.random() * Math.PI * 2,
      swayStrength: SWAY_STRENGTH * (0.7 + Math.random() * 0.6),
      angularVelocity: 0,
      tiltAxis: new THREE.Vector3(1, 0, 0),
      contactPivot: new THREE.Vector3(point.x, point.y, point.z),
      landed: false,
      toppling: false,
      settleFrames: 0,
      style: balloonState.visuals.strokeStyle,
    };
    balloonState.strokes.push(balloonState.activeStroke);

    if (balloonState.visuals.strokeStyle === "spark" || balloonState.visuals.speed > 70) {
      emitSparkBurst(three.sculptureGroup, point, color, 6 + Math.round(balloonState.visuals.audioVolume * 12));
    }

    return { point, startedStroke: true };
  }

  const stroke = balloonState.activeStroke;
  const last = stroke.points[stroke.points.length - 1];
  const smoothedPoint = new THREE.Vector3(
    last.x + SMOOTHING_FACTOR * (point.x - last.x),
    last.y + SMOOTHING_FACTOR * (point.y - last.y),
    last.z + SMOOTHING_FACTOR * (point.z - last.z)
  );

  if (smoothedPoint.distanceTo(last) < MIN_POINT_DISTANCE) {
    return { point: smoothedPoint, startedStroke: false };
  }

  stroke.points.push(smoothedPoint);
  stroke.baseRadius = computeRadius(balloonState);
  rebuildBalloonGeometry(stroke, 1 + Math.sin(performance.now() / DRAWING_ANIMATION_PERIOD) * DRAWING_ANIMATION_AMPLITUDE);

  if (stroke.style === "spark" && Math.random() < 0.45) {
    emitSparkBurst(three.sculptureGroup, smoothedPoint, stroke.color, 3 + Math.round(balloonState.visuals.audioVolume * 10));
  }

  return { point: smoothedPoint, startedStroke: false };
}

function computeRadius(balloonState: BalloonState): number {
  const mode = EXPRESSION_MODES[balloonState.visuals.expressionMode];
  const speedBoost = Math.min(1.4, balloonState.visuals.speed / 120);
  const audioBoost = balloonState.visuals.audioVolume * 0.5;
  const styleScale: Record<string, number> = {
    balloon: 1,
    ribbon: 1.25,
    glass: 0.95,
    smoke: 0.75,
    crystal: 0.85,
    spark: 0.55,
    thread: 0.45,
    ink: 0.9,
  };
  return (BALLOON_DEFAULT_RADIUS + Math.random() * BALLOON_RADIUS_VARIANCE) * mode.strokeRadiusMultiplier * (1 + speedBoost + audioBoost) * (styleScale[balloonState.visuals.strokeStyle] ?? 1);
}

function makeMaterial(style: string, color: THREE.Color, opacity: number, glow: number, audioVolume: number): THREE.Material {
  if (style === "glass") {
    return new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: Math.min(0.45, opacity),
      transmission: 0.85,
      roughness: 0.1,
      metalness: 0.05,
      emissive: color.clone().multiplyScalar(glow * (0.3 + audioVolume)),
    });
  }

  const roughnessByStyle: Record<string, number> = {
    ribbon: 0.45,
    spark: 0.35,
    smoke: 0.9,
    crystal: 0.2,
    ink: 0.7,
    thread: 0.6,
    balloon: 0.2,
  };

  return new THREE.MeshStandardMaterial({
    color,
    roughness: roughnessByStyle[style] ?? 0.2,
    metalness: style === "crystal" ? 0.7 : 0.25,
    transparent: style !== "balloon" || opacity < 0.95,
    opacity: style === "smoke" ? Math.min(0.35, opacity) : opacity,
    emissive: color.clone().multiplyScalar(glow * (0.25 + audioVolume)),
  });
}

function radialSegmentsForStyle(style: string): number {
  if (style === "ribbon") return 5;
  if (style === "crystal") return 4;
  if (style === "thread") return 6;
  if (style === "spark") return 8;
  return 12;
}

function emitSparkBurst(group: THREE.Group, point: THREE.Vector3, color: THREE.Color, count: number) {
  for (let i = 0; i < count; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.2 + Math.random() * 1.8, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
    );
    mesh.position.copy(point).add(new THREE.Vector3((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18));
    group.add(mesh);
    setTimeout(() => {
      group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }, 420 + Math.random() * 260);
  }
}

export function releaseActiveStroke(
  balloonState: BalloonState,
  scene: THREE.Scene,
  pinchReleaseState: PinchReleaseState,
  previousDrawPoint: DrawPoint
): void {
  const stroke = balloonState.activeStroke;
  if (!stroke) return;

  if (stroke.points.length < MIN_POINTS_FOR_BALLOON) {
    scene.remove(stroke.mesh, stroke.startCap, stroke.endCap);
    stroke.mesh.geometry.dispose();
    stroke.startCap.geometry.dispose();
    stroke.endCap.geometry.dispose();
    if (Array.isArray(stroke.mesh.material)) stroke.mesh.material.forEach((m) => m.dispose());
    else stroke.mesh.material.dispose();
    balloonState.strokes = balloonState.strokes.filter((entry) => entry.id !== stroke.id);
  } else {
    stroke.velocityY = -40;
    stroke.bounce = 1;
    stroke.landed = false;
    stroke.toppling = false;
    stroke.angularVelocity = 0;
    rebuildBalloonGeometry(stroke, 1);
  }

  balloonState.activeStroke = null;
  pinchReleaseState.lostAt = null;
  previousDrawPoint.x = 0;
  previousDrawPoint.y = 0;
}

export function clearAllStrokes(
  balloonState: BalloonState,
  scene: THREE.Scene,
  pinchReleaseState: PinchReleaseState,
  previousDrawPoint: DrawPoint
): void {
  releaseActiveStroke(balloonState, scene, pinchReleaseState, previousDrawPoint);
  balloonState.strokes.forEach((stroke) => {
    scene.remove(stroke.mesh, stroke.startCap, stroke.endCap);
    stroke.mesh.geometry.dispose();
    stroke.startCap.geometry.dispose();
    stroke.endCap.geometry.dispose();
    if (Array.isArray(stroke.mesh.material)) stroke.mesh.material.forEach((m) => m.dispose());
    else stroke.mesh.material.dispose();
  });
  balloonState.strokes = [];
}
