import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, CameraOff, Loader2, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCamera } from "@/context/CameraContext";
import { useRoom } from "@/context/RoomContext";
import { useSession } from "@/context/SessionContext";

/** Satu kotak preview — dipakai untuk kamera sendiri maupun kamera pasangan. */
function CameraTile({
  stream,
  label,
  mirrored = false,
  fallback,
}: {
  stream: MediaStream | null;
  label: string;
  mirrored?: boolean;
  fallback: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-3xl bg-gray-900 shadow-2xl sm:min-h-[300px]">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />

      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          style={mirrored ? { transform: "scaleX(-1)" } : undefined}
        />
      )}

      <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-5">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="border border-white" />
        ))}
      </div>
      <div className="absolute top-4 left-4 h-6 w-6 rounded-tl border-t-2 border-l-2 border-white/30" />
      <div className="absolute top-4 right-4 h-6 w-6 rounded-tr border-t-2 border-r-2 border-white/30" />
      <div className="absolute bottom-4 left-4 h-6 w-6 rounded-bl border-b-2 border-l-2 border-white/30" />
      <div className="absolute right-4 bottom-4 h-6 w-6 rounded-br border-r-2 border-b-2 border-white/30" />

      {!stream && <div className="relative z-10 max-w-xs px-6 text-center">{fallback}</div>}

      <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 backdrop-blur">
        <span className="text-xs font-medium text-white/90">{label}</span>
      </div>
    </div>
  );
}

export function CameraRoomPage() {
  const { me, partner, count } = useSession();
  const { stream, status, errorMessage, start } = useCamera();
  const {
    isController,
    sessionStage,
    partnerInCall,
    remoteStream,
    callStatus,
    setStage,
    startCapture,
    startCall,
    retryCall,
  } = useRoom();
  const navigate = useNavigate();
  /** sedang transisi ke countdown */
  const [starting, setStarting] = useState(false);
  /** penjaga supaya perpindahan hanya dijadwalkan sekali */
  const goingRef = useRef(false);

  const cameraLive = status === "ready" && !!stream;

  useEffect(() => {
    if (isController) setStage("camera");
  }, [isController, setStage]);

  useEffect(() => {
    void start();
  }, [start]);

  // Begitu kamera sendiri menyala, sambungkan ke pasangan.
  useEffect(() => {
    if (stream) startCall(stream);
  }, [stream, startCall]);

  // Controller yang memulai capture; participant ikut begitu tahapannya berubah.
  // Timer-nya sengaja tidak dibersihkan di cleanup: setiap render ulang akan
  // membatalkannya sebelum sempat berjalan. `goingRef` yang menjaga agar
  // perpindahan tetap dijadwalkan tepat sekali.
  useEffect(() => {
    if (isController) return;

    // Jangan ikut kalau kamera sendiri belum menyala: halaman countdown akan
    // menolak dan melemparnya balik ke sini, jadi berputar tanpa henti.
    if (!cameraLive) return;

    if (sessionStage !== "countdown") {
      // controller membatalkan — kembalikan ke keadaan siap
      goingRef.current = false;
      setStarting(false);
      return;
    }

    if (goingRef.current) return;
    goingRef.current = true;
    setStarting(true);
    setTimeout(() => navigate("/countdown"), 400);
  }, [isController, sessionStage, cameraLive, navigate]);

  if (!me || !partner) return null;

  const partnerHere = partnerInCall;
  const bothLive = cameraLive && partnerInCall;
  const controllerName = isController ? me.name : partner.name;

  const people = [
    { name: me.name, init: me.initial, ready: cameraLive, you: true, color: "bg-primary" },
    {
      name: partner.name,
      init: partner.initial,
      ready: partnerInCall,
      you: false,
      color: "bg-secondary",
    },
  ];

  function beginCapture() {
    if (!isController || !bothLive || starting || goingRef.current) return;
    goingRef.current = true;
    setStarting(true);
    startCapture();
    setTimeout(() => navigate("/countdown"), 500);
  }

  const connectionLabel =
    callStatus === "connected"
      ? "Video connected"
      : callStatus === "failed"
        ? "Video connection failed"
        : partnerHere && partnerInCall
          ? "Connecting video..."
          : `Waiting for ${partner.name}`;

  return (
    <div className="bg-background flex min-h-[calc(100vh-64px)] flex-col gap-5 p-4 sm:p-6 lg:flex-row">
      <div className="relative flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row">
          <CameraTile
            stream={cameraLive ? stream : null}
            label={`${me.name} (you)`}
            mirrored
            fallback={
              <>
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/30">
                  {status === "requesting" ? (
                    <Loader2 className="h-7 w-7 animate-spin text-white/50" />
                  ) : status === "denied" || status === "error" ? (
                    <CameraOff className="h-7 w-7 text-white/50" />
                  ) : (
                    <Camera className="h-7 w-7 text-white/50" />
                  )}
                </div>
                <p className="text-sm text-white/60">
                  {status === "requesting"
                    ? "Waking up the camera..."
                    : (errorMessage ?? "Camera preview")}
                </p>
                {(status === "denied" || status === "error") && (
                  <button
                    onClick={() => void start()}
                    className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    Try again
                  </button>
                )}
              </>
            }
          />

          <CameraTile
            stream={remoteStream}
            label={partner.name}
            fallback={
              <>
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/30">
                  {callStatus === "failed" ? (
                    <CameraOff className="h-7 w-7 text-white/50" />
                  ) : partnerHere ? (
                    <Loader2 className="h-7 w-7 animate-spin text-white/50" />
                  ) : (
                    <Camera className="h-7 w-7 text-white/50" />
                  )}
                </div>
                <p className="text-sm text-white/60">
                  {callStatus === "failed"
                    ? "Video could not connect. This usually means a network is blocking the direct link."
                    : partnerHere
                      ? `Connecting to ${partner.name}'s camera...`
                      : `Waiting for ${partner.name} to join the camera room`}
                </p>
                {partnerHere && callStatus !== "connected" && (
                  <button
                    onClick={retryCall}
                    className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    Try reconnecting
                  </button>
                )}
              </>
            }
          />
        </div>

        {starting && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-white/95">
            <div className="text-center">
              <div className="mb-3 animate-bounce text-5xl">✓</div>
              <p className="text-primary font-display text-2xl font-bold">Both ready!</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Starting in a moment...
              </p>
            </div>
          </div>
        )}

        <div className="mt-3 flex justify-center gap-2">
          {[...Array(count)].map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${i === 0 ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col gap-4 lg:w-64">
        <div className="border-border rounded-3xl border bg-white/80 p-5 backdrop-blur-xl">
          <h3 className="text-foreground font-display mb-4 flex items-center gap-2 text-sm font-semibold">
            <Wifi className="text-primary h-4 w-4" />
            Session Status
          </h3>
          {people.map((p) => (
            <div key={p.name} className="mb-3 flex items-center gap-3 last:mb-0">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${p.color}`}
              >
                {p.init}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">
                  {p.name} {p.you ? "(you)" : ""}
                </p>
                <p
                  className={`text-xs ${p.ready ? "text-green-600" : "text-muted-foreground"}`}
                >
                  {p.ready ? "✓ Camera on" : "Preparing..."}
                </p>
              </div>
              <div
                className={`h-2 w-2 shrink-0 rounded-full ${
                  p.ready ? "animate-pulse bg-green-400" : "bg-gray-300"
                }`}
              />
            </div>
          ))}
          <div className="border-border mt-4 border-t pt-3">
            <p
              className={`text-xs ${
                callStatus === "connected"
                  ? "text-green-600"
                  : callStatus === "failed"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              ● {connectionLabel}
            </p>
          </div>
        </div>

        <div className="bg-accent/40 border-primary/10 rounded-3xl border p-5">
          <h4 className="text-foreground font-display mb-3 text-sm font-semibold">
            ✨ Tips
          </h4>
          <ul className="text-muted-foreground space-y-2 text-xs">
            <li>• Face in the frame</li>
            <li>• Good lighting helps</li>
            <li>• Smile naturally!</li>
            <li>• {count} photos total</li>
          </ul>
        </div>

        <div className="lg:mt-auto">
          <button
            onClick={beginCapture}
            disabled={!isController || !bothLive || starting}
            className={`font-display w-full rounded-2xl py-4 text-sm font-semibold transition-all ${
              isController && bothLive && !starting
                ? "bg-primary text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {isController ? "Start Capture ♥" : `Waiting for ${controllerName}...`}
          </button>
          <p className="text-muted-foreground mt-2 text-center text-xs">
            {!isController
              ? `${controllerName} starts the photos`
              : !cameraLive
                ? "Waiting for camera permission"
                : !partnerInCall
                  ? `Waiting for ${partner.name}'s camera`
                  : "You are both ready"}
          </p>
        </div>
      </div>
    </div>
  );
}
