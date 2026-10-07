"use client";

import { App, ConfigProvider } from "antd";
import { useEffect, type ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // iOS Safari ignores user-scalable=no, so pinch zoom has to be blocked here.
    const preventGesture = (event: Event) => event.preventDefault();
    const preventPinch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };
    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("touchmove", preventPinch, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("touchmove", preventPinch);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
    } else {
      // A worker left over from a production run would serve stale assets and break hot reload.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) registration.unregister();
      });
    }
  }, []);

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#6366f1", borderRadius: 10 } }}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
