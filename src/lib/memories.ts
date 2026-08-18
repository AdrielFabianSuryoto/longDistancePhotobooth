/**
 * Lapisan data memory di atas Supabase.
 * Foto disimpan sebagai file di bucket privat `memories`; tabelnya hanya
 * menyimpan path. Karena bucket-nya privat, setiap URL untuk ditampilkan
 * harus di-sign dulu (berlaku sementara).
 */
import { MEMORY_BUCKET, supabase } from "@/lib/supabase";
import type { Memory, MemoryDetail, Mood, TemplateId } from "@/lib/types";

const SIGNED_URL_TTL = 60 * 60; // 1 jam

type Row = {
  id: string;
  created_at: string;
  created_by: string;
  caption: string;
  mood: string;
  template: string;
  image_path: string;
  photo_paths: string[];
  session_id: string | null;
};

async function signMany(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;

  const { data, error } = await supabase.storage
    .from(MEMORY_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL);
  if (error) throw error;

  data?.forEach((entry) => {
    if (entry.signedUrl && entry.path) map.set(entry.path, entry.signedUrl);
  });
  return map;
}

function toMemory(row: Row, img: string): Memory {
  return {
    id: row.id,
    createdAt: row.created_at,
    createdBy: row.created_by,
    caption: row.caption,
    mood: row.mood as Mood,
    template: row.template as TemplateId,
    imagePath: row.image_path,
    photoPaths: row.photo_paths ?? [],
    sessionId: row.session_id ?? null,
    img,
  };
}

export async function listMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Row[];
  const signed = await signMany(rows.map((r) => r.image_path));
  return rows.map((r) => toMemory(r, signed.get(r.image_path) ?? ""));
}

export async function getMemory(id: string): Promise<MemoryDetail | null> {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Row;
  const paths = [row.image_path, ...(row.photo_paths ?? [])];
  const signed = await signMany(paths);

  return {
    ...toMemory(row, signed.get(row.image_path) ?? ""),
    photos: (row.photo_paths ?? [])
      .map((p) => signed.get(p) ?? "")
      .filter(Boolean),
  };
}

/** data URL hasil canvas → Blob, supaya bisa diunggah ke Storage. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(header)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export type NewMemory = {
  template: TemplateId;
  mood: Mood;
  caption: string;
  /** frame jadi (data URL) */
  composed: string;
  /** foto mentah satu per satu (data URL) */
  photos: string[];
  /** id sesi capture bersama; null kalau sesi sendirian */
  sessionId: string | null;
};

export async function createMemory(input: NewMemory): Promise<Memory> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Belum login.");

  const id = crypto.randomUUID();
  const folder = `${userId}/${id}`;
  const imagePath = `${folder}/frame.jpg`;
  const photoPaths = input.photos.map((_, i) => `${folder}/shot-${i + 1}.jpg`);

  const uploads = [
    { path: imagePath, blob: dataUrlToBlob(input.composed) },
    ...input.photos.map((p, i) => ({
      path: photoPaths[i],
      blob: dataUrlToBlob(p),
    })),
  ];

  for (const { path, blob } of uploads) {
    const { error } = await supabase.storage
      .from(MEMORY_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw error;
  }

  const { data, error } = await supabase
    .from("memories")
    .insert({
      id,
      created_by: userId,
      caption: input.caption,
      mood: input.mood,
      template: input.template,
      image_path: imagePath,
      photo_paths: photoPaths,
      session_id: input.sessionId,
    })
    .select("*")
    .single();

  if (error) {
    // File sudah terlanjur naik sebelum baris gagal disimpan — buang lagi,
    // supaya tidak menumpuk jadi sampah di Storage.
    await supabase.storage
      .from(MEMORY_BUCKET)
      .remove(uploads.map((u) => u.path));
    throw error;
  }

  const signed = await signMany([imagePath]);
  return toMemory(data as Row, signed.get(imagePath) ?? "");
}

/** Semua memory dalam satu sesi capture (Adriel + Maria), terlama dulu. */
export async function listSessionMemories(sessionId: string): Promise<Memory[]> {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Row[];
  const signed = await signMany(rows.map((r) => r.image_path));
  return rows.map((r) => toMemory(r, signed.get(r.image_path) ?? ""));
}

export async function deleteMemory(memory: Memory): Promise<void> {
  const paths = [memory.imagePath, ...memory.photoPaths];
  await supabase.storage.from(MEMORY_BUCKET).remove(paths);
  const { error } = await supabase.from("memories").delete().eq("id", memory.id);
  if (error) throw error;
}
