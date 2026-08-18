const WIDTHS = { sm: "w-32", md: "w-48", lg: "w-64" } as const;

export function PolaroidFrame({
  src,
  caption,
  rotate = 0,
  size = "md",
  mirrored = false,
}: {
  src: string;
  caption?: string;
  rotate?: number;
  size?: keyof typeof WIDTHS;
  /** balik gambar secara horizontal; caption dan rotasi tidak ikut terbalik */
  mirrored?: boolean;
}) {
  return (
    <div
      className={`${WIDTHS[size]} flex flex-col gap-1.5 bg-white p-2.5 pb-8 shadow-xl transition-transform hover:scale-105`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <img
        src={src}
        alt="memory"
        className="bg-accent aspect-square w-full object-cover"
        style={mirrored ? { transform: "scaleX(-1)" } : undefined}
      />
      {caption && (
        <p
          className="mt-1 px-1 text-center text-gray-400"
          style={{ fontFamily: "Georgia, serif", fontSize: "10px" }}
        >
          {caption}
        </p>
      )}
    </div>
  );
}
