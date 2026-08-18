export type TemplateId = "polaroid" | "film" | "retro";

export type Mood =
  | "Happy"
  | "Cozy"
  | "Romantic"
  | "Playful"
  | "Nostalgic"
  | "Loving";

export const MOODS: Mood[] = [
  "Happy",
  "Cozy",
  "Romantic",
  "Playful",
  "Nostalgic",
  "Loving",
];

export type PhotoCount = 2 | 4 | 6;

/** Satu baris tabel `memories`, sudah dilengkapi signed URL untuk ditampilkan. */
export type Memory = {
  id: string;
  createdAt: string;
  createdBy: string;
  caption: string;
  mood: Mood;
  template: TemplateId;
  imagePath: string;
  photoPaths: string[];
  /** sama untuk Adriel dan Maria dalam satu sesi capture */
  sessionId: string | null;
  /** signed URL dari imagePath — bucket-nya privat, jadi tidak bisa diakses langsung */
  img: string;
};

/** Memory + signed URL tiap foto mentah, dipakai halaman detail. */
export type MemoryDetail = Memory & { photos: string[] };

export type Reaction = {
  id: string;
  createdAt: string;
  memoryId: string;
  author: string;
  body: string;
};

export const TEMPLATES: {
  id: TemplateId;
  name: string;
  icon: string;
  desc: string;
}[] = [
  {
    id: "polaroid",
    name: "Polaroid Classic",
    icon: "📷",
    desc: "Vintage instant photo strips",
  },
  {
    id: "film",
    name: "Film Strip",
    icon: "🎞",
    desc: "Classic cinema negative style",
  },
  {
    id: "retro",
    name: "Retro Booth",
    icon: "🎡",
    desc: "90s photo booth vibes",
  },
];

export function templateName(id: TemplateId): string {
  return TEMPLATES.find((t) => t.id === id)?.name ?? id;
}
