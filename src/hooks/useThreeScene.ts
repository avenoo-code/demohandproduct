import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { stepPhysics } from "@/lib/balloon/physics";
import { THEME_PALETTES } from "@/lib/themes";
import type { ThreeState, BalloonState, ThemeMode, WindVector } from "@/lib/types";
import { MAX_FRAME_TIME_SECONDS } from "@/lib/constants";
import { EXPRESSION_MODES, type ExpressionMode } from "@/lib/expressionModes";

type UseThreeSceneOptions = {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  themeMode: ThemeMode;
  expressionModeRef: MutableRefObject<ExpressionMode>;
  sessionActiveRef: MutableRefObject<boolean>;
  balloonStateRef: MutableRefObject<BalloonState>;
  windStateRef: MutableRefObject<WindVector>;
  windTargetRef: MutableRefObject<WindVector>;
  enableBalloonFallRef: MutableRefObject<boolean>;
  onResize: (width: number, height: number) => void;
};

export function useThreeScene({
  containerRef,
  themeMode,
  expressionModeRef,
  sessionActiveRef,
  balloonStateRef,
  windStateRef,
  windTargetRef,
  enableBalloonFallRef,
  onResize,
}: UseThreeSceneOptions): {
  threeRef: MutableRefObject<ThreeState | null>;
  canvasSizeRef: MutableRefObject<{ width: number; height: number }>;
} {
  const threeRef = useRef<ThreeState | null>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const themeModeRef = useRef(themeMode);

  useEffect(() => {
    themeModeRef.current = themeMode;
  }, [themeMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const palette = THEME_PALETTES[themeModeRef.current];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#080a14");
    scene.fog = new THREE.Fog("#100d1b", 300, 2300);

    const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(0, 0, 1120);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight("#ffffff", 0.9));
    const keyLight = new THREE.DirectionalLight("#b8dcff", 1.1);
    keyLight.position.set(220, 300, 500);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const rimLight = new THREE.PointLight("#d794ff", 1, 2600);
    rimLight.position.set(-260, 120, 420);
    scene.add(rimLight);

    const tankDepth = Math.max(320, Math.min(window.innerWidth, window.innerHeight) * 0.62);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(window.innerWidth, tankDepth),
      new THREE.MeshStandardMaterial({ color: palette.floor, roughness: 0.92, metalness: 0.08 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -window.innerHeight / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    balloonStateRef.current.tankDepth = tankDepth;

    const tank = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(window.innerWidth, window.innerHeight, tankDepth)),
      new THREE.LineBasicMaterial({ color: "#7461ff", transparent: true, opacity: 0.32 })
    );
    scene.add(tank);

    const sculptureGroup = new THREE.Group();
    scene.add(sculptureGroup);

    const driftParticles = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ color: "#8fa8ff", size: 2, transparent: true, opacity: 0.5 })
    );
    const particleCount = 260;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * window.innerWidth;
      positions[i * 3 + 1] = (Math.random() - 0.5) * window.innerHeight;
      positions[i * 3 + 2] = (Math.random() - 0.5) * tankDepth;
    }
    driftParticles.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    scene.add(driftParticles);

    const three: ThreeState = {
      scene,
      camera,
      renderer,
      tank,
      floor,
      driftParticles,
      sculptureGroup,
      animationFrame: 0,
      leftWall: -window.innerWidth / 2,
      rightWall: window.innerWidth / 2,
      topWall: window.innerHeight / 2,
      bottomWall: -window.innerHeight / 2,
      backWall: -tankDepth / 2,
      frontWall: tankDepth / 2,
    };
    threeRef.current = three;

    let previous = performance.now();
    const animate = () => {
      if (!threeRef.current) return;
      const now = performance.now();
      const deltaSeconds = Math.min((now - previous) / 1000, MAX_FRAME_TIME_SECONDS);
      previous = now;

      stepPhysics(
        deltaSeconds,
        balloonStateRef.current,
        threeRef.current,
        windStateRef.current,
        windTargetRef.current,
        enableBalloonFallRef.current
      );

      const modeConfig = EXPRESSION_MODES[expressionModeRef.current];
      const attrs = driftParticles.geometry.getAttribute("position");
      for (let i = 0; i < attrs.count; i++) {
        const y = attrs.getY(i) - deltaSeconds * (10 + modeConfig.drift * 20);
        attrs.setY(i, y < three.bottomWall ? three.topWall : y);
      }
      attrs.needsUpdate = true;

      if (!sessionActiveRef.current) {
        three.sculptureGroup.rotation.y += deltaSeconds * 0.15;
      }

      three.renderer.render(three.scene, three.camera);
      three.animationFrame = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const activeThree = threeRef.current;
      if (!activeThree) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const depth = Math.max(320, Math.min(width, height) * 0.62);
      balloonStateRef.current.tankDepth = depth;
      canvasSizeRef.current = { width, height };
      onResize(width, height);
      activeThree.camera.aspect = width / height;
      activeThree.camera.updateProjectionMatrix();
      activeThree.renderer.setSize(width, height);
      activeThree.leftWall = -width / 2;
      activeThree.rightWall = width / 2;
      activeThree.topWall = height / 2;
      activeThree.bottomWall = -height / 2;
      activeThree.backWall = -depth / 2;
      activeThree.frontWall = depth / 2;
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(three.animationFrame);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      threeRef.current = null;
    };
  }, [balloonStateRef, containerRef, enableBalloonFallRef, expressionModeRef, onResize, sessionActiveRef, themeModeRef, windStateRef, windTargetRef]);

  return { threeRef, canvasSizeRef };
}
