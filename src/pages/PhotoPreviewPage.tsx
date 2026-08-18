import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Download,
  Grid,
  Heart,
  Loader2,
  Mail,
  RotateCcw,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { FloatingHearts } from "@/components/FloatingHearts";
import { MemoryFrame } from "@/components/frames/MemoryFrame";
import { PEOPLE } from "@/config/couple";
import { useCamera } from "@/context/CameraContext";
import { useRoom } from "@/context/RoomContext";
import { useSession } from "@/context/SessionContext";
import { composeMemory, downloadImage } from "@/lib/compose";
import { formatDate } from "@/lib/format";
import { createMemory } from "@/lib/memories";
import { MOODS, templateName, type Mood } from "@/lib/types";

export function PhotoPreviewPage() {
  const { template, photos, setPhotos, setLastMemoryId } = useSession();
  const { stop } = useCamera();
  const { captureId, endCall } = useRoom();
  const navigate = useNavigate();
  /** dikunci sekali: id capture bersama, supaya foto keduanya jadi satu memory */
  const [sessionId] = useState<string | null>(captureId);

  const [composed, setComposed] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState<Mood>("Happy");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const frameCaption = `${PEOPLE.adriel.name} & ${PEOPLE.maria.name} ♥ ${today.toLocaleDateString()}`;

  // Sesi selesai: matikan kamera dan tutup sambungan video ke pasangan.
  useEffect(() => {
    stop();
    endCall();
  }, [stop, endCall]);

  useEffect(() => {
    if (photos.length === 0) return;
    let alive = true;
    composeMemory({ template, photos, caption: frameCaption })
      .then((url) => alive && setComposed(url))
      .catch(() => alive && setError("Gagal menyusun frame foto."));
    return () => {
      alive = false;
    };
    // frameCaption ikut berubah hanya kalau tanggalnya berubah
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, photos]);

  if (photos.length === 0) return <Navigate to="/camera" replace />;

  async function handleSave() {
    if (!composed || saved || saving) return;
    setSaving(true);
    setError(null);
    try {
      const memory = await createMemory({
        template,
        mood,
        caption: caption.trim() || "Our photobooth session ♥",
        composed,
        photos,
        sessionId,
      });
      setLastMemoryId(memory.id);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Gagal menyimpan: ${err.message}`
          : "Gagal menyimpan memory.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    if (!composed) return;
    await downloadImage(composed, `ourbooth-${template}-${Date.now()}.jpg`);
  }

  return (
    <div className="bg-background relative min-h-[calc(100vh-64px)] overflow-hidden p-6 sm:p-8">
      <FloatingHearts />
      <div className="bg-accent/25 absolute top-0 right-0 h-96 w-96 rounded-full blur-3xl" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="text-foreground font-display mb-1.5 text-2xl font-bold sm:text-3xl">
            Your Memory is Ready! 🌸
          </h2>
          <p className="text-muted-foreground">{formatDate(today.toISOString())}</p>
        </div>

        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-center lg:gap-14">
          <div className="flex flex-col items-center gap-3">
            <MemoryFrame template={template} photos={photos} caption={frameCaption} />
            <p className="text-muted-foreground text-xs font-medium">
              {templateName(template)} · {photos.length} photos
            </p>
          </div>

          <div className="flex w-full max-w-xs flex-col gap-4 lg:self-center">
            <div className="border-border rounded-3xl border bg-white/80 p-5 backdrop-blur-xl">
              <label
                htmlFor="caption"
                className="text-foreground mb-2 block text-sm font-medium"
              >
                Caption
              </label>
              <input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Tulis sesuatu tentang momen ini..."
                maxLength={80}
                className="border-border bg-background focus:ring-primary/30 placeholder:text-muted-foreground/40 w-full rounded-xl border px-3 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none"
              />
              <p className="text-foreground mt-4 mb-2 text-sm font-medium">Mood</p>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                      mood === m
                        ? "bg-primary text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-destructive flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs">
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={() => void handleSave()}
              disabled={!composed || saved || saving}
              className={`font-display flex items-center gap-3 rounded-2xl px-6 py-3 text-sm font-semibold transition-all ${
                saved
                  ? "border border-green-200 bg-green-50 text-green-700"
                  : "bg-primary text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
              }`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Heart className="h-4 w-4" />
              )}
              {saving ? "Mengunggah..." : saved ? "Saved to Gallery!" : "Save Memory"}
            </button>

            <button
              onClick={() => void handleDownload()}
              disabled={!composed}
              className="border-border text-foreground hover:bg-accent flex items-center gap-3 rounded-2xl border bg-white px-6 py-3 text-sm font-semibold transition-all disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              Download
            </button>

            <button
              onClick={() => navigate("/share")}
              className="border-border text-foreground hover:bg-accent flex items-center gap-3 rounded-2xl border bg-white px-6 py-3 text-sm font-semibold transition-all"
            >
              <Mail className="h-4 w-4" />
              Send by Email
            </button>

            <button
              onClick={() => {
                setPhotos([]);
                navigate("/camera");
              }}
              className="text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-2xl px-6 py-3 text-sm font-semibold transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              Retake Photos
            </button>

            {saved && (
              <button
                onClick={() => navigate("/gallery")}
                className="bg-accent text-primary hover:bg-accent/80 border-primary/20 flex items-center gap-3 rounded-2xl border px-6 py-3 text-sm font-semibold transition-all"
              >
                <Grid className="h-4 w-4" />
                View Gallery
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
