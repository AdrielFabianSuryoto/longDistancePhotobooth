export type TemplateId =
  | "polaroid"
  | "film"
  | "retro"
  | "pink-strip"
  | "pink-pop"
  | "pink-note"
  | "aqua-wave"
  | "aqua-dots"
  | "aqua-tape";

/** Pengelompokan di halaman pilihan template. */
export type TemplateTheme = "classic" | "pink" | "aqua";

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
  theme: TemplateTheme;
}[] = [
  {
    id: "polaroid",
    name: "Polaroid Classic",
    icon: "📷",
    desc: "Vintage instant photo strips",
    theme: "classic",
  },
  {
    id: "film",
    name: "Film Strip",
    icon: "🎞",
    desc: "Classic cinema negative style",
    theme: "classic",
  },
  {
    id: "retro",
    name: "Retro Booth",
    icon: "🎡",
    desc: "90s photo booth vibes",
    theme: "classic",
  },
  {
    id: "pink-strip",
    name: "Sweet Strip",
    icon: "🎀",
    desc: "Pink film strip with tiny hearts",
    theme: "pink",
  },
  {
    id: "pink-pop",
    name: "Bubble Pop",
    icon: "🫧",
    desc: "Soft bubbles and a ribbon label",
    theme: "pink",
  },
  {
    id: "pink-note",
    name: "Love Note",
    icon: "💌",
    desc: "Arched slots, film strip down the middle",
    theme: "pink",
  },
  {
    id: "aqua-wave",
    name: "Fresh Wave",
    icon: "🌊",
    desc: "Aqua gradient with waves below",
    theme: "aqua",
  },
  {
    id: "aqua-dots",
    name: "Soda Pop",
    icon: "🥤",
    desc: "Cheerful polka dots, stepped slots",
    theme: "aqua",
  },
  {
    id: "aqua-tape",
    name: "Ocean Tape",
    icon: "🐬",
    desc: "Beach stripes, round holes, washi tape",
    theme: "aqua",
  },
];

export const THEME_LABEL: Record<TemplateTheme, string> = {
  classic: "Classic",
  pink: "Pink",
  aqua: "Aqua Blue",
};

export function templateName(id: TemplateId): string {
  return TEMPLATES.find((t) => t.id === id)?.name ?? id;
}
