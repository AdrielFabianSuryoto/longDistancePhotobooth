/**
 * Menggambar frame ke <canvas> lalu mengembalikan data URL.
 *
 * Ini satu-satunya tempat frame digambar — dipakai untuk "Save Memory",
 * "Download", tampilan di layar, maupun pratinjau kartu pilihan template.
 * Ukuran memakai satuan desain (CSS px) lalu dikalikan SCALE.
 */
import { SKINS, isSkinId, type Skin, type SlotRect } from "@/lib/skins";
import type { TemplateId } from "@/lib/types";

const SCALE = 4;

export const PALETTE = {
  /** JPEG tidak punya alpha, jadi sudut membulat perlu latar warna halaman */
  backdrop: "#f8f6f2",
  paper: "#ffffff",
  filmBody: "#111827",
  filmHole: "#374151",
  retroBody: "#1f2937",
  photoBg: "#f6d6d6",
  caption: "#9ca3af",
};

/**
 * Tiap jepretan berisi dua potret 3:4 berdampingan (kamu di kiri, pasangan di
 * kanan), jadi satu slot selalu 3:2.
 */
export const PAIR_ASPECT = 3 / 2;

/**
 * Template asli dari desain Figma: satu kolom memanjang.
 * Sisi kiri-kanan sengaja dilebarkan supaya foto tidak terlihat menempel
 * ke tepi bingkai seperti terpotong.
 */
export const LAYOUT = {
  polaroid: { frameW: 260, padX: 20, padTop: 20, padBottom: 46, gap: 6 },
  film: { frameW: 160, padX: 18, padY: 12, gap: 6, holeGap: 7 },
  retro: { frameW: 240, pad: 18, gap: 7, footerH: 34 },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${src.slice(0, 40)}`));
    img.src = src;
  });
}

/** object-fit: cover versi canvas. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | number[],
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function setup(canvas: HTMLCanvasElement, w: number, h: number) {
  canvas.width = Math.round(w * SCALE);
  canvas.height = Math.round(h * SCALE);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, w, h);
  return ctx;
}

function render(
  canvas: HTMLCanvasElement,
  template: TemplateId,
  images: HTMLImageElement[],
  caption: string,
  slotCount: number,
) {
  if (isSkinId(template)) drawSkin(canvas, SKINS[template], images, caption, slotCount);
  else if (template === "film") drawFilm(canvas, images, caption, slotCount);
  else if (template === "retro") drawRetro(canvas, images, caption, slotCount);
  else drawPolaroid(canvas, images, caption, slotCount);
}

export type ComposeOptions = {
  template: TemplateId;
  photos: string[];
  caption: string;
};

export async function composeMemory({
  template,
  photos,
  caption,
}: ComposeOptions): Promise<string> {
  const images = await Promise.all(photos.map(loadImage));
  const canvas = document.createElement("canvas");
  render(canvas, template, images, caption, images.length);
  return canvas.toDataURL("image/jpeg", 0.9);
}

/**
 * Template kosong berisi slot placeholder, untuk kartu pilihan template.
 * Digambar dengan kode yang sama persis dengan hasil akhirnya, jadi
 * pratinjaunya tidak mungkin berbeda dari yang nanti dihasilkan.
 */
export function composeTemplatePreview(template: TemplateId, slots = 4): string {
  const canvas = document.createElement("canvas");
  render(canvas, template, [], "Adriel & Maria ♥", slots);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/* ── Template bertema (pink / aqua) ───────────────────────────────── */

function drawSkin(
  canvas: HTMLCanvasElement,
  skin: Skin,
  images: HTMLImageElement[],
  caption: string,
  slotCount: number,
) {
  const cols = 2;
  const rows = Math.max(1, Math.ceil(slotCount / cols));
  const cellW = (skin.frameW - skin.padX * 2 - skin.gap) / cols;
  const cellH = cellW / PAIR_ASPECT;
  const gapY = skin.gapY ?? skin.gap;
  const offsets = skin.colOffset ?? [0, 0];
  const maxOffset = Math.max(offsets[0], offsets[1]);
  const frameH =
    skin.padTop + rows * cellH + (rows - 1) * gapY + maxOffset + skin.padBottom;

  const ctx = setup(canvas, skin.frameW, frameH);
  skin.background(ctx, skin.frameW, frameH);

  const slots: SlotRect[] = [];
  for (let i = 0; i < slotCount; i++) {
    const col = i % cols;
    slots.push({
      x: skin.padX + col * (cellW + skin.gap),
      y: skin.padTop + Math.floor(i / cols) * (cellH + gapY) + offsets[col],
      w: cellW,
      h: cellH,
    });
  }

  slots.forEach((s, i) => {
    skin.slotFrame?.(ctx, s);
    ctx.fillStyle = skin.slotEmpty;
    roundRect(ctx, s.x, s.y, s.w, s.h, skin.slotRadius);

    const img = images[i];
    if (!img) return;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(s.x, s.y, s.w, s.h, skin.slotRadius);
    ctx.clip();
    drawCover(ctx, img, s.x, s.y, s.w, s.h);
    ctx.restore();
  });

  skin.ornament?.(ctx, skin.frameW, frameH, slots);

  ctx.fillStyle = skin.captionColor;
  ctx.font = skin.captionFont;
  ctx.textAlign = "center";
  ctx.fillText(
    caption,
    skin.frameW / 2,
    frameH - skin.captionBaseline,
    skin.frameW - skin.padX * 2,
  );
}

/* ── Template asli dari desain Figma ──────────────────────────────── */

function drawPolaroid(
  canvas: HTMLCanvasElement,
  images: HTMLImageElement[],
  caption: string,
  slotCount: number,
) {
  const L = LAYOUT.polaroid;
  const cellW = L.frameW - L.padX * 2;
  const cellH = cellW / PAIR_ASPECT;
  const frameH = L.padTop + slotCount * cellH + (slotCount - 1) * L.gap + L.padBottom;

  const ctx = setup(canvas, L.frameW, frameH);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, L.frameW, frameH);

  for (let i = 0; i < slotCount; i++) {
    const y = L.padTop + i * (cellH + L.gap);
    ctx.fillStyle = PALETTE.photoBg;
    ctx.fillRect(L.padX, y, cellW, cellH);
    if (images[i]) drawCover(ctx, images[i], L.padX, y, cellW, cellH);
  }

  ctx.fillStyle = PALETTE.caption;
  ctx.font = "10px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(caption, L.frameW / 2, frameH - 16, cellW);
}

function drawFilm(
  canvas: HTMLCanvasElement,
  images: HTMLImageElement[],
  caption: string,
  slotCount: number,
) {
  const L = LAYOUT.film;
  const cellW = L.frameW - L.padX * 2;
  const cellH = cellW / PAIR_ASPECT;
  const holeRowH = 5;
  const bodyH = slotCount * cellH + (slotCount - 1) * L.gap;
  const frameH = L.padY * 2 + holeRowH * 2 + L.holeGap * 2 + bodyH + 16;

  const ctx = setup(canvas, L.frameW, frameH);
  ctx.fillStyle = PALETTE.filmBody;
  roundRect(ctx, 0, 0, L.frameW, frameH, 8);

  const drawHoles = (y: number) => {
    ctx.fillStyle = PALETTE.filmHole;
    const n = 5;
    const holeW = 9;
    const step = cellW / n;
    for (let i = 0; i < n; i++) {
      const x = L.padX + i * step + (step - holeW) / 2;
      roundRect(ctx, x, y, holeW, holeRowH, 1.5);
    }
  };

  drawHoles(L.padY);
  let y = L.padY + holeRowH + L.holeGap;
  for (let i = 0; i < slotCount; i++) {
    ctx.fillStyle = PALETTE.photoBg;
    ctx.fillRect(L.padX, y, cellW, cellH);
    if (images[i]) drawCover(ctx, images[i], L.padX, y, cellW, cellH);
    y += cellH + L.gap;
  }
  y = y - L.gap + L.holeGap;
  drawHoles(y);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "7px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(caption, L.frameW / 2, frameH - 5, cellW);
}

function drawRetro(
  canvas: HTMLCanvasElement,
  images: HTMLImageElement[],
  caption: string,
  slotCount: number,
) {
  const L = LAYOUT.retro;
  const cellW = L.frameW - L.pad * 2;
  const cellH = cellW / PAIR_ASPECT;
  const frameH = L.pad * 2 + slotCount * cellH + (slotCount - 1) * L.gap + L.footerH;

  const ctx = setup(canvas, L.frameW, frameH);
  ctx.fillStyle = PALETTE.retroBody;
  roundRect(ctx, 0, 0, L.frameW, frameH, 10);

  for (let i = 0; i < slotCount; i++) {
    const y = L.pad + i * (cellH + L.gap);
    ctx.fillStyle = PALETTE.photoBg;
    roundRect(ctx, L.pad, y, cellW, cellH, 3);
    if (!images[i]) continue;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(L.pad, y, cellW, cellH, 3);
    ctx.clip();
    drawCover(ctx, images[i], L.pad, y, cellW, cellH);
    ctx.restore();
  }

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "10px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(caption, L.frameW / 2, frameH - 13, L.frameW - L.pad * 2);
}

/* ── Download ─────────────────────────────────────────────────────── */

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Bisa menerima data URL maupun URL remote. */
export async function downloadImage(src: string, filename: string) {
  if (src.startsWith("data:")) {
    triggerDownload(src, filename);
    return;
  }
  const res = await fetch(src, { mode: "cors" });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}
