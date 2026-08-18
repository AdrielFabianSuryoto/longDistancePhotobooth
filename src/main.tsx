import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { CameraProvider } from "@/context/CameraContext";
import { RoomProvider } from "@/context/RoomContext";
import { SessionProvider } from "@/context/SessionContext";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <RoomProvider>
          <CameraProvider>
            <App />
          </CameraProvider>
        </RoomProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
