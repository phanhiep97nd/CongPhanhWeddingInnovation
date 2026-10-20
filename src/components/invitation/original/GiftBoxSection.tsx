import { useEffect, useRef, useState } from "react";
import type { Wedding } from "../../../lib/types";
import { vietQrUrl } from "../../../lib/banks";

export default function GiftBoxSection({ wedding }: { wedding: Wedding; key?: string }) {
  const [copied, setCopied] = useState("");
  const qrDialog = useRef<HTMLDialogElement>(null);
  const [qrImage, setQrImage] = useState("");
  useEffect(() => {
    if (!qrImage) return;
    const previous = document.body.style.overflow;
    const root = document.querySelector<HTMLElement>(".scroll-container");
    const previousRoot = root?.style.overflowY || "";
    document.body.style.overflow = "hidden";
    if (root) root.style.overflowY = "hidden";
    return () => {
      document.body.style.overflow = previous;
      if (root) root.style.overflowY = previousRoot;
    };
  }, [qrImage]);
  if (!wedding.entitlements?.giftBox || !wedding.giftBox?.accounts.length) return null;
  const couple = `${wedding.couple.groom} ${wedding.couple.bride}`;

  return <section className="py-20 px-5 bg-blush text-secondary text-center">
    <div className="max-w-4xl mx-auto">
      <h2 className="font-cormorant text-5xl text-secondary mb-4">Hộp mừng cưới</h2>
      {wedding.giftBox.note && <p className="font-serif mb-10">{wedding.giftBox.note}</p>}
      <div className="grid gap-6 sm:grid-cols-2">
        {wedding.giftBox.accounts.map(account => <article key={account.id} className="bg-white rounded-3xl p-6">
          <h3 className="font-cormorant text-3xl">{account.label || account.bankName}</h3>
          <button className="gift-qr-button" type="button" aria-label={`Mở lớn mã QR ${account.bankName}`} onClick={() => { setQrImage(vietQrUrl(account.bankBin, account.accountNumber, account.accountName, couple)); qrDialog.current?.showModal(); }}>
            <img className="w-56 h-56 object-contain mx-auto my-4" alt={`Mã chuyển khoản ${account.bankName}`} src={vietQrUrl(account.bankBin, account.accountNumber, account.accountName, couple)} loading="lazy" />
          </button>
          <p className="font-serif">{account.bankName}</p>
          <p className="gift-account-number font-semibold">{account.accountNumber}</p>
          <p>{account.accountName}</p>
          <button className="gift-copy-button text-primary-deep underline mt-3" onClick={() => void navigator.clipboard.writeText(account.accountNumber).then(() => setCopied(account.id))}>
            {copied === account.id ? "Đã sao chép" : "Sao chép số tài khoản"}
          </button>
        </article>)}
      </div>
      <dialog ref={qrDialog} className="gift-qr-dialog" onClose={() => setQrImage("")} onClick={event => { if (event.target === qrDialog.current) qrDialog.current.close(); }} aria-label="Mã QR chuyển khoản">
        <button className="gift-qr-close" onClick={() => qrDialog.current?.close()} aria-label="Đóng">×</button>
        <img src={qrImage} alt="Mã QR chuyển khoản kích thước lớn" />
      </dialog>
    </div>
  </section>;
}
