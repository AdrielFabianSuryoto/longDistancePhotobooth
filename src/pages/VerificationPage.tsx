import { useState, type FormEvent } from "react";
import { AlertCircle, Calendar, Heart, Loader2, Lock } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { FloatingHearts } from "@/components/FloatingHearts";
import { PEOPLE, getPartner, getPerson, type UserId } from "@/config/couple";
import { useSession } from "@/context/SessionContext";

export function VerificationPage() {
  const { who } = useParams<{ who: string }>();
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [birthday, setBirthday] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!who || !(who in PEOPLE)) return <Navigate to="/" replace />;

  const userId = who as UserId;
  const me = getPerson(userId);
  const partner = getPartner(userId);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(userId, birthday, code);
      navigate("/connect");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <FloatingHearts />
      <div className="bg-accent/30 absolute top-16 right-16 h-72 w-72 rounded-full blur-3xl" />
      <div className="bg-secondary/15 absolute bottom-16 left-16 h-56 w-56 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        <form
          onSubmit={submit}
          className="border-border rounded-3xl border bg-white/80 p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-5 flex justify-center">
            <div className="bg-accent flex h-16 w-16 items-center justify-center rounded-full shadow-inner">
              <Heart className="text-primary fill-primary/70 h-7 w-7" />
            </div>
          </div>
          <h2 className="text-foreground font-display mb-1.5 text-center text-2xl font-bold">
            Welcome back, {me.name} 🌸
          </h2>
          <p className="text-muted-foreground mb-7 text-center text-sm">
            Just a little check to keep this space ours
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="birthday"
                className="text-foreground mb-2 flex items-center gap-1.5 text-sm font-medium"
              >
                <Calendar className="text-primary h-4 w-4" />
                Your Birthday
              </label>
              <input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => {
                  setBirthday(e.target.value);
                  setError(null);
                }}
                className="border-border bg-background focus:ring-primary/30 w-full rounded-xl border px-4 py-3 transition-all focus:ring-2 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="code"
                className="text-foreground mb-2 flex items-center gap-1.5 text-sm font-medium"
              >
                <Lock className="text-primary h-4 w-4" />
                Secret Code
              </label>
              <input
                id="code"
                type="password"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError(null);
                }}
                placeholder="our little secret..."
                className="border-border bg-background focus:ring-primary/30 placeholder:text-muted-foreground/40 w-full rounded-xl border px-4 py-3 transition-all focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="text-destructive mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="bg-primary font-display mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:opacity-70"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Opening..." : "Enter Our Space ♥"}
          </button>
          <p className="text-muted-foreground mt-4 text-center text-xs">
            Private. Only you and {partner.name} can enter.
          </p>
        </form>
      </div>
    </div>
  );
}
