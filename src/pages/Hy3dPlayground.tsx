import { useEffect, useRef } from "react";

// Dev-only page to inspect the 3D scene with fixture data. Query params:
//   p=0..1 scroll progress · intro=0 skips the envelope · stations=a,b,c overrides the section list.
export default function Hy3dPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      });
      await scene.init();
      (window as unknown as { __hy3d: unknown }).__hy3d = scene;
      const progress = Number(params.get("p") || 0);
      if (progress) scene.setProgress(progress);
      scene.start();
      const onResize = () => scene.resize();
      window.addEventListener("resize", onResize);
      cleanup = () => {
        window.removeEventListener("resize", onResize);
        scene.dispose();
      };
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100%", height: "100%" }} />;
}
