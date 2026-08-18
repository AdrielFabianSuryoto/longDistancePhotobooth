import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "error";

type CameraValue = {
  stream: MediaStream | null;
  status: CameraStatus;
  errorMessage: string | null;
  start: () => Promise<void>;
  stop: () => void;
  /**
   * Ambil satu jepretan berisi dua potret berdampingan: kamera sendiri di
   * kiri (dicermin seperti preview) dan kamera pasangan di kanan.
   */
  capturePair: (
    local: HTMLVideoElement | null,
    remote: HTMLVideoElement | null,
  ) => string | null;
};

const CameraContext = createContext<CameraValue | null>(null);

/** Tiap orang direkam potret 3:4; satu jepretan = dua potret berdampingan. */
const HALF_W = 810;
const HALF_H = 1080;
const EMPTY_HALF = "#f6d6d6";

export function CameraProvider({ children }: { children: ReactNode }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    if (streamRef.current?.active) return;
    setStatus("requesting");
    setErrorMessage(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = s;
      setStream(s);
      setStatus("ready");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setErrorMessage(
          "Camera access was blocked. Allow the camera in your browser settings, then try again.",
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setStatus("error");
        setErrorMessage("No camera found on this device.");
      } else {
        setStatus("error");
        setErrorMessage("The camera could not start. Try closing other apps that might be using it.");
      }
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setStatus("idle");
  }, []);

  const capturePair = useCallback(
    (local: HTMLVideoElement | null, remote: HTMLVideoElement | null) => {
      const canvas = document.createElement("canvas");
      canvas.width = HALF_W * 2;
      canvas.height = HALF_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.fillStyle = EMPTY_HALF;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      /** object-fit: cover ke satu sisi potret */
      const drawHalf = (
        video: HTMLVideoElement | null,
        x: number,
        mirrored: boolean,
      ) => {
        if (!video?.videoWidth || !video.videoHeight) return false;
        const scale = Math.max(HALF_W / video.videoWidth, HALF_H / video.videoHeight);
        const sw = HALF_W / scale;
        const sh = HALF_H / scale;
        const sx = (video.videoWidth - sw) / 2;
        const sy = (video.videoHeight - sh) / 2;

        ctx.save();
        if (mirrored) {
          ctx.translate(x + HALF_W, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, HALF_W, HALF_H);
        } else {
          ctx.drawImage(video, sx, sy, sw, sh, x, 0, HALF_W, HALF_H);
        }
        ctx.restore();
        return true;
      };

      const gotLocal = drawHalf(local, 0, true);
      drawHalf(remote, HALF_W, false);
      if (!gotLocal) return null;

      return canvas.toDataURL("image/jpeg", 0.9);
    },
    [],
  );

  const value = useMemo<CameraValue>(
    () => ({ stream, status, errorMessage, start, stop, capturePair }),
    [stream, status, errorMessage, start, stop, capturePair],
  );

  return <CameraContext.Provider value={value}>{children}</CameraContext.Provider>;
}

export function useCamera(): CameraValue {
  const ctx = useContext(CameraContext);
  if (!ctx) throw new Error("useCamera must be used inside CameraProvider");
  return ctx;
}
