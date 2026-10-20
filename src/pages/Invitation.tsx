import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { PublicGuest, Wedding } from "../lib/types";
import InvitationShell from "../components/invitation/original/InvitationShell";

export default function Invitation() {
  const { slug = "", code } = useParams();
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [guest, setGuest] = useState<PublicGuest | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      api<Wedding>(`/public/weddings/${encodeURIComponent(slug)}`),
      code
        ? api<PublicGuest>(`/public/weddings/${encodeURIComponent(slug)}/guests/${encodeURIComponent(code)}`)
        : Promise.resolve(null),
    ]).then(([nextWedding, nextGuest]) => {
      if (active) {
        setWedding(nextWedding);
        setGuest(nextGuest);
      }
    }).catch((cause) => {
      if (active) {
        setError(cause instanceof ApiError && cause.status === 404
          ? "Không tìm thấy thiệp cưới này."
          : (cause as Error).message);
      }
    }).finally(() => {
      if (active) {
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [slug, code]);
  useEffect(() => {
    if (!wedding) {
      return;
    }
    document.title = wedding.meta.title || `Thiệp cưới ${wedding.couple.groom} & ${wedding.couple.bride}`;
    let meta = document.querySelector<HTMLMetaElement>("meta[name=\"description\"]");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.append(meta);
    }
    meta.content = wedding.meta.description || `Trân trọng kính mời ${guest?.invitationName || "bạn"} đến chung vui trong ngày trọng đại của ${wedding.couple.groom} & ${wedding.couple.bride}.`;
  }, [wedding, guest]);
  if (loading) {
    return <p className="page-loading">Đang mở thiệp...</p>;
  }
  if (error || !wedding) {
    return (
      <main className="shell not-found">
        <h1>{error || "Không tìm thấy thiệp cưới này."}</h1>
        <a href="/">Về trang chủ</a>
      </main>
    );
  }
  return <InvitationShell wedding={wedding} guest={guest} slug={slug} />;
}
