import type { Mood } from "@/lib/types";

const COLORS: Record<string, string> = {
  Happy: "bg-yellow-100 text-yellow-700",
  Cozy: "bg-orange-100 text-orange-700",
  Romantic: "bg-pink-100 text-pink-700",
  Playful: "bg-purple-100 text-purple-700",
  Nostalgic: "bg-blue-100 text-blue-700",
  Loving: "bg-red-100 text-red-700",
};

export function MoodBadge({ mood }: { mood: Mood | string }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
        COLORS[mood] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {mood}
    </span>
  );
}
