"use client";

import { useEffect } from "react";

function isStandalonePwa() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    }

    const applyStandaloneMode = () => {
      document.documentElement.classList.toggle("pwa-standalone", isStandalonePwa());
    };

    applyStandaloneMode();

    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => applyStandaloneMode();
    displayModeQuery.addEventListener("change", onDisplayModeChange);

    const blockGestureZoom = (event: Event) => {
      if (!document.documentElement.classList.contains("pwa-standalone")) return;
      event.preventDefault();
    };

    const blockPinchZoom = (event: TouchEvent) => {
      if (!document.documentElement.classList.contains("pwa-standalone")) return;
      if (event.touches.length > 1) event.preventDefault();
    };

    document.addEventListener("gesturestart", blockGestureZoom, { passive: false });
    document.addEventListener("gesturechange", blockGestureZoom, { passive: false });
    document.addEventListener("gestureend", blockGestureZoom, { passive: false });
    document.addEventListener("touchmove", blockPinchZoom, { passive: false });

    return () => {
      displayModeQuery.removeEventListener("change", onDisplayModeChange);
      document.documentElement.classList.remove("pwa-standalone");
      document.removeEventListener("gesturestart", blockGestureZoom);
      document.removeEventListener("gesturechange", blockGestureZoom);
      document.removeEventListener("gestureend", blockGestureZoom);
      document.removeEventListener("touchmove", blockPinchZoom);
    };
  }, []);

  return null;
}
