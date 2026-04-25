import * as THREE from "three";
import type { ExpressionMode, StrokeStyle } from "@/lib/expressionModes";

export type HoldActionType = "clear" | "theme";
export type Locale = "en" | "zh" | "ja";
export type ThemeMode = "light" | "dark";

export type StrokeVisualState = {
  expressionMode: ExpressionMode;
  strokeStyle: StrokeStyle;
  speed: number;
  audioVolume: number;
  directionChanges: number;
};

export type BalloonStroke = {
  id: number;
  points: THREE.Vector3[];
  mesh: THREE.Mesh<THREE.TubeGeometry, THREE.Material>;
  startCap: THREE.Mesh<THREE.SphereGeometry, THREE.Material>;
  endCap: THREE.Mesh<THREE.SphereGeometry, THREE.Material>;
  color: THREE.Color;
  velocityY: number;
  settled: boolean;
  bounce: number;
  baseRadius: number;
  minY: number;
  maxY: number;
  velocityX: number;
  velocityZ: number;
  swayPhase: number;
  swayStrength: number;
  angularVelocity: number;
  tiltAxis: THREE.Vector3;
  contactPivot: THREE.Vector3;
  landed: boolean;
  toppling: boolean;
  settleFrames: number;
  style: StrokeStyle;
};

export type BalloonState = {
  strokes: BalloonStroke[];
  activeStroke: BalloonStroke | null;
  idSeed: number;
  tankDepth: number;
  visuals: StrokeVisualState;
};

export type WindVector = { x: number; y: number; z: number };

export type WallBounds = {
  leftWall: number;
  rightWall: number;
  topWall: number;
  bottomWall: number;
  backWall: number;
  frontWall: number;
};

export type ThreeState = WallBounds & {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  tank: THREE.LineSegments;
  floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  driftParticles: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  animationFrame: number;
  sculptureGroup: THREE.Group;
};

export type WaveGestureState = {
  active: boolean;
  lastX: number;
  lastY: number;
  lastZ: number;
  lastTime: number;
};

export type HoldState = {
  action: HoldActionType | null;
  token: number;
  startedAt: number;
  pendingLostAt: number | null;
  lastShownSecond: number;
  rearmBlockedAction: HoldActionType | null;
};

export type PinchReleaseState = { lostAt: number | null };
export type DrawPoint = { x: number; y: number };

export type GestureFrameData = {
  handPresent: boolean;
  isDrawing: boolean;
  openPalmDetected: boolean;
  fistDetected: boolean;
  point?: { x: number; y: number; z: number };
  speed: number;
};
