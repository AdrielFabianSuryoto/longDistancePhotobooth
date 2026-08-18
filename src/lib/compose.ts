/**
 * Menggambar ulang frame (polaroid / film / retro) ke <canvas> lalu
 * mengembalikan data URL. Dipakai untuk "Save Memory" dan "Download".
 * Ukuran di bawah memakai satuan desain (CSS px) lalu dikalikan SCALE.
 */
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
 * kanan), jadi satu sel selalu 3:2. Frame-nya berupa satu kolom memanjang,
 * satu baris per jepretan.
 */
export const PAIR_ASPECT = 3 / 2;

export const LAYOUT = {
  polaroid: { frameW: 260, padX: 12, padTop: 12, padBottom: 44, gap: 4 },
  film: { frameW: 150, padX: 9, padY: 10, gap: 4, holeGap: 6 },
  retro: { frameW: 240, pad: 10, gap: 5, footerH: 32 },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal memuat gambar: ${src.slice(0, 40)}`));
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
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
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

  if (template === "film") drawFilm(canvas, images, caption);
  else if (template === "retro") drawRetro(canvas, images, caption);
  else drawPolaroid(canvas, images, caption);

  return canvas.toDataURL("image/jpeg", 0.9);
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

function drawPolaroid(
  canvas: HTMLCanvasElement,
  images: HTMLImageElement[],
  caption: string,
) {
  const L = LAYOUT.polaroid;
  const cellW = L.frameW - L.padX * 2;
  const cellH = cellW / PAIR_ASPECT;
  const frameH =
    L.padTop + images.length * cellH + (images.length - 1) * L.gap + L.padBottom;

  const ctx = setup(canvas, L.frameW, frameH);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, L.frameW, frameH);

  images.forEach((img, i) => {
    const y = L.padTop + i * (cellH + L.gap);
    ctx.fillStyle = PALETTE.photoBg;
    ctx.fillRect(L.padX, y, cellW, cellH);
    drawCover(ctx, img, L.padX, y, cellW, cellH);
  });

  ctx.fillStyle = PALETTE.caption;
  ctx.font = "10px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(caption, L.frameW / 2, frameH - 16, cellW);
}

function drawFilm(
  canvas: HTMLCanvasElement,
  images: HTMLImageElement[],
  caption: string,
) {
  const L = LAYOUT.film;
  const cellW = L.frameW - L.padX * 2;
  const cellH = cellW / PAIR_ASPECT;
  const holeRowH = 5;
  const bodyH = images.length * cellH + (images.length - 1) * L.gap;
  const frameH =
    L.padY * 2 + holeRowH * 2 + L.holeGap * 2 + bodyH + 16; /* baris caption */

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
  images.forEach((img) => {
    ctx.fillStyle = PALETTE.photoBg;
    ctx.fillRect(L.padX, y, cellW, cellH);
    drawCover(ctx, img, L.padX, y, cellW, cellH);
    y += cellH + L.gap;
  });
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
) {
  const L = LAYOUT.retro;
  const cellW = L.frameW - L.pad * 2;
  const cellH = cellW / PAIR_ASPECT;
  const frameH =
    L.pad * 2 + images.length * cellH + (images.length - 1) * L.gap + L.footerH;

  const ctx = setup(canvas, L.frameW, frameH);
  ctx.fillStyle = PALETTE.retroBody;
  roundRect(ctx, 0, 0, L.frameW, frameH, 10);

  images.forEach((img, i) => {
    const y = L.pad + i * (cellH + L.gap);
    ctx.fillStyle = PALETTE.photoBg;
    roundRect(ctx, L.pad, y, cellW, cellH, 3);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(L.pad, y, cellW, cellH, 3);
    ctx.clip();
    drawCover(ctx, img, L.pad, y, cellW, cellH);
    ctx.restore();
  });

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

/** Bisa menerima data URL maupun URL remote (mis. foto contoh Unsplash). */
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
