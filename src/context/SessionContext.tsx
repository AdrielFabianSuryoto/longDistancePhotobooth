import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PEOPLE, getPartner, getPerson, type Person, type UserId } from "@/config/couple";
import { supabase } from "@/lib/supabase";
import type { PhotoCount, TemplateId } from "@/lib/types";

type SessionValue = {
  /** siapa yang login, ditentukan dari email akun Supabase */
  user: UserId | null;
  me: Person | null;
  partner: Person | null;
  authUserId: string | null;
  /** true kalau ada sesi Supabase yang aktif */
  verified: boolean;
  /** masih memulihkan sesi dari penyimpanan browser */
  loading: boolean;

  template: TemplateId;
  count: PhotoCount;
  photos: string[];
  lastMemoryId: string | null;

  signIn: (userId: UserId, birthday: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  setSetup: (template: TemplateId, count: PhotoCount) => void;
  setPhotos: (photos: string[]) => void;
  setLastMemoryId: (id: string | null) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

function userIdFromEmail(email: string | undefined): UserId | null {
  if (!email) return null;
  const lower = email.toLowerCase();
  const match = Object.values(PEOPLE).find((p) => p.email.toLowerCase() === lower);
  return match?.id ?? null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserId | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [template, setTemplate] = useState<TemplateId>("polaroid");
  const [count, setCount] = useState<PhotoCount>(4);
  const [photos, setPhotos] = useState<string[]>([]);
  const [lastMemoryId, setLastMemoryId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(userIdFromEmail(data.session?.user.email));
      setAuthUserId(data.session?.user.id ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(userIdFromEmail(session?.user.email));
      setAuthUserId(session?.user.id ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (userId: UserId, birthday: string, code: string) => {
      const person = getPerson(userId);

      // Cek tanggal lahir di sisi browser — lapisan personal, bukan pengaman.
      // Yang benar-benar mengamankan adalah password (secret code) di Supabase.
      if (birthday !== person.birthday) {
        throw new Error("Tanggal lahirnya belum cocok. Coba cek lagi ya 🌸");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: person.email,
        password: code.trim(),
      });

      if (!error) return;
      if (error.message.toLowerCase().includes("email not confirmed")) {
        throw new Error(
          `Akun ${person.name} belum dikonfirmasi. Buka Supabase → Authentication → Users, lalu konfirmasi emailnya.`,
        );
      }
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        throw new Error(
          `Secret code belum tepat, atau akun ${person.name} (${person.email}) belum dibuat di Supabase.`,
        );
      }
      throw new Error(error.message);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setPhotos([]);
    setLastMemoryId(null);
  }, []);

  const setSetup = useCallback((t: TemplateId, c: PhotoCount) => {
    setTemplate(t);
    setCount(c);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      me: user ? getPerson(user) : null,
      partner: user ? getPartner(user) : null,
      authUserId,
      verified: Boolean(user),
      loading,
      template,
      count,
      photos,
      lastMemoryId,
      signIn,
      signOut,
      setSetup,
      setPhotos,
      setLastMemoryId,
    }),
    [
      user,
      authUserId,
      loading,
      template,
      count,
      photos,
      lastMemoryId,
      signIn,
      signOut,
      setSetup,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession harus dipakai di dalam SessionProvider");
  return ctx;
}
