import { cldUrl } from "../../lib/images";

export default function Photo({ src, alt, className = "", hero = false }: { src: string; alt: string; className?: string; hero?: boolean; }) {
  if (!src) return null;
  return <img src={cldUrl(src, hero ? 1800 : 960)} srcSet={src.includes("res.cloudinary.com") ? [480, 960, 1600, 2000].map(w => `${cldUrl(src, w)} ${w}w`).join(", ") : undefined} sizes={hero ? "100vw" : "(max-width: 768px) 100vw, 50vw"} alt={alt} className={className} loading={hero ? "eager" : "lazy"} decoding={hero ? "sync" : "async"} fetchPriority={hero ? "high" : undefined} />;
}

