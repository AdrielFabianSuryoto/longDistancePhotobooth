import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { APP_NAME, PEOPLE, SENDER_EMAIL } from "@/config/couple";
import { useSession } from "@/context/SessionContext";
import { listMemories } from "@/lib/memories";
import type { Memory } from "@/lib/types";

export function EmailPreviewPage() {
  const { me, partner, lastMemoryId } = useSession();
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    let alive = true;
    listMemories()
      .then((data) => alive && setMemories(data))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const featured = memories.find((m) => m.id === lastMemoryId) ?? memories[0];

  const sender = me?.name ?? PEOPLE.adriel.name;
  const recipient = partner ?? PEOPLE.maria;

  return (
    <div className="bg-muted min-h-[calc(100vh-64px)] p-6 sm:p-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <h2 className="text-foreground font-display text-2xl font-bold sm:text-3xl">
            Email Preview
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Sending to {recipient.name}
          </p>
        </div>

        <div className="border-border overflow-hidden rounded-3xl border bg-white shadow-2xl">
          <div className="bg-muted border-border border-b px-6 py-4">
            <div className="mb-2 space-y-0.5">
              <p className="text-muted-foreground text-xs">
                From: {APP_NAME} &lt;{SENDER_EMAIL}&gt;
              </p>
              <p className="text-muted-foreground text-xs">To: {recipient.email}</p>
            </div>
            <p className="text-foreground text-sm font-semibold">
              A new memory was created just for you ♥
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-7 flex items-center gap-2">
              <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full">
                <Heart className="h-4 w-4 fill-white text-white" />
              </div>
              <span className="text-foreground font-display font-bold">{APP_NAME}</span>
            </div>

            <h2 className="text-foreground font-display mb-2 text-2xl font-bold">
              Hi {recipient.name}! 🌸
            </h2>
            <p className="text-muted-foreground mb-7 text-sm leading-relaxed">
              {sender} just created a beautiful new memory for the two of you. Take a
              look at your latest photobooth session — because every moment with you is
              worth keeping forever.
            </p>

            <div className="my-8 flex justify-center">
              <div
                className="bg-white shadow-xl"
                style={{ padding: "10px 10px 44px 10px", width: "180px" }}
              >
                {featured ? (
                  <img
                    src={featured.img}
                    alt="Our memory"
                    className="bg-accent aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="bg-accent text-muted-foreground flex aspect-square w-full items-center justify-center text-3xl">
                    🌸
                  </div>
                )}
                <p
                  className="mt-1 text-center text-gray-400"
                  style={{ fontFamily: "Georgia, serif", fontSize: "9px" }}
                >
                  {PEOPLE.adriel.name} &amp; {PEOPLE.maria.name} ♥
                </p>
              </div>
            </div>

            <div className="bg-accent/40 border-primary mb-7 rounded-r-2xl border-l-4 p-4">
              <p className="text-foreground text-sm leading-relaxed italic">
                “Distance means so little when someone means so much. This memory is
                proof that no matter how far apart we are, we can always find a way to
                be together.”
              </p>
            </div>

            <div className="text-center">
              <button className="bg-primary font-display rounded-2xl px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
                View Our Memory Together ♥
              </button>
            </div>

            <div className="border-border mt-8 border-t pt-6 text-center">
              <p className="text-muted-foreground text-xs leading-relaxed">
                This is a private message from {APP_NAME}.
                <br />
                Made with ♥ for {PEOPLE.adriel.name} &amp; {PEOPLE.maria.name} only.
              </p>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Preview only — real email sending comes later.
        </p>
      </div>
    </div>
  );
}
