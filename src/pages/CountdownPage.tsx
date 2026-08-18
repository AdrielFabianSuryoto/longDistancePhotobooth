import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCamera } from "@/context/CameraContext";
import { useRoom } from "@/context/RoomContext";
import { useSession } from "@/context/SessionContext";

const TICK_MS = 1000;
const SMILE_MS = 700;
const AFTER_SHOT_MS = 900;

export function CountdownPage() {
  const { count, setPhotos, me, partner } = useSession();
  const { stream, capturePair } = useCamera();
  const { remoteStream } = useRoom();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const takenRef = useRef<string[]>([]);
  const [shot, setShot] = useState(0);
  const [num, setNum] = useState(3);
  const [flash, setFlash] = useState(false);
  const [taken, setTaken] = useState<string[]>([]);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (remoteRef.current) remoteRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const finish = useCallback(() => {
    setPhotos(takenRef.current);
    navigate("/preview", { replace: true });
  }, [navigate, setPhotos]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (num > 0) {
      timers.push(setTimeout(() => setNum((n) => n - 1), TICK_MS));
    } else {
      // num === 0 → tampilkan "Smile!", lalu jepret.
      timers.push(
        setTimeout(() => {
          // satu jepretan = kamu di kiri + pasangan di kanan
          const frame = capturePair(videoRef.current, remoteRef.current);
          if (frame) {
            takenRef.current = [...takenRef.current, frame];
            setTaken(takenRef.current);
          }
          setFlash(true);
          timers.push(setTimeout(() => setFlash(false), 180));
          timers.push(
            setTimeout(() => {
              // dibatasi oleh nomor jepretan, bukan jumlah foto yang berhasil,
              // supaya tidak berputar terus kalau ada frame yang gagal diambil
              if (shot + 1 >= count) finish();
              else {
                setShot((s) => s + 1);
                setNum(3);
              }
            }, AFTER_SHOT_MS),
          );
        }, SMILE_MS),
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [num, shot, count, capturePair, finish]);

  if (!stream) return <Navigate to="/camera" replace />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 flex">
        <div className="relative h-full w-1/2 overflow-hidden border-r border-white/10">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: "scaleX(-1)", filter: "brightness(0.55)" }}
          />
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-medium text-white/80">
            {me?.name}
          </span>
        </div>
        <div className="relative h-full w-1/2 overflow-hidden">
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ filter: "brightness(0.55)" }}
          />
          {!remoteStream && (
            <div className="bg-accent/10 absolute inset-0 flex items-center justify-center text-sm text-white/40">
              {partner?.name} belum tersambung
            </div>
          )}
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-medium text-white/80">
            {partner?.name}
          </span>
        </div>
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {flash && <div className="absolute inset-0 z-30 bg-white" />}

      <div className="absolute top-8 left-1/2 z-20 -translate-x-1/2 text-center">
        <p className="font-display text-sm font-semibold tracking-wide text-white/80">
          Photo {Math.min(shot + 1, count)} of {count}
        </p>
        <div className="mt-2 flex justify-center gap-1.5">
          {[...Array(count)].map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i < taken.length ? "bg-white" : "bg-white/25"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 text-center select-none">
        {num > 0 ? (
          <div
            key={`${shot}-${num}`}
            className="animate-countdown-num leading-none"
            style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "clamp(100px, 25vw, 200px)",
              fontWeight: 800,
              color: "white",
              textShadow:
                "0 0 80px rgba(201,123,132,0.9), 0 0 160px rgba(201,123,132,0.5)",
            }}
          >
            {num}
          </div>
        ) : (
          <div
            className="animate-pulse"
            style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: "clamp(48px, 10vw, 72px)",
              fontWeight: 700,
              color: "white",
            }}
          >
            😊 Smile!
          </div>
        )}
        <p className="mt-4 text-lg text-white/60">{num > 0 ? "Get ready..." : ""}</p>
        <div className="absolute top-0 -left-24 hidden animate-pulse text-5xl text-white/15 sm:block">
          ♥
        </div>
        <div
          className="absolute top-0 -right-24 hidden animate-pulse text-5xl text-white/15 sm:block"
          style={{ animationDelay: "0.5s" }}
        >
          ♥
        </div>
      </div>

      {taken.length > 0 && (
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {taken.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="h-12 w-auto rounded-lg border-2 border-white/40 object-cover sm:h-16"
            />
          ))}
        </div>
      )}
    </div>
  );
}
