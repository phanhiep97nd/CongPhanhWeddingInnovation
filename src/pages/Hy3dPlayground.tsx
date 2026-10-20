import { useEffect, useRef, useState } from "react";

// Dev-only page to inspect the 3D scene with fixture data. Query params:
//   p=0..1 · intro=0 · stations=a,b,c · stats=1 · lowPower=1.
export default function Hy3dPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<{ triangles: number; calls: number; frames: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let disposed = false;
    let cleanup = () => {};
    void import("../components/invitation/hy3d/scene/WeddingScene").then(async ({ WeddingScene }) => {
      if (disposed || !canvasRef.current) return;
      const scene = new WeddingScene(canvasRef.current, {
        groom: "Minh Công",
        bride: "Phương Anh",
        guestName: "Chị Thu Hà",
        dateText: "12 · 12 · 2026",
        venueName: "Aman Villa",
        colors: ["#F2C8CD", "#D4E0C4", "#2F3A55"],
        stations: (params.get("stations") || "story,timeline,gallery,info,rsvp,giftBox").split(","),
        timeline: [{ time: "15:00", title: "Đón khách" }, { time: "18:00", title: "Lễ thành hôn" }, { time: "19:00", title: "Tiệc tối" }],
        photos: ["/images/AMV_3106.jpg", "/images/AMV_3344.jpg", "/images/AMV_3561.jpg", "/images/AMV_4542.jpg"],
      }, {
        skipIntro: params.get("intro") === "0",
        lowPower: params.get("lowPower") === "1",
      });
      await scene.init();
      if (disposed) {
        scene.dispose();
        return;
      }
      (window as unknown as { __hy3d: unknown }).__hy3d = scene;
      const progress = Number(params.get("p") || 0);
      if (progress) scene.setProgress(progress);
      scene.start();
      const onResize = () => scene.resize();
      window.addEventListener("resize", onResize);
      const statsTimer = params.get("stats") === "1"
        ? window.setInterval(() => setStats({ ...scene.stats }), 250)
        : undefined;
      cleanup = () => {
        window.clearInterval(statsTimer);
        window.removeEventListener("resize", onResize);
        delete (window as unknown as { __hy3d?: unknown }).__hy3d;
        scene.dispose();
      };
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%" }} />
      {stats && (
        <output style={{ position: "fixed", top: 8, right: 8, zIndex: 10, padding: "6px 8px", borderRadius: 6, background: "#211c20dd", color: "#fff", font: "12px monospace", pointerEvents: "none" }}>
          {stats.triangles.toLocaleString()} tris · {stats.calls} calls · {stats.frames} frames
        </output>
      )}
    </>
  );
}
