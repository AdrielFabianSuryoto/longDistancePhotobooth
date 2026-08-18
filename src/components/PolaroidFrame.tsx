const WIDTHS = { sm: "w-32", md: "w-48", lg: "w-64" } as const;

export function PolaroidFrame({
  src,
  caption,
  rotate = 0,
  size = "md",
}: {
  src: string;
  caption?: string;
  rotate?: number;
  size?: keyof typeof WIDTHS;
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
