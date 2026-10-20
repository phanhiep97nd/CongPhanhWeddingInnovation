import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicGuest, Wedding } from "../../../lib/types";
import { cldUrl } from "../../../lib/images";
import ClassicInvitation from "../original/InvitationShell";
import Hy3dCanvas, { type Hy3dCanvasHandle } from "./Hy3dCanvas";
import { observeResize } from "./observeResize";
import { containerProgress, containerStopOffsets } from "./progress";
import type { SceneData } from "./scene/sceneData";

// ── Classic content over the walking scene ──
export default function MixedMode({ wedding, guest, slug, onUnavailable }: {
  wedding: Wedding;
  guest: PublicGuest | null;
  slug: string;
  onUnavailable: () => void;
}) {
  const canvasRef = useRef<Hy3dCanvasHandle>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const stops = useMemo(() => wedding.sections.filter((section) => section.enabled).map((section) => section.key), [wedding.sections]);
  const sectionIds = useMemo(() => stops.map((key) => key.replace(":", "-")), [stops]);
  const sceneData = useMemo<SceneData>(() => ({
    groom: wedding.couple.groom,
    bride: wedding.couple.bride,
    guestName: guest?.invitationName || "",
    dateText: wedding.dateText,
    venueName: wedding.venue.name,
    colors: wedding.dressCode.colors,
    stations: stops,
    timeline: wedding.timeline.map((item) => ({ time: item.time, title: item.title })),
    photos: wedding.gallery.map((item) => cldUrl(item.url, 640)),
  }), [wedding, guest, stops]);

  useEffect(() => {
    if (!container) return;
    let frame = 0;
    let offsets: number[] = [];
    const update = () => {
      frame = 0;
      canvasRef.current?.setProgress(containerProgress(container, sectionIds, offsets));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const measure = () => {
      offsets = containerStopOffsets(container, sectionIds);
      onScroll();
    };
    measure();
    // The viewport and content can resize independently (photos, fonts, room data).
    const stopViewport = observeResize(container, measure);
    const main = container.querySelector("main");
    const stopContent = main ? observeResize(main, measure) : () => {};
    container.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("load", measure, true);
    return () => {
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("load", measure, true);
      stopViewport();
      stopContent();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [container, sectionIds]);

  return (
    <ClassicInvitation
      wedding={wedding}
      guest={guest}
      slug={slug}
      onScrollContainer={setContainer}
      backdrop={<Hy3dCanvas ref={canvasRef} data={sceneData} onUnavailable={onUnavailable} options={{ background: true }} />}
    />
  );
}
