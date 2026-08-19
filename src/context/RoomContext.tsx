/**
 * Satu channel Realtime untuk seluruh sesi, hidup lintas halaman.
 *
 * Tiga tugas:
 * 1. Peran — siapa pun yang menekan Start Session lebih dulu jadi controller;
 *    yang lain jadi participant dan hanya mengikuti.
 * 2. State sesi — tahapan, pilihan frame, jumlah foto, dan id capture, semuanya
 *    disiarkan lewat presence controller.
 * 3. Signaling WebRTC — supaya keduanya bisa melihat kamera satu sama lain.
 *
 * Channel-nya sengaja di level aplikasi, bukan per halaman: kalau dibuat ulang
 * tiap pindah halaman, sinyalnya hilang tepat saat halaman unmount.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { UserId } from "@/config/couple";
import { useSession } from "@/context/SessionContext";
import { formatDate } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { PhotoCount, TemplateId } from "@/lib/types";

const ROOM = "booth-room";

/** Adriel yang membuat offer, Maria yang menjawab — supaya tidak saling tabrakan. */
const OFFERER: UserId = "adriel";

/** Kalau keduanya menekan Start Session nyaris bersamaan, ini yang menang. */
const CONTROL_TIEBREAK: UserId = "adriel";

/**
 * STUN alone only works when both devices' networks allow a direct path to
 * be discovered (most home Wi-Fi). It fails on carrier-grade NAT (common on
 * mobile data), symmetric NAT, and strict office/campus firewalls — the
 * connection just sits at "connecting" forever. A TURN relay is the only
 * fix for that; it's opt-in via env vars so the app still works with STUN
 * only when none is configured.
 */
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    });
  }

  return servers;
}

const ICE_SERVERS = buildIceServers();

export type Stage = "waiting" | "templates" | "camera" | "countdown";
export type CallStatus = "idle" | "connecting" | "connected" | "failed";

type PresencePayload = {
  user: UserId;
  stage: Stage;
  isController: boolean;
  /** kamera sudah menyala dan siap disambungkan */
  inCall: boolean;
  template: TemplateId;
  count: PhotoCount;
  captureId: string | null;
  /** tanggal sesi menurut controller, supaya frame keduanya bertuliskan sama */
  captureDate: string | null;
  /** waktu update terakhir — dipakai memilih entri presence paling baru */
  ts: number;
};

type Signal =
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  /** participant meminta controller mengulang koneksi video dari awal */
  | { type: "restart" };

type RoomValue = {
  partnerOnline: boolean;
  partnerInCall: boolean;
  /** true kalau akulah yang memegang kendali sesi */
  isController: boolean;
  /** tahapan menurut controller — inilah yang diikuti kedua belah pihak */
  sessionStage: Stage;
  /** pilihan controller, ikut tersiar ke participant */
  sharedTemplate: TemplateId;
  sharedCount: PhotoCount;
  /** id capture bersama, dipakai supaya foto keduanya jadi satu memory */
  captureId: string | null;
  /** tanggal sesi dari controller; dipakai kedua perangkat untuk caption frame */
  captureDate: string | null;
  remoteStream: MediaStream | null;
  callStatus: CallStatus;

  claimControl: () => void;
  resetSession: () => void;
  setStage: (stage: Stage) => void;
  publishSetup: (template: TemplateId, count: PhotoCount) => void;
  startCapture: () => string;
  startCall: (local: MediaStream) => void;
  endCall: () => void;
  /** coba sambungkan ulang video secara manual — bisa dipicu dari kedua sisi */
  retryCall: () => void;
};

const RoomContext = createContext<RoomValue | null>(null);

const BLANK: Omit<PresencePayload, "user" | "ts"> = {
  stage: "waiting",
  isController: false,
  inCall: false,
  template: "polaroid",
  count: 4,
  captureId: null,
  captureDate: null,
};

/** Jeda penggabungan sebelum presence dikirim, dalam milidetik. */
const TRACK_DEBOUNCE = 80;

/**
 * Presence dikirim ulang berkala. Supabase hanya mengirim selisih sekali; kalau
 * satu paket hilang (jaringan seluler, socket sempat tidur), pandangan salah
 * satu pihak akan basi selamanya. Denyut ini membuatnya pulih sendiri.
 */
const PRESENCE_HEARTBEAT_MS = 5000;

/**
 * Offer dikirim lewat broadcast yang tanpa jaminan sampai, jadi perlu diulang.
 * Jaraknya sengaja longgar: ICE checks lintas jaringan sungguhan (bukan satu
 * WiFi) bisa makan waktu 10 detik lebih, dan mengulang terlalu cepat cuma
 * membatalkan percobaan yang sebenarnya masih berjalan.
 */
const OFFER_RETRY_MS = 12000;
const MAX_OFFER_ATTEMPTS = 5;

export function RoomProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();

  const [mine, setMine] = useState<PresencePayload | null>(null);
  const [partner, setPartner] = useState<PresencePayload | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  /** state, bukan ref, supaya efek negosiasi ikut jalan saat kamera lokal siap */
  const [localReady, setLocalReady] = useState(false);
  /** dinaikkan untuk memaksa offer dibuat ulang saat sambungan tak kunjung jadi */
  const [offerAttempt, setOfferAttempt] = useState(0);
  /** dinaikkan saat retryCall() dipanggil, supaya klik tetap berefek walau offerAttempt kebetulan tidak berubah */
  const [manualRetry, setManualRetry] = useState(0);
  /** dinaikkan untuk memaksa channel presence dibuat ulang setelah mati sendiri */
  const [channelEpoch, setChannelEpoch] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  /** channel yang sedang hidup, supaya tidak dibuat dua kali */
  const activeRef = useRef<{ user: UserId; channel: RealtimeChannel } | null>(null);
  const signalRef = useRef<(s: Signal) => void>(() => undefined);
  const mineRef = useRef<PresencePayload | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const negotiating = useRef(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Jeda singkat sebelum sambung ulang, supaya kegagalan beruntun tidak jadi loop rapat. */
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) return;
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      setChannelEpoch((n) => n + 1);
    }, 1500);
  }, []);

  /**
   * Perubahan digabung dulu sebelum dikirim. Memanggil track() dua kali
   * beruntun membuat Supabase Presence mengirim join/leave yang saling
   * menyusul dan urutannya kacau, sehingga entri lama justru yang bertahan.
   */
  const push = useCallback((patch: Partial<PresencePayload>) => {
    if (!mineRef.current || !channelRef.current) return;
    mineRef.current = { ...mineRef.current, ...patch, ts: Date.now() };
    setMine(mineRef.current);

    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      if (mineRef.current && channelRef.current) {
        void channelRef.current.track(mineRef.current);
      }
    }, TRACK_DEBOUNCE);
  }, []);

  const send = useCallback((signal: Signal) => {
    void channelRef.current?.send({
      type: "broadcast",
      event: "signal",
      payload: signal,
    });
  }, []);

  const closePeer = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    pendingIce.current = [];
    negotiating.current = false;
    setRemoteStream(null);
    setCallStatus("idle");
  }, []);

  const ensurePeer = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    localRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localRef.current!);
    });

    pc.ontrack = (event) => setRemoteStream(event.streams[0]);
    pc.onicecandidate = (event) => {
      if (event.candidate) send({ type: "ice", candidate: event.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setCallStatus("connected");
      else if (s === "failed" || s === "disconnected") setCallStatus("failed");
      else if (s === "connecting" || s === "new") setCallStatus("connecting");
    };

    pcRef.current = pc;
    return pc;
  }, [send]);

  const drainIce = useCallback(async (pc: RTCPeerConnection) => {
    for (const candidate of pendingIce.current) {
      await pc.addIceCandidate(candidate).catch(() => undefined);
    }
    pendingIce.current = [];
  }, []);

  const handleSignal = useCallback(
    async (signal: Signal) => {
      // Participant meminta koneksi diulang — hanya controller (OFFERER)
      // yang boleh menanggapi, supaya offer baru tetap datang dari satu arah.
      if (signal.type === "restart") {
        if (user === OFFERER) {
          closePeer();
          setOfferAttempt(0);
          setManualRetry((n) => n + 1);
        }
        return;
      }

      // Offer ulang berarti pihak sana memulai dari nol; peer lama harus
      // dibuang, kalau tidak setRemoteDescription akan ditolak.
      if (signal.type === "offer" && pcRef.current?.currentRemoteDescription) {
        closePeer();
      }
      const pc = ensurePeer();
      try {
        if (signal.type === "offer") {
          await pc.setRemoteDescription(signal.sdp);
          await drainIce(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({ type: "answer", sdp: answer });
          setCallStatus("connecting");
        } else if (signal.type === "answer") {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(signal.sdp);
            await drainIce(pc);
          }
        } else if (pc.remoteDescription) {
          await pc.addIceCandidate(signal.candidate).catch(() => undefined);
        } else {
          pendingIce.current.push(signal.candidate);
        }
      } catch {
        setCallStatus("failed");
      }
    },
    [closePeer, drainIce, ensurePeer, send, user],
  );

  useEffect(() => {
    signalRef.current = (sig) => void handleSignal(sig);
  }, [handleSignal]);

  /* ── Channel ────────────────────────────────────────────────────── */
  // Sengaja tanpa cleanup: React StrictMode menjalankan efek dua kali di dev,
  // dan dua channel dengan topik sama pada satu client saling menelan
  // presence-nya. Jadi channel dibuat sekali dan hanya dibongkar saat user
  // berganti, logout, atau saat channelEpoch dinaikkan untuk memaksa
  // sambung ulang (lihat di bawah).
  useEffect(() => {
    if (!user) {
      if (activeRef.current) {
        void supabase.removeChannel(activeRef.current.channel);
        activeRef.current = null;
        channelRef.current = null;
        mineRef.current = null;
        setMine(null);
        setPartner(null);
      }
      return;
    }

    if (activeRef.current?.user === user) return;
    if (activeRef.current) {
      void supabase.removeChannel(activeRef.current.channel);
      activeRef.current = null;
    }

    // Kalau tetap dari sesi sebelumnya (bukan login baru), pertahankan
    // payload lama alih-alih menimpanya ke BLANK — supaya sambung ulang
    // setelah channel mati tidak membuang stage/template/inCall yang sedang
    // berjalan.
    const initial: PresencePayload = mineRef.current ?? {
      user,
      ...BLANK,
      ts: Date.now(),
    };
    mineRef.current = initial;
    setMine(initial);

    const channel = supabase.channel(ROOM, {
      config: { presence: { key: user }, broadcast: { self: false } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresencePayload>();
      const entries = Object.entries(state)
        .filter(([key]) => key !== user)
        .flatMap(([, list]) => list);
      // Pasangan bisa punya beberapa entri sekaligus (dua tab, atau entri lama
      // yang belum kedaluwarsa). Ambil yang stempel waktunya paling baru —
      // urutan join/leave dari server tidak bisa dijadikan patokan.
      const other = entries.reduce<PresencePayload | null>(
        (best, e) => (!best || (e.ts ?? 0) > (best.ts ?? 0) ? e : best),
        null,
      );
      setPartner(other);
    });

    channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      signalRef.current(payload as Signal);
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" && mineRef.current) {
        void channel.track(mineRef.current);
        return;
      }
      // Channel bisa mati sendiri — socket putus (HP dikunci/aplikasi
      // dilatarbelakangi), jaringan sempat hilang, dsb. Tanpa penanganan ini,
      // activeRef tetap menunjuk channel yang sudah mati selamanya dan
      // presence pasangan tidak akan pernah tersambung lagi walau komponennya
      // masih hidup. Bersihkan referensinya dan minta sambung ulang.
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        if (activeRef.current?.channel === channel) {
          activeRef.current = null;
          channelRef.current = null;
          scheduleReconnect();
        }
      }
    });

    channelRef.current = channel;
    activeRef.current = { user, channel };
  }, [user, channelEpoch, scheduleReconnect]);

  // Kalau tab sempat dilatarbelakangi (layar HP terkunci, pindah aplikasi)
  // dan socket-nya diputus paksa oleh sistem, browser tidak selalu memberi
  // tahu channel-nya lewat callback subscribe di atas. Saat tab terlihat
  // lagi, periksa langsung: kalau channel tidak lagi "joined", paksa sambung
  // ulang alih-alih menunggu pasif.
  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const channel = channelRef.current;
      if (channel && channel.state !== "joined") {
        activeRef.current = null;
        channelRef.current = null;
        setChannelEpoch((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user]);

  // Denyut presence: kirim ulang berkala. Kalau salah satu pihak melewatkan
  // satu update, keadaannya kembali sinkron dalam hitungan detik.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      if (mineRef.current && channelRef.current) {
        void channelRef.current.track(mineRef.current);
      }
    }, PRESENCE_HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [user]);

  /* ── Peran ──────────────────────────────────────────────────────── */
  const bothClaimed = Boolean(mine?.isController && partner?.isController);
  const isController = Boolean(
    mine?.isController && (!bothClaimed || user === CONTROL_TIEBREAK),
  );

  // Kalau keduanya sempat mengklaim, yang kalah undur diri diam-diam.
  useEffect(() => {
    if (bothClaimed && user !== CONTROL_TIEBREAK) push({ isController: false });
  }, [bothClaimed, user, push]);

  /** Presence yang jadi acuan: milik controller. */
  const source = isController ? mine : partner?.isController ? partner : mine;

  /* ── Negosiasi WebRTC saat kedua kamera siap ─────────────────────── */
  useEffect(() => {
    if (user !== OFFERER) return;
    if (!partner?.inCall || !localReady || negotiating.current) return;

    negotiating.current = true;
    setCallStatus("connecting");
    const pc = ensurePeer();
    void (async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ type: "offer", sdp: offer });
      } catch {
        setCallStatus("failed");
        negotiating.current = false;
      }
    })();
  }, [user, partner?.inCall, localReady, offerAttempt, manualRetry, ensurePeer, send]);

  // Offer dikirim lewat broadcast yang tidak dijamin sampai. Kalau dalam
  // beberapa detik belum tersambung, bongkar dan tawarkan ulang.
  useEffect(() => {
    if (user !== OFFERER) return;
    if (!partner?.inCall || !localReady) return;
    if (callStatus === "connected") return;
    if (offerAttempt >= MAX_OFFER_ATTEMPTS) return;

    const t = setTimeout(() => {
      closePeer();
      setOfferAttempt((n) => n + 1);
    }, OFFER_RETRY_MS);
    return () => clearTimeout(t);
  }, [user, partner?.inCall, localReady, callStatus, offerAttempt, closePeer]);

  /* ── Aksi ───────────────────────────────────────────────────────── */
  const claimControl = useCallback(() => push({ isController: true }), [push]);

  const resetSession = useCallback(
    () => push({ isController: false, captureId: null, stage: "waiting" }),
    [push],
  );

  const setStage = useCallback((stage: Stage) => push({ stage }), [push]);

  const publishSetup = useCallback(
    (template: TemplateId, count: PhotoCount) => push({ template, count }),
    [push],
  );

  const startCapture = useCallback(() => {
    const id = crypto.randomUUID();
    // Tanggalnya ditentukan sekali oleh controller lalu disiarkan, supaya kedua
    // frame bertuliskan tanggal yang sama walau zona waktunya berbeda.
    push({
      captureId: id,
      captureDate: formatDate(new Date().toISOString()),
      stage: "countdown",
    });
    return id;
  }, [push]);

  const startCall = useCallback(
    (local: MediaStream) => {
      if (localRef.current === local) return;
      localRef.current = local;
      ensurePeer();
      setLocalReady(true);
      push({ inCall: true });
    },
    [ensurePeer, push],
  );

  const endCall = useCallback(() => {
    localRef.current = null;
    setLocalReady(false);
    setOfferAttempt(0);
    closePeer();
    push({ inCall: false });
  }, [closePeer, push]);

  /**
   * Retry manual, bisa dipicu dari kedua sisi. Controller langsung membuat
   * offer baru; participant mengirim sinyal "restart" supaya controller yang
   * membuatnya (arah offer tetap satu jalur, tidak berebut).
   */
  const retryCall = useCallback(() => {
    if (user === OFFERER) {
      closePeer();
      setOfferAttempt(0);
      setManualRetry((n) => n + 1);
    } else {
      closePeer();
      send({ type: "restart" });
    }
  }, [user, closePeer, send]);

  const value = useMemo<RoomValue>(
    () => ({
      partnerOnline: Boolean(partner),
      partnerInCall: Boolean(partner?.inCall),
      isController,
      sessionStage: source?.stage ?? "waiting",
      sharedTemplate: source?.template ?? "polaroid",
      sharedCount: source?.count ?? 4,
      captureId: source?.captureId ?? null,
      captureDate: source?.captureDate ?? null,
      remoteStream,
      callStatus,
      claimControl,
      resetSession,
      setStage,
      publishSetup,
      startCapture,
      startCall,
      endCall,
      retryCall,
    }),
    [
      partner,
      isController,
      source,
      remoteStream,
      callStatus,
      claimControl,
      resetSession,
      setStage,
      publishSetup,
      startCapture,
      startCall,
      endCall,
      retryCall,
    ],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used inside RoomProvider");
  return ctx;
}
