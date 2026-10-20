import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { observeResize } from "./observeResize";
import type { SceneData, WeddingScene } from "./scene/WeddingScene";

export interface Hy3dCanvasHandle {
  setProgress: (progress: number) => void;
}

interface Props {
  data: SceneData;
  onUnavailable: () => void;
}

interface DeviceOrientationPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

function isLowPower() {
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (navigator.hardwareConcurrency || 8) <= 4
    || (navigatorWithMemory.deviceMemory ?? 8) <= 3
    || navigatorWithMemory.connection?.saveData === true;
}

// ── Canvas ────────────────────────────────────────────────────────────────────
const Hy3dCanvas = forwardRef<Hy3dCanvasHandle, Props>(function Hy3dCanvas({ data, onUnavailable }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<WeddingScene | null>(null);
  const pendingProgress = useRef(0);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    setProgress: (progress: number) => {
      pendingProgress.current = progress;
      sceneRef.current?.setProgress(progress);
    },
  }), []);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    // Load three.js after the first paint so the invitation text shows immediately.
    const timer = window.setTimeout(() => {
      import("./scene/WeddingScene")
        .then(async ({ WeddingScene }) => {
          const canvas = canvasRef.current;
          if (disposed || !canvas) return;
          const scene = new WeddingScene(canvas, data, { lowPower: isLowPower() });
          await scene.init();
          if (disposed) {
            scene.dispose();
            return;
          }
          sceneRef.current = scene;
          if (pendingProgress.current) scene.setProgress(pendingProgress.current);
          scene.start();
          setReady(true);

          const stopObserving = observeResize(canvas, () => scene.resize());
          const onVisibility = () => scene.setVisible(document.visibilityState === "visible");
          document.addEventListener("visibilitychange", onVisibility);
          const onLost = (event: Event) => {
            event.preventDefault();
            onUnavailable();
          };
          canvas.addEventListener("webglcontextlost", onLost);

          cleanup = () => {
            stopObserving();
            document.removeEventListener("visibilitychange", onVisibility);
            canvas.removeEventListener("webglcontextlost", onLost);
            window.removeEventListener("deviceorientation", onOrientation);
            scene.dispose();
            sceneRef.current = null;
          };
        })
        .catch(() => {
          if (!disposed) onUnavailable();
        });
    }, 60);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      cleanup();
    };
    // The scene is built once per invitation; data changes come with a new mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tilt the camera with the phone. iOS asks for permission, which needs a user gesture (first tap).
  const orientationAsked = useRef(false);
  function onOrientation(event: DeviceOrientationEvent) {
    const x = (event.gamma ?? 0) / 35;
    const y = ((event.beta ?? 45) - 45) / 40;
    sceneRef.current?.setTilt(x, y);
  }

  async function enableTilt() {
    if (orientationAsked.current || typeof DeviceOrientationEvent === "undefined") return;
    orientationAsked.current = true;
    const permission = (DeviceOrientationEvent as unknown as DeviceOrientationPermission).requestPermission;
    try {
      if (permission && (await permission()) !== "granted") return;
      window.addEventListener("deviceorientation", onOrientation);
    } catch {
      // Permission refused or unavailable: the scene still works without tilt.
    }
  }

  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <canvas
      ref={canvasRef}
      className={`hy3d-canvas${ready ? " is-ready" : ""}`}
      aria-label="Khung cảnh 3D: cô dâu và chú rể đi trên con đường hoa"
      role="img"
      onPointerDown={(event) => {
        pointerStart.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) return;
        void enableTilt();
        sceneRef.current?.tap(event.clientX, event.clientY);
      }}
    />
  );
});

export default Hy3dCanvas;
