import { useEffect } from "react";
import { Heart } from "lucide-react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Nav } from "@/components/Nav";
import { useSession } from "@/context/SessionContext";
import { CameraRoomPage } from "@/pages/CameraRoomPage";
import { CountdownPage } from "@/pages/CountdownPage";
import { EmailPreviewPage } from "@/pages/EmailPreviewPage";
import { GalleryPage } from "@/pages/GalleryPage";
import { LandingPage } from "@/pages/LandingPage";
import { MemoryDetailPage } from "@/pages/MemoryDetailPage";
import { PhotoPreviewPage } from "@/pages/PhotoPreviewPage";
import { TemplateSelectionPage } from "@/pages/TemplateSelectionPage";
import { VerificationPage } from "@/pages/VerificationPage";
import { WaitingRoomPage } from "@/pages/WaitingRoomPage";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

/** Ditampilkan sebentar saat sesi Supabase dipulihkan setelah refresh. */
function Splash() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="bg-primary flex h-12 w-12 animate-pulse items-center justify-center rounded-full shadow-lg">
        <Heart className="h-6 w-6 fill-white text-white" />
      </div>
    </div>
  );
}

function RequireVerified() {
  const { verified, loading } = useSession();
  if (loading) return <Splash />;
  return verified ? <Outlet /> : <Navigate to="/" replace />;
}

function WithNav() {
  return (
    <>
      <Nav />
      <Outlet />
    </>
  );
}

export default function App() {
  const { loading } = useSession();
  if (loading) return <Splash />;

  return (
    <div className="bg-background min-h-screen">
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/verify/:who" element={<VerificationPage />} />

        <Route element={<RequireVerified />}>
          <Route path="/countdown" element={<CountdownPage />} />
          <Route element={<WithNav />}>
            <Route path="/connect" element={<WaitingRoomPage />} />
            <Route path="/templates" element={<TemplateSelectionPage />} />
            <Route path="/camera" element={<CameraRoomPage />} />
            <Route path="/preview" element={<PhotoPreviewPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/memory/:id" element={<MemoryDetailPage />} />
            <Route path="/share" element={<EmailPreviewPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
