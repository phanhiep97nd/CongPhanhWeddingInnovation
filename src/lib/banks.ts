export const banks = [
  ["970436", "Vietcombank"], ["970415", "VietinBank"], ["970418", "BIDV"],
  ["970405", "Agribank"], ["970407", "Techcombank"], ["970422", "MB Bank"],
  ["970416", "ACB"], ["970432", "VPBank"], ["970423", "TPBank"],
  ["970403", "Sacombank"], ["970441", "VIB"], ["970437", "HDBank"],
  ["970443", "SHB"], ["970448", "OCB"], ["970426", "MSB"],
  ["970440", "SeABank"], ["970431", "Eximbank"], ["970449", "LPBank"],
  ["970428", "Nam A Bank"], ["970454", "BVBank (Timo)"],
] as const;

export function vietQrUrl(bankBin: string, accountNumber: string, accountName: string, couple: string) {
  return `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?accountName=${encodeURIComponent(accountName)}&addInfo=${encodeURIComponent(`Mung cuoi ${couple}`)}`;
}
