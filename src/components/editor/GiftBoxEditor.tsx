import type { GiftAccount, Wedding } from "../../lib/types";
import { banks, vietQrUrl } from "../../lib/banks";
import { clientId } from "../../lib/sections";
import { Field } from "./Fields";
import ImageField from "./ImageField";

// Bank accounts or QR codes guests use to send a wedding gift; shown behind the "Hộp quà" button on the card, on every plan.
// An account needs either a bank and account number (its VietQR code is generated) or an uploaded QR image
// (e-wallets such as MoMo or ZaloPay, or the QR a bank app gives).
export default function GiftBoxEditor({ wedding, change }: {
  wedding: Wedding;
  change: (patch: Partial<Wedding>) => void;
}) {
  const giftBox = wedding.giftBox || { note: "", accounts: [] };
  const update = (index: number, patch: Partial<GiftAccount>) => {
    change({ giftBox: { ...giftBox, accounts: giftBox.accounts.map((account, i) => i === index ? { ...account, ...patch } : account) } });
  };
  const couple = `${wedding.couple.groom} ${wedding.couple.bride}`;

  return <div className="editor-stack gift-box-editor">
    <p className="field-hint">Khách bấm nút <strong>Hộp quà</strong> trên thiệp để xem các tài khoản và mã QR dưới đây.</p>
    <Field label="Lời nhắn" value={giftBox.note} textarea onChange={note => change({ giftBox: { ...giftBox, note: note.slice(0, 300) } })} />
    {giftBox.accounts.map((account, index) => {
      const generated = account.bankBin && account.accountNumber ? vietQrUrl(account.bankBin, account.accountNumber, account.accountName, couple) : "";
      const complete = Boolean(account.qrImage || generated);
      return <article className="editor-item form-grid gift-account" key={account.id}>
        <Field label="Nhãn (ví dụ: Cô dâu, Chú rể, MoMo)" value={account.label} onChange={label => update(index, { label: label.slice(0, 40) })} />
        <label>Ngân hàng
          <select value={account.bankBin} onChange={event => {
            const bank = banks.find(([bin]) => bin === event.target.value);
            update(index, bank ? { bankBin: bank[0], bankName: bank[1] } : { bankBin: "", bankName: "" });
          }}>
            <option value="">Không có (chỉ dùng ảnh mã QR)</option>
            {banks.map(([bin, name]) => <option key={bin} value={bin}>{name}</option>)}
          </select>
        </label>
        <Field label="Số tài khoản" inputMode="numeric" value={account.accountNumber} onChange={accountNumber => update(index, { accountNumber: accountNumber.replace(/[^0-9A-Za-z]/g, "").slice(0, 30) })} />
        <Field label="Tên chủ tài khoản" value={account.accountName} onChange={accountName => update(index, { accountName: accountName.slice(0, 60) })} />
        <div className="full gift-qr">
          <ImageField label="Ảnh mã QR của bạn (tuỳ chọn)" value={account.qrImage || ""} onChange={qrImage => update(index, { qrImage })} />
          <p className="field-hint">{account.qrImage ? "Khách sẽ thấy ảnh mã QR bạn tải lên." : generated ? "Chưa tải ảnh: thiệp dùng mã VietQR tạo từ ngân hàng và số tài khoản." : "Tải ảnh mã QR (MoMo, ZaloPay, QR ngân hàng…) hoặc chọn ngân hàng và nhập số tài khoản."}</p>
          {(account.qrImage || generated) && <img className="gift-qr-preview" src={account.qrImage || generated} alt={`Mã QR ${account.label || account.bankName}`} />}
          {!complete && <p role="alert" className="error">Cần ảnh mã QR, hoặc ngân hàng và số tài khoản.</p>}
        </div>
        <button className="text-button" onClick={() => change({ giftBox: { ...giftBox, accounts: giftBox.accounts.filter(item => item.id !== account.id) } })}>Xóa tài khoản</button>
      </article>;
    })}
    <button className="button-outline" disabled={giftBox.accounts.length >= 4} onClick={() => change({ giftBox: {
      ...giftBox,
      accounts: [...giftBox.accounts, { id: clientId(), label: "", bankBin: "", bankName: "", accountNumber: "", accountName: "", qrImage: "" }],
    } })}>Thêm tài khoản hoặc mã QR</button>
  </div>;
}
