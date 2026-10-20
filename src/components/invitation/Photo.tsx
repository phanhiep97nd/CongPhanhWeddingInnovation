import { cldUrl } from "../../lib/images";
import type { ImgHTMLAttributes } from "react";

export default function Photo({ src, alt, className = "", hero = false, sizes, ...props }: ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string; hero?: boolean; }) {
  if (!src) {
    return null;
  }
  return (
    <img
      {...props}
      src={cldUrl(src, hero ? 1800 : 960)}
      srcSet={src.includes("res.cloudinary.com")
        ? [480, 960, 1600, 2000].map((width) => `${cldUrl(src, width)} ${width}w`).join(", ")
        : undefined}
      sizes={sizes || (hero ? "100vw" : "(max-width: 768px) 100vw, 50vw")}
      alt={alt}
      className={className}
      loading={hero ? "eager" : "lazy"}
      decoding={hero ? "sync" : "async"}
      fetchPriority={hero ? "high" : undefined}
    />
  );
}

