/**
 * Versi React dari frame yang sama dengan yang digambar di compose.ts.
 * Tiap jepretan adalah satu gambar berisi dua potret berdampingan (kamu di
 * kiri, pasangan di kanan), jadi frame-nya satu kolom memanjang.
 */
import type { TemplateId } from "@/lib/types";

type Props = {
  template: TemplateId;
  photos: string[];
  caption: string;
  /** lebar frame dalam px; default mengikuti angka di compose.ts */
  width?: number;
};

export function MemoryFrame({ template, photos, caption, width }: Props) {
  if (template === "film")
    return <FilmFrame photos={photos} caption={caption} width={width ?? 150} />;
  if (template === "retro")
    return <RetroFrame photos={photos} caption={caption} width={width ?? 240} />;
  return <PolaroidFrame photos={photos} caption={caption} width={width ?? 260} />;
}

function Photo({ src, className = "" }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      className={`bg-accent aspect-[3/2] w-full object-cover ${className}`}
      draggable={false}
    />
  );
}

function PolaroidFrame({
  photos,
  caption,
  width,
}: {
  photos: string[];
  caption: string;
  width: number;
}) {
  return (
    <div
      className="relative bg-white shadow-2xl"
      style={{ padding: "12px 12px 44px 12px", width }}
    >
      <div className="flex flex-col gap-1">
        {photos.map((src, i) => (
          <Photo key={i} src={src} />
        ))}
      </div>
      <p
        className="absolute right-0 bottom-3 left-0 truncate px-3 text-center text-gray-400"
        style={{ fontFamily: "Georgia, serif", fontSize: "10px" }}
      >
        {caption}
      </p>
    </div>
  );
}

function Sprockets() {
  return (
    <div className="flex justify-around">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-[5px] w-[9px] rounded-[1.5px] bg-gray-700" />
      ))}
    </div>
  );
}

function FilmFrame({
  photos,
  caption,
  width,
}: {
  photos: string[];
  caption: string;
  width: number;
}) {
  return (
    <div
      className="rounded-lg bg-gray-900 shadow-2xl"
      style={{ padding: "10px 9px", width }}
    >
      <Sprockets />
      <div className="my-1.5 flex flex-col gap-1">
        {photos.map((src, i) => (
          <Photo key={i} src={src} />
        ))}
      </div>
      <Sprockets />
      <p
        className="mt-1 truncate text-center text-white/45"
        style={{ fontFamily: "Georgia, serif", fontSize: "7px" }}
      >
        {caption}
      </p>
    </div>
  );
}

function RetroFrame({
  photos,
  caption,
  width,
}: {
  photos: string[];
  caption: string;
  width: number;
}) {
  return (
    <div
      className="rounded-[10px] bg-gray-800 shadow-2xl"
      style={{ padding: 10, width }}
    >
      <div className="flex flex-col gap-[5px]">
        {photos.map((src, i) => (
          <Photo key={i} src={src} className="rounded-[3px]" />
        ))}
      </div>
      <p
        className="mt-2 mb-0.5 truncate text-center text-white/60"
        style={{ fontFamily: "Georgia, serif", fontSize: "10px" }}
      >
        {caption}
      </p>
    </div>
  );
}
