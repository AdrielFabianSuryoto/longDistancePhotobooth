import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FloatingHearts } from "@/components/FloatingHearts";
import { useRoom } from "@/context/RoomContext";
import { useSession } from "@/context/SessionContext";
import { composeTemplatePreview } from "@/lib/compose";
import {
  TEMPLATES,
  THEME_LABEL,
  type PhotoCount,
  type TemplateId,
  type TemplateTheme,
} from "@/lib/types";

const THEMES: TemplateTheme[] = ["pink", "aqua", "classic"];

export function TemplateSelectionPage() {
  const { partner, template, count, setSetup } = useSession();
  const {
    isController,
    sessionStage,
    sharedTemplate,
    sharedCount,
    setStage,
    publishSetup,
  } = useRoom();
  const navigate = useNavigate();
  const [ownTemplate, setOwnTemplate] = useState<TemplateId>(template);
  const [ownCount, setOwnCount] = useState<PhotoCount>(count);

  // Controller yang memilih; participant hanya melihat pilihan controller.
  const selected = isController ? ownTemplate : sharedTemplate;
  const photoCount = isController ? ownCount : sharedCount;

  /**
   * Pratinjau digambar oleh kode yang sama dengan hasil akhirnya, dengan slot
   * dibiarkan kosong — jadi kartu ini tidak mungkin berbeda dari hasil jadi.
   */
  const previews = useMemo(() => {
    const map: Partial<Record<TemplateId, string>> = {};
    for (const t of TEMPLATES) map[t.id] = composeTemplatePreview(t.id, photoCount);
    return map;
  }, [photoCount]);

  useEffect(() => {
    if (isController) setStage("templates");
  }, [isController, setStage]);

  // Participant ikut pindah begitu controller menekan Continue.
  useEffect(() => {
    if (isController) return;
    if (sessionStage === "camera" || sessionStage === "countdown") {
      setSetup(sharedTemplate, sharedCount);
      navigate("/camera");
    }
  }, [isController, sessionStage, sharedTemplate, sharedCount, setSetup, navigate]);

  function pickTemplate(id: TemplateId) {
    if (!isController) return;
    setOwnTemplate(id);
    publishSetup(id, ownCount);
  }

  function pickCount(n: PhotoCount) {
    if (!isController) return;
    setOwnCount(n);
    publishSetup(ownTemplate, n);
  }

  function handleContinue() {
    if (!isController) return;
    setSetup(ownTemplate, ownCount);
    publishSetup(ownTemplate, ownCount);
    setStage("camera");
    navigate("/camera");
  }

  return (
    <div className="bg-background relative min-h-[calc(100vh-64px)] overflow-hidden p-6 sm:p-8">
      <FloatingHearts />
      <div className="bg-secondary/10 absolute right-0 bottom-0 h-96 w-96 rounded-full blur-3xl" />

      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <div className="bg-accent/70 border-primary/10 mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-2">
            <div className="bg-secondary h-2 w-2 animate-pulse rounded-full" />
            <span className="text-secondary text-xs font-semibold">
              {isController
                ? `${partner?.name} follows your pick`
                : `${partner?.name} is picking for the two of you...`}
            </span>
          </div>
          <h2 className="text-foreground font-display text-2xl font-bold sm:text-3xl">
            Choose your frame
          </h2>
          <p className="text-muted-foreground mt-2">
            Pick how you want to preserve this memory
          </p>
          <p className="text-muted-foreground/70 mt-1 text-xs">
            Every slot holds the two of you, side by side
          </p>
        </div>

        <div className="border-border mb-7 rounded-3xl border bg-white/80 p-6 backdrop-blur-xl">
          <h3 className="text-foreground font-display mb-4 text-sm font-semibold">
            How many photos?
          </h3>
          <div className="flex gap-3">
            {([2, 4, 6] as PhotoCount[]).map((n) => (
              <button
                key={n}
                onClick={() => pickCount(n)}
                disabled={!isController}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${
                  photoCount === n
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {n} Photos
              </button>
            ))}
          </div>
        </div>

        {THEMES.map((theme) => (
          <div key={theme} className="mb-8">
            <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              {THEME_LABEL[theme]}
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {TEMPLATES.filter((t) => t.theme === theme).map((t) => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t.id)}
                  disabled={!isController}
                  className={`relative rounded-3xl border-2 bg-white p-4 text-left transition-all hover:shadow-lg ${
                    selected === t.id
                      ? "border-primary shadow-primary/10 shadow-lg"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {selected === t.id && (
                    <div className="bg-primary absolute top-3 right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full shadow-sm">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div className="bg-muted mb-3 flex justify-center overflow-hidden rounded-2xl p-3">
                    <img
                      src={previews[t.id]}
                      alt={`${t.name} template preview`}
                      className="max-h-44 w-auto rounded-md shadow-sm"
                    />
                  </div>
                  <h4 className="text-foreground font-display text-sm font-bold">
                    {t.icon} {t.name}
                  </h4>
                  <p className="text-muted-foreground mt-0.5 text-xs">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={handleContinue}
          disabled={!isController}
          className={`font-display flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold transition-all ${
            isController
              ? "bg-primary text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
              : "bg-muted text-muted-foreground cursor-default"
          }`}
        >
          {!isController && <Loader2 className="h-4 w-4 animate-spin" />}
          {isController
            ? "Continue to Camera ♥"
            : `Waiting for ${partner?.name} to pick...`}
        </button>
      </div>
    </div>
  );
}
