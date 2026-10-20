import { BRAND_NAME } from "../lib/brand";

// Hỷ Thiệp lockup: the 囍 card mark + the Cormorant wordmark. Decorative mark, the name is the text.
export default function BrandLogo({ suffix }: { suffix?: string }) {
  return (
    <span className="brand-lockup">
      <img className="brand-mark" src="/brand/hy-thiep-mark.svg" alt="" width="32" height="32" />
      <span className="brand-word">{BRAND_NAME}</span>
      {suffix && <span className="brand-suffix">{suffix}</span>}
    </span>
  );
}
