import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { api } from "../lib/api";
import { inviteLink } from "../lib/links";
import type { Guest, Wedding } from "../lib/types";

interface QrCard { guest: Guest; link: string; image: string; }

export default function GuestQrPrint() {
  const { id = "" } = useParams();
  const [cards, setCards] = useState<QrCard[]>([]);
  const [message, setMessage] = useState("Đang tạo mã QR…");
  useEffect(() => {
    Promise.all([
      api<Wedding>(`/weddings/${id}`, {}, true),
      api<Guest[]>(`/weddings/${id}/guests`, {}, true),
    ]).then(async ([wedding, guests]) => {
      if (!wedding.entitlements?.guestQr) throw new Error("Cần gói Cơ bản để in mã QR.");
      const result = await Promise.all(guests.map(async guest => {
        const link = inviteLink(window.location.origin, wedding.slug, guest.code);
        return { guest, link, image: await QRCode.toDataURL(link, { width: 256 }) };
      }));
      setCards(result);
      setMessage(result.length ? "" : "Chưa có khách mời để in mã QR.");
    }).catch(cause => setMessage((cause as Error).message));
  }, [id]);
  return <main className="qr-print-page shell">
    <header className="dash-header no-print">
      <Link to={`/dashboard/${id}`}>← Về danh sách khách</Link>
      <button className="button" disabled={!cards.length} onClick={() => window.print()}>In mã QR</button>
    </header>
    <h1 className="no-print">Mã QR khách mời</h1>
    {message && <p role="status">{message}</p>}
    <div className="qr-print-grid">
      {cards.map(({ guest, link, image }) => <article key={guest.id} className="qr-print-card">
        <strong>{guest.invitationName}</strong>
        <img src={image} alt={`Mã QR của ${guest.invitationName}`} />
        <small>{link}</small>
      </article>)}
    </div>
  </main>;
}
