import { useEffect } from "react";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FloatingHearts } from "@/components/FloatingHearts";
import { useRoom } from "@/context/RoomContext";
import { useSession } from "@/context/SessionContext";

export function WaitingRoomPage() {
  const { me, partner } = useSession();
  const navigate = useNavigate();
  const { partnerOnline, isController, sessionStage, claimControl, resetSession, setStage } =
    useRoom();

  // Mulai dari nol setiap kali kembali ke waiting room.
  useEffect(() => {
    resetSession();
  }, [resetSession]);

  // Participant mengikuti controller begitu sesi dimulai.
  useEffect(() => {
    if (!isController && sessionStage !== "waiting") navigate("/templates");
  }, [isController, sessionStage, navigate]);

  if (!me || !partner) return null;

  function startSession() {
    claimControl();
    setStage("templates");
    navigate("/templates");
  }

  return (
    <div className="bg-background relative flex min-h-[calc(100vh-64px)] flex-col items-center justify-center overflow-hidden p-6">
      <FloatingHearts />
      <div className="bg-accent/20 absolute top-10 right-10 h-80 w-80 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-xl text-center">
        <div
          className={`mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 transition-all ${
            partnerOnline ? "border border-green-200 bg-green-50" : "bg-accent"
          }`}
        >
          <div
            className={`h-2 w-2 animate-pulse rounded-full ${
              partnerOnline ? "bg-green-400" : "bg-secondary"
            }`}
          />
          <span
            className={`text-xs font-semibold ${
              partnerOnline ? "text-green-700" : "text-primary"
            }`}
          >
            {partnerOnline
              ? `${partner.name} just joined! 🎉`
              : `Waiting for ${partner.name}...`}
          </span>
        </div>

        <h2 className="text-foreground font-display mb-3 text-2xl font-bold sm:text-3xl">
          Setting up your space
        </h2>
        <p className="text-muted-foreground mb-12 text-base">
          {partnerOnline
            ? "You’re both here! Ready to create some memories?"
            : `${partner.name} hasn’t joined yet. Share the link to invite them.`}
        </p>

        <div className="mb-12 flex items-center justify-center gap-4 sm:gap-6">
          <div className="border-border flex w-36 flex-col items-center gap-3 rounded-3xl border bg-white/80 p-5 shadow-lg backdrop-blur-xl sm:w-44 sm:p-6">
            <div className="relative">
              <div className="bg-primary flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white shadow-md">
                {me.initial}
              </div>
              <div className="absolute -right-1 -bottom-1 h-5 w-5 rounded-full border-2 border-white bg-green-400" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-display font-semibold">{me.name}</p>
              <p className="text-xs font-medium text-green-600">● Online</p>
            </div>
            <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-1.5">
              <span className="text-xs font-semibold text-green-700">
                ✓ You&apos;re here
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="bg-border h-6 w-px" />
            <Heart className="text-primary fill-primary/40 h-5 w-5 animate-pulse" />
            <div className="bg-border h-6 w-px" />
          </div>

          <div
            className={`flex w-36 flex-col items-center gap-3 rounded-3xl border bg-white/80 p-5 shadow-lg backdrop-blur-xl transition-all sm:w-44 sm:p-6 ${
              partnerOnline ? "border-green-200" : "border-border"
            }`}
          >
            <div className="relative">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white shadow-md transition-colors ${
                  partnerOnline ? "bg-secondary" : "bg-muted"
                }`}
              >
                {partner.initial}
              </div>
              {partnerOnline && (
                <div className="absolute -right-1 -bottom-1 h-5 w-5 rounded-full border-2 border-white bg-green-400" />
              )}
            </div>
            <div className="text-center">
              <p className="text-foreground font-display font-semibold">
                {partner.name}
              </p>
              <p
                className={`text-xs font-medium ${
                  partnerOnline ? "text-green-600" : "text-muted-foreground"
                }`}
              >
                {partnerOnline ? "● Online" : "○ Waiting..."}
              </p>
            </div>
            <div
              className={`rounded-xl px-3 py-1.5 ${
                partnerOnline ? "border border-green-100 bg-green-50" : "bg-muted"
              }`}
            >
              <span
                className={`text-xs font-semibold ${
                  partnerOnline ? "text-green-700" : "text-muted-foreground"
                }`}
              >
                {partnerOnline ? "✓ Joined!" : "Waiting..."}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={startSession}
          disabled={!partnerOnline}
          className={`font-display rounded-2xl px-10 py-4 text-base font-semibold transition-all ${
            partnerOnline
              ? "bg-primary text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {partnerOnline ? "Start Session ♥" : `Waiting for ${partner.name}...`}
        </button>
      </div>
    </div>
  );
}
