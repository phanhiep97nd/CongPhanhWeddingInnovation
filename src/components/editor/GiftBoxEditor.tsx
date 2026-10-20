import type { Wedding } from "../../lib/types";
import { banks } from "../../lib/banks";
import { clientId } from "../../lib/sections";
import { Field } from "./Fields";
import LockedFeature from "../billing/LockedFeature";

export default function GiftBoxEditor({ wedding, change, onUpgrade }: {
  wedding: Wedding;
  change: (patch: Partial<Wedding>) => void;
  onUpgrade: () => void;
}) {
  const giftBox = wedding.giftBox || { note: "", accounts: [] };
  const update = (index: number, patch: Partial<typeof giftBox.accounts[number]>) => {
    change({ giftBox: { ...giftBox, accounts: giftBox.accounts.map((account, i) => i === index ? { ...account, ...patch } : account) } });
  };

  return <div className="editor-stack">
    <h2>Hộp mừng cưới</h2>
    {!wedding.entitlements?.giftBox && <LockedFeature plan="premium" label="Hiển thị hộp mừng cưới trên thiệp" onUpgrade={onUpgrade} />}
    <p>Bạn có thể chuẩn bị thông tin trước. Hộp mừng cưới chỉ hiện trên thiệp khi dùng gói Cao cấp.</p>
    <Field label="Lời nhắn" value={giftBox.note} textarea onChange={note => change({ giftBox: { ...giftBox, note: note.slice(0, 300) } })} />
    {giftBox.accounts.map((account, index) => <article className="editor-item form-grid" key={account.id}>
      <Field label="Nhãn" value={account.label} onChange={label => update(index, { label: label.slice(0, 40) })} />
      <label>Ngân hàng
        <select value={account.bankBin} onChange={event => {
          const bank = banks.find(([bin]) => bin === event.target.value);
          if (bank) update(index, { bankBin: bank[0], bankName: bank[1] });
        }}>
          <option value="">Chọn ngân hàng</option>
          {banks.map(([bin, name]) => <option key={bin} value={bin}>{name}</option>)}
        </select>
      </label>
      <Field label="Số tài khoản" inputMode="numeric" value={account.accountNumber} onChange={accountNumber => update(index, { accountNumber: accountNumber.replace(/[^0-9A-Za-z]/g, "").slice(0, 30) })} />
      <Field label="Tên chủ tài khoản" value={account.accountName} onChange={accountName => update(index, { accountName: accountName.slice(0, 60) })} />
      <button className="text-button" onClick={() => change({ giftBox: { ...giftBox, accounts: giftBox.accounts.filter(item => item.id !== account.id) } })}>Xóa tài khoản</button>
    </article>)}
    <button className="button-outline" disabled={giftBox.accounts.length >= 4} onClick={() => change({ giftBox: {
      ...giftBox,
      accounts: [...giftBox.accounts, { id: clientId(), label: "", bankBin: "", bankName: "", accountNumber: "", accountName: "" }],
    } })}>Thêm tài khoản</button>
  </div>;
}
