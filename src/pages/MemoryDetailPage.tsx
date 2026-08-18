import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Calendar,
  Download,
  Loader2,
  MessageCircle,
  Send,
  Share2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { MoodBadge } from "@/components/MoodBadge";
import { MemoryFrame } from "@/components/frames/MemoryFrame";
import { PEOPLE } from "@/config/couple";
import { useSession } from "@/context/SessionContext";
import { downloadImage } from "@/lib/compose";
import { formatDate, formatTime } from "@/lib/format";
import { getMemory, listMemories, listSessionMemories } from "@/lib/memories";
import { addReaction, listReactions, subscribeReactions } from "@/lib/reactions";
import type { Memory, MemoryDetail, Reaction } from "@/lib/types";

export function MemoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { me, partner, authUserId } = useSession();

  const [memory, setMemory] = useState<MemoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [siblings, setSiblings] = useState<Memory[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // "latest" dipakai oleh link Memories di navbar
  useEffect(() => {
    let alive = true;
    setLoading(true);

    const load = async () => {
      const targetId =
        id === "latest" ? ((await listMemories())[0]?.id ?? null) : (id ?? null);
      if (!targetId) return null;
      if (id === "latest") navigate(`/memory/${targetId}`, { replace: true });
      return getMemory(targetId);
    };

    load()
      .then((m) => alive && setMemory(m))
      .catch(() => alive && setMemory(null))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [id, navigate]);

  // Frame pasangan dari sesi capture yang sama.
  useEffect(() => {
    if (!memory?.sessionId) return;
    let alive = true;
    listSessionMemories(memory.sessionId)
      .then((all) => alive && setSiblings(all.filter((m) => m.id !== memory.id)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [memory]);

  useEffect(() => {
    if (!memory) return;
    let alive = true;

    listReactions(memory.id)
      .then((r) => alive && setReactions(r))
      .catch(() => undefined);

    return subscribeReactions(memory.id, (incoming) => {
      setReactions((prev) =>
        prev.some((r) => r.id === incoming.id) ? prev : [...prev, incoming],
      );
    });
  }, [memory]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [reactions]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!memory || !body || sending) return;
    setSending(true);
    try {
      const saved = await addReaction(memory.id, body);
      setReactions((prev) =>
        prev.some((r) => r.id === saved.id) ? prev : [...prev, saved],
      );
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-background text-muted-foreground flex min-h-[calc(100vh-64px)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="bg-background min-h-[calc(100vh-64px)] p-8 text-center">
        <div className="mb-4 text-6xl">🔍</div>
        <p className="text-muted-foreground mb-6">Memory tidak ditemukan.</p>
        <button
          onClick={() => navigate("/gallery")}
          className="bg-primary rounded-2xl px-6 py-3 text-sm font-semibold text-white"
        >
          Kembali ke Gallery
        </button>
      </div>
    );
  }

  const dateLabel = formatDate(memory.createdAt);

  return (
    <div className="bg-background min-h-[calc(100vh-64px)] p-6 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/gallery")}
          className="text-muted-foreground hover:text-foreground mb-7 flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Gallery
        </button>

        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          <div>
            <div className="flex justify-center">
              {memory.photos.length > 0 ? (
                <MemoryFrame
                  template={memory.template}
                  photos={memory.photos}
                  caption={`${PEOPLE.adriel.name} & ${PEOPLE.maria.name} ♥ ${dateLabel}`}
                />
              ) : (
                <div
                  className="bg-white shadow-2xl"
                  style={{ padding: "14px 14px 56px 14px", maxWidth: "320px" }}
                >
                  <img
                    src={memory.img}
                    alt={memory.caption}
                    className="bg-accent w-full object-cover"
                    style={{ aspectRatio: "3/4" }}
                  />
                  <p
                    className="mt-1 text-center text-gray-400"
                    style={{ fontFamily: "Georgia, serif", fontSize: "10px" }}
                  >
                    {dateLabel} ♥
                  </p>
                </div>
              )}
            </div>

            {siblings.length > 0 && (
              <div className="mt-6">
                <p className="text-muted-foreground mb-3 text-center text-xs font-medium">
                  Dari sesi yang sama
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  {siblings.map((s) => (
                    <div key={s.id} className="flex flex-col items-center gap-1.5">
                      <img
                        src={s.img}
                        alt=""
                        className="bg-accent max-h-48 rounded-lg shadow-lg"
                      />
                      <span className="text-muted-foreground text-[10px]">
                        {s.createdBy === authUserId ? me?.name : partner?.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mx-auto mt-5 flex max-w-xs gap-3">
              <button
                onClick={() =>
                  void downloadImage(memory.img, `ourbooth-${memory.id}.jpg`)
                }
                className="bg-primary hover:bg-primary/90 flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
              <button
                onClick={() => navigate("/share")}
                className="border-border text-foreground hover:bg-accent flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="border-border rounded-3xl border bg-white/80 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-foreground font-display text-xl font-bold">
                    {memory.caption}
                  </h2>
                  <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-sm">
                    <Calendar className="h-3.5 w-3.5" />
                    {dateLabel}
                  </div>
                </div>
                <MoodBadge mood={memory.mood} />
              </div>
              <div className="border-border flex items-center gap-3 border-t pt-4">
                <div className="flex -space-x-2">
                  <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white">
                    {PEOPLE.adriel.initial}
                  </div>
                  <div className="bg-secondary flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white">
                    {PEOPLE.maria.initial}
                  </div>
                </div>
                <span className="text-muted-foreground text-sm">
                  {PEOPLE.adriel.name} &amp; {PEOPLE.maria.name}
                </span>
              </div>
            </div>

            <div className="border-border rounded-3xl border bg-white/80 p-6 backdrop-blur-xl">
              <h3 className="text-foreground font-display mb-4 flex items-center gap-2 text-sm font-semibold">
                <MessageCircle className="text-primary h-4 w-4" />
                Reactions
              </h3>

              <div ref={listRef} className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {reactions.length === 0 && (
                  <p className="text-muted-foreground py-6 text-center text-xs">
                    Belum ada reaction. Tulis yang pertama ♥
                  </p>
                )}
                {reactions.map((msg) => {
                  const mine = msg.author === authUserId;
                  const who = mine ? me : partner;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${
                        mine ? "flex-row" : "flex-row-reverse"
                      }`}
                    >
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                          mine ? "bg-primary" : "bg-secondary"
                        }`}
                      >
                        {who?.initial ?? "?"}
                      </div>
                      <div
                        className={`max-w-[220px] rounded-2xl px-3 py-2 text-xs ${
                          mine
                            ? "bg-accent text-foreground rounded-bl-none"
                            : "bg-primary/10 text-foreground rounded-br-none"
                        }`}
                      >
                        {msg.body}
                        <span
                          className="text-muted-foreground mt-0.5 block"
                          style={{ fontSize: "10px" }}
                        >
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={send} className="mt-4 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Tulis reaction..."
                  maxLength={200}
                  className="border-border bg-background focus:ring-primary/30 placeholder:text-muted-foreground/40 min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="bg-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-40"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
