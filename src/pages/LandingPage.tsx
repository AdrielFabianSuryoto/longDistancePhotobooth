import { Fragment } from "react";
import { ChevronRight, Heart, Lock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FloatingHearts } from "@/components/FloatingHearts";
import { PolaroidFrame } from "@/components/PolaroidFrame";
import photoAnniversary from "@/images/3.jpg.jpeg";
import photoForever from "@/images/2.jpg.jpeg";
import photoUsAlways from "@/images/1.jpg.jpeg";
import { APP_NAME, PEOPLE, type UserId } from "@/config/couple";

const FOOTER_ITEMS = [
  { icon: <Lock className="h-3.5 w-3.5" />, text: "Private & secure" },
  { icon: <Heart className="h-3.5 w-3.5" />, text: "Made with love" },
  { icon: <Sparkles className="h-3.5 w-3.5" />, text: "Every memory counts" },
];

export function LandingPage() {
  const navigate = useNavigate();

  function choose(u: UserId) {
    navigate(`/verify/${u}`);
  }

  return (
    <div className="bg-background relative flex min-h-screen flex-col overflow-hidden">
      <FloatingHearts />

      <div className="flex items-center justify-center px-6 pt-8">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-md">
            <Heart className="h-4 w-4 fill-white text-white" />
          </div>
          <span className="text-foreground font-display text-center text-lg font-bold sm:text-xl">
            {APP_NAME}
          </span>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-12 px-6 py-12 lg:flex-row">
        <div className="relative z-10 flex-1">
          <div className="bg-accent mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 shadow-sm">
            <span className="text-primary text-xs font-semibold">
              ✦ Made just for the two of us
            </span>
          </div>
          <h1 className="text-foreground font-display mb-6 text-4xl leading-[1.15] font-bold sm:text-5xl lg:text-6xl">
            Create Memories
            <br />
            <span className="text-primary">Together,</span>
            <br />
            No Matter the Distance.
          </h1>
          <p className="text-muted-foreground mb-10 max-w-md text-base leading-relaxed sm:text-lg">
            A private space for {PEOPLE.adriel.name} and {PEOPLE.maria.name} to
            capture shared moments, build a timeline of love, and feel close -
            even from miles apart.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => choose("adriel")}
              className="group bg-primary font-display flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                A
              </div>
              I&apos;m {PEOPLE.adriel.name}
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => choose("maria")}
              className="group bg-secondary font-display flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                M
              </div>
              I&apos;m {PEOPLE.maria.name}
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="relative h-80 w-80">
            <div className="bg-accent/50 absolute inset-8 rounded-full blur-2xl" />
            <div className="absolute top-2 right-0">
              <PolaroidFrame
                src={photoAnniversary}
                caption="July 24 ♥"
                rotate={6}
                size="sm"
                mirrored
              />
            </div>
            <div className="absolute bottom-4 left-0">
              <PolaroidFrame
                src={photoForever}
                caption="always & forever"
                rotate={-7}
                size="sm"
              />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <PolaroidFrame
                src={photoUsAlways}
                caption="us, always 🌸"
                rotate={2}
                size="md"
              />
            </div>
            <div className="text-primary absolute top-1/3 right-1/4 animate-pulse text-2xl">
              ♥
            </div>
            <div className="border-border absolute -bottom-4 right-6 rounded-2xl border bg-white/90 px-3 py-2 shadow-lg backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span className="text-muted-foreground text-xs font-medium">
                  Connected across distance
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6 px-6 pb-8 sm:gap-8">
        {FOOTER_ITEMS.map(({ icon, text }, i) => (
          <Fragment key={text}>
            {i > 0 && <div className="bg-border hidden h-1 w-1 rounded-full sm:block" />}
            <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
              {icon}
              <span>{text}</span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
