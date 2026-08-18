/**
 * Template photo booth bertema.
 *
 * Semua digambar penuh ke kanvas — tidak ada margin putih atau area kosong di
 * luar desain. Slot foto disusun dua kolom; empat foto berarti 2×2. Slot yang
 * belum terisi digambar sebagai placeholder polos, dipakai untuk kartu pilihan
 * template.
 */

export type SlotRect = { x: number; y: number; w: number; h: number };

export type Skin = {
  /** lebar kanvas dalam satuan desain */
  frameW: number;
  padX: number;
  padTop: number;
  /** ruang di bawah untuk nama & tanggal */
  padBottom: number;
  /** jarak antar kolom */
  gap: number;
  /** jarak antar baris; default mengikuti gap */
  gapY?: number;
  /** satu angka, atau [kiri-atas, kanan-atas, kanan-bawah, kiri-bawah] */
  slotRadius: number | number[];
  /** geser kolom ke bawah, untuk susunan yang sengaja tidak rata */
  colOffset?: [number, number];
  /** warna slot kosong */
  slotEmpty: string;
  captionColor: string;
  captionFont: string;
  /** jarak garis dasar teks dari tepi bawah */
  captionBaseline: number;
  background: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  /** bingkai tiap slot, digambar sebelum fotonya */
  slotFrame?: (ctx: CanvasRenderingContext2D, s: SlotRect) => void;
  /** hiasan, digambar setelah semua foto */
  ornament?: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    slots: SlotRect[],
  ) => void;
};

/* ── Alat gambar ──────────────────────────────────────────────────── */

function fillRR(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | number[],
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function gradient(
  ctx: CanvasRenderingContext2D,
  h: number,
  from: string,
  to: string,
) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  return g;
}

/** Deretan lubang film persegi. */
function sprockets(
  ctx: CanvasRenderingContext2D,
  opts: {
    from: number;
    to: number;
    at: number;
    vertical: boolean;
    color: string;
    step?: number;
    long?: number;
    short?: number;
  },
) {
  const step = opts.step ?? 24;
  const long = opts.long ?? 11;
  const short = opts.short ?? 7;
  for (let p = opts.from; p <= opts.to - long; p += step) {
    if (opts.vertical) fillRR(ctx, opts.at, p, short, long, 2, opts.color);
    else fillRR(ctx, p, opts.at, long, short, 2, opts.color);
  }
}

function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Deretan lubang film bundar. */
function roundHoles(
  ctx: CanvasRenderingContext2D,
  opts: {
    from: number;
    to: number;
    at: number;
    r: number;
    step: number;
    color: string;
  },
) {
  for (let y = opts.from; y <= opts.to; y += opts.step) {
    dot(ctx, opts.at, y, opts.r, opts.color);
  }
}

function heart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-8, -4, -4, -12, 0, -6);
  ctx.bezierCurveTo(4, -12, 8, -4, 0, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function sparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0);
  ctx.quadraticCurveTo(0, 0, 0, -r);
  ctx.fill();
  ctx.restore();
}

/* ── Tema Pink ────────────────────────────────────────────────────── */

/** Pita film klasik: lubang di kedua tepi, hati mungil di sela baris. */
const sweetStrip: Skin = {
  frameW: 300,
  padX: 34,
  padTop: 26,
  padBottom: 62,
  gap: 8,
  slotRadius: 8,
  slotEmpty: "#FFF1F6",
  captionColor: "#FFFFFF",
  captionFont: "italic 12px Georgia, serif",
  captionBaseline: 25,
  background: (ctx, w, h) => {
    ctx.fillStyle = gradient(ctx, h, "#FFE3EC", "#FFB7D1");
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(0, 0, 26, h);
    ctx.fillRect(w - 26, 0, 26, h);
  },
  slotFrame: (ctx, s) => {
    fillRR(ctx, s.x - 4, s.y - 4, s.w + 8, s.h + 8, 11, "#FFFFFF");
  },
  ornament: (ctx, w, h, slots) => {
    sprockets(ctx, {
      from: 18,
      to: h - 52,
      at: 8,
      vertical: true,
      color: "rgba(255,255,255,0.85)",
    });
    sprockets(ctx, {
      from: 18,
      to: h - 52,
      at: w - 15,
      vertical: true,
      color: "rgba(255,255,255,0.85)",
    });
    const rows = Math.ceil(slots.length / 2);
    for (let r = 0; r < rows - 1; r++) {
      const s = slots[r * 2];
      if (s) heart(ctx, w / 2, s.y + s.h + 4, 11, "#FF7FA8");
    }
    fillRR(ctx, 20, h - 44, w - 40, 30, 15, "#FF7FA8");
  },
};

/** Gelembung lembut, bingkai stiker tebal, label pita putih. */
const bubblePop: Skin = {
  frameW: 300,
  padX: 22,
  padTop: 34,
  padBottom: 64,
  gap: 12,
  slotRadius: 14,
  slotEmpty: "#FFEAF3",
  captionColor: "#E0538A",
  captionFont: "bold 12px Poppins, sans-serif",
  captionBaseline: 29,
  background: (ctx, w, h) => {
    ctx.fillStyle = "#FFD3E6";
    ctx.fillRect(0, 0, w, h);
    const bubbles: [number, number, number][] = [
      [0.12, 0.06, 46],
      [0.88, 0.14, 34],
      [0.08, 0.55, 30],
      [0.94, 0.62, 44],
      [0.5, 0.95, 40],
    ];
    bubbles.forEach(([fx, fy, r]) =>
      dot(ctx, fx * w, fy * h, r, "rgba(255,255,255,0.45)"),
    );
  },
  slotFrame: (ctx, s) => {
    fillRR(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 18, "#FFFFFF");
  },
  ornament: (ctx, w, h) => {
    sprockets(ctx, {
      from: 16,
      to: w - 16,
      at: 10,
      vertical: false,
      color: "rgba(255,255,255,0.9)",
      step: 26,
    });
    sprockets(ctx, {
      from: 16,
      to: w - 16,
      at: h - 16,
      vertical: false,
      color: "rgba(255,255,255,0.9)",
      step: 26,
    });
    sparkle(ctx, 26, h * 0.35, 7, "#FFFFFF");
    sparkle(ctx, w - 24, h * 0.78, 6, "#FFFFFF");
    fillRR(ctx, 34, h - 46, w - 68, 26, 13, "#FFFFFF");
  },
};

/** Slot melengkung di atas, pita film justru membelah di tengah. */
const loveNote: Skin = {
  frameW: 300,
  padX: 20,
  padTop: 28,
  padBottom: 66,
  gap: 36,
  gapY: 12,
  slotRadius: [16, 16, 4, 4],
  slotEmpty: "#FFF4F8",
  captionColor: "#FFFFFF",
  captionFont: "italic 12px Georgia, serif",
  captionBaseline: 27,
  background: (ctx, w, h) => {
    ctx.fillStyle = "#FFEFF5";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.strokeStyle = "rgba(255,183,209,0.5)";
    ctx.lineWidth = 6;
    for (let x = -h; x < w + h; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();
    }
    ctx.restore();
  },
  slotFrame: (ctx, s) => {
    fillRR(ctx, s.x - 5, s.y - 5, s.w + 10, s.h + 10, [20, 20, 7, 7], "#FFFFFF");
  },
  ornament: (ctx, w, h) => {
    const band = 30;
    const bottom = h - 58;
    fillRR(ctx, w / 2 - band / 2, 16, band, bottom - 16, 6, "#FF7FA8");
    roundHoles(ctx, {
      from: 32,
      to: bottom - 16,
      at: w / 2,
      r: 4,
      step: 20,
      color: "#FFEFF5",
    });
    heart(ctx, 24, 26, 12, "#FF9BBB");
    heart(ctx, w - 24, bottom - 10, 10, "#FF9BBB");
    fillRR(ctx, 26, h - 48, w - 52, 30, 8, "#E2568B");
  },
};

/* ── Tema Aqua ────────────────────────────────────────────────────── */

/** Gradasi segar dengan ombak berlapis di bawah. */
const freshWave: Skin = {
  frameW: 300,
  padX: 30,
  padTop: 24,
  padBottom: 70,
  gap: 9,
  slotRadius: 6,
  slotEmpty: "#EAFBFA",
  captionColor: "#FFFFFF",
  captionFont: "600 12px Poppins, sans-serif",
  captionBaseline: 30,
  background: (ctx, w, h) => {
    ctx.fillStyle = gradient(ctx, h, "#E4FAF8", "#8FDDD8");
    ctx.fillRect(0, 0, w, h);
    const base = h - 62;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.moveTo(0, base);
    ctx.quadraticCurveTo(w * 0.25, base - 16, w * 0.5, base);
    ctx.quadraticCurveTo(w * 0.75, base + 16, w, base - 4);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#54C7BE";
    ctx.beginPath();
    ctx.moveTo(0, base + 12);
    ctx.quadraticCurveTo(w * 0.3, base - 4, w * 0.6, base + 10);
    ctx.quadraticCurveTo(w * 0.85, base + 20, w, base + 6);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  },
  slotFrame: (ctx, s) => {
    fillRR(ctx, s.x - 3, s.y - 3, s.w + 6, s.h + 6, 8, "#FFFFFF");
    ctx.strokeStyle = "#2F9E97";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6, 8);
    ctx.stroke();
  },
  ornament: (ctx, w, h) => {
    sprockets(ctx, {
      from: 16,
      to: h - 82,
      at: 9,
      vertical: true,
      color: "rgba(255,255,255,0.9)",
      step: 22,
    });
    sprockets(ctx, {
      from: 16,
      to: h - 82,
      at: w - 16,
      vertical: true,
      color: "rgba(255,255,255,0.9)",
      step: 22,
    });
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1.4;
    const bubbles: [number, number, number][] = [
      [24, 40, 5],
      [w - 26, 74, 4],
      [26, h - 104, 3.5],
    ];
    bubbles.forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    });
  },
};

/** Polkadot ceria, kolom kanan sengaja turun. */
const sodaPop: Skin = {
  frameW: 300,
  padX: 20,
  padTop: 22,
  padBottom: 68,
  gap: 10,
  slotRadius: 12,
  colOffset: [0, 14],
  slotEmpty: "#E8FBFF",
  captionColor: "#FFFFFF",
  captionFont: "bold 12px Poppins, sans-serif",
  captionBaseline: 33,
  background: (ctx, w, h) => {
    ctx.fillStyle = "#BFEFF7";
    ctx.fillRect(0, 0, w, h);
    for (let y = 14; y < h; y += 28) {
      for (let x = 14 + ((y / 28) % 2) * 14; x < w; x += 28) {
        dot(ctx, x, y, 3, "rgba(255,255,255,0.55)");
      }
    }
  },
  slotFrame: (ctx, s) => {
    fillRR(ctx, s.x - 5, s.y - 5, s.w + 10, s.h + 10, 16, "#FFFFFF");
  },
  ornament: (ctx, w, h) => {
    sprockets(ctx, {
      from: 14,
      to: w - 14,
      at: h - 14,
      vertical: false,
      color: "rgba(255,255,255,0.95)",
      step: 24,
    });
    sparkle(ctx, 22, 30, 6, "#FFFFFF");
    sparkle(ctx, w - 20, 46, 5, "#FFFFFF");
    heart(ctx, w - 26, h - 88, 10, "rgba(255,255,255,0.9)");
    fillRR(ctx, 26, h - 50, w - 52, 26, 13, "#2BB3C0");
  },
};

/** Garis ala handuk pantai, lubang film bundar, selotip washi di pojok. */
const oceanTape: Skin = {
  frameW: 300,
  padX: 28,
  padTop: 34,
  padBottom: 66,
  gap: 10,
  slotRadius: 3,
  slotEmpty: "#F0FCFF",
  captionColor: "#0F7C8C",
  captionFont: "bold 12px Poppins, sans-serif",
  captionBaseline: 28,
  background: (ctx, w, h) => {
    ctx.fillStyle = "#9FE3EE";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let y = 0; y < h; y += 20) ctx.fillRect(0, y, w, 8);
  },
  slotFrame: (ctx, s) => {
    fillRR(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 4, "#FFFFFF");
  },
  ornament: (ctx, w, h) => {
    roundHoles(ctx, {
      from: 26,
      to: h - 76,
      at: 12,
      r: 4.5,
      step: 22,
      color: "rgba(255,255,255,0.95)",
    });
    roundHoles(ctx, {
      from: 26,
      to: h - 76,
      at: w - 12,
      r: 4.5,
      step: 22,
      color: "rgba(255,255,255,0.95)",
    });
    // selotip washi miring di pojok kiri atas
    ctx.save();
    ctx.translate(14, 12);
    ctx.rotate(-Math.PI / 10);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(0, 0, 58, 13);
    ctx.fillStyle = "rgba(43,179,192,0.5)";
    for (let x = 4; x < 54; x += 10) ctx.fillRect(x, 0, 4, 13);
    ctx.restore();

    fillRR(ctx, 30, h - 46, w - 60, 26, 13, "#FFFFFF");
  },
};

export const SKINS = {
  "pink-strip": sweetStrip,
  "pink-pop": bubblePop,
  "pink-note": loveNote,
  "aqua-wave": freshWave,
  "aqua-dots": sodaPop,
  "aqua-tape": oceanTape,
} as const;

export type SkinId = keyof typeof SKINS;

export function isSkinId(id: string): id is SkinId {
  return id in SKINS;
}
