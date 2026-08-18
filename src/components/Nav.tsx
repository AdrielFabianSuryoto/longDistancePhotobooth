import { Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { APP_SHORT_NAME } from "@/config/couple";
import { useSession } from "@/context/SessionContext";

export function Nav() {
  const { me, signOut } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const links = [
    { to: "/connect", label: "Connect" },
    { to: "/gallery", label: "Gallery" },
    // "latest" diselesaikan di halaman detail, supaya nav tidak perlu query
    { to: "/memory/latest", label: "Memories" },
    { to: "/share", label: "Share" },
  ];

  const isActive = (to: string) =>
    to.startsWith("/memory") ? pathname.startsWith("/memory") : pathname === to;

  const linkButtons = links.map(({ to, label }) => (
    <button
      key={label}
      onClick={() => navigate(to)}
      className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
        isActive(to)
          ? "bg-primary text-white shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {label}
    </button>
  ));

  return (
    <nav className="bg-background/80 border-border sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full shadow-sm">
              <Heart className="h-4 w-4 fill-white text-white" />
            </div>
            <span className="text-foreground font-display text-base font-bold">
              {APP_SHORT_NAME}
            </span>
          </button>

          <div className="hidden items-center gap-1 md:flex">{linkButtons}</div>

          {me && (
            <button
              onClick={() => {
                void signOut().then(() => navigate("/"));
              }}
              title="Sign out / switch person"
              className="bg-accent hover:bg-accent/70 flex items-center gap-2 rounded-full px-3 py-2 transition-colors sm:px-4"
            >
              <div className="bg-primary flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white">
                {me.initial}
              </div>
              <span className="text-foreground hidden text-sm font-medium sm:inline">
                {me.name}
              </span>
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            </button>
          )}
        </div>

        <div className="flex gap-1 overflow-x-auto pb-2 md:hidden">{linkButtons}</div>
      </div>
    </nav>
  );
}
