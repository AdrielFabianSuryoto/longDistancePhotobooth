import { useEffect, useState } from "react";
import { AlertCircle, Calendar, Camera, Heart, Loader2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MoodBadge } from "@/components/MoodBadge";
import { formatDate } from "@/lib/format";
import { listMemories } from "@/lib/memories";
import { MOODS, type Memory } from "@/lib/types";

const HEIGHTS = ["h-64", "h-48", "h-56", "h-72", "h-52", "h-60"];

export function GalleryPage() {
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    listMemories()
      .then((data) => alive && setMemories(data))
      .catch((err: Error) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Foto Adriel & Maria dari satu sesi capture tampil sebagai satu kartu.
  const bySession = memories.filter((m, i) => {
    if (!m.sessionId) return true;
    return memories.findIndex((x) => x.sessionId === m.sessionId) === i;
  });

  const filtered = bySession.filter((m) => {
    const matchesMood = filter === "all" || m.mood === filter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      m.caption.toLowerCase().includes(q) ||
      formatDate(m.createdAt).toLowerCase().includes(q);
    return matchesMood && matchesSearch;
  });

  return (
    <div className="bg-background min-h-[calc(100vh-64px)] p-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-foreground font-display text-2xl font-bold sm:text-3xl">
              Our Memory Gallery
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {loading
                ? "Memuat..."
                : `${bySession.length} ${bySession.length === 1 ? "memory" : "memories"} together`}
            </p>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search memories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border focus:ring-primary/30 w-full rounded-xl border bg-white py-2.5 pr-4 pl-10 text-sm focus:ring-2 focus:outline-none sm:w-56"
            />
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {["all", ...MOODS].map((m) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all ${
                filter === m
                  ? "bg-primary text-white shadow-sm"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground border bg-white"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {error && (
          <div className="text-destructive mb-6 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Gagal memuat memory: {error}</span>
          </div>
        )}

        {loading ? (
          <div className="text-muted-foreground flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="columns-1 gap-5 sm:columns-2 md:columns-3">
            {filtered.map((memory, i) => (
              <div
                key={memory.id}
                className="group mb-5 block w-full cursor-pointer break-inside-avoid text-left"
                onClick={() => navigate(`/memory/${memory.id}`)}
              >
                <div className="border-border overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative overflow-hidden">
                    <img
                      src={memory.img}
                      alt={memory.caption}
                      className={`bg-accent w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                        HEIGHTS[i % HEIGHTS.length]
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute right-3 bottom-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="rounded-full bg-white/90 p-1.5 shadow">
                        <Heart className="text-primary h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-foreground flex-1 text-sm leading-snug font-medium">
                        {memory.caption}
                      </p>
                      <MoodBadge mood={memory.mood} />
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3 w-3" />
                      {formatDate(memory.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && bySession.length > 0 && (
          <div className="py-24 text-center">
            <div className="mb-4 text-6xl">📷</div>
            <p className="text-muted-foreground">No memories found</p>
          </div>
        )}

        {!loading && !error && bySession.length === 0 && (
          <div className="py-20 text-center">
            <div className="mb-4 text-6xl">🌸</div>
            <h3 className="text-foreground font-display mb-2 text-lg font-bold">
              Belum ada memory
            </h3>
            <p className="text-muted-foreground mx-auto mb-7 max-w-sm text-sm">
              Mulai sesi photobooth pertama kalian — hasilnya akan muncul di sini.
            </p>
            <button
              onClick={() => navigate("/connect")}
              className="bg-primary font-display inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              <Camera className="h-4 w-4" />
              Mulai Sesi ♥
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
