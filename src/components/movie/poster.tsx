import Image from "next/image";

import { posterUrl, type PosterSize } from "@/lib/images";

type PosterProps = {
  path: string | null;
  title: string;
  size?: PosterSize;
  /** `sizes` hint for next/image — match the rendered width. */
  sizes: string;
  priority?: boolean;
  className?: string;
};

/** 2:3 poster with a typographic placeholder when TMDB has no artwork. */
export function Poster({ path, title, size = "w342", sizes, priority, className = "" }: PosterProps) {
  const src = posterUrl(path, size);

  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-xl bg-surface ring-1 ring-white/10 ${className}`}>
      {src ? (
        <Image src={src} alt={`Poster for ${title}`} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center p-3 text-center text-sm font-medium text-muted">
          {title}
        </div>
      )}
    </div>
  );
}
