"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getOrCreateVisitorId() {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("mm_visitor_id");
    if (!id) {
      id = "v_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem("mm_visitor_id", id);
    }
    return id;
  } catch {
    return "v_" + Math.random().toString(36).substring(2, 10);
  }
}

export default function TrackVisit({ slug = "" }) {
  const pathname = usePathname();
  const lastTrackedRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Avoid tracking in admin pages
    if (pathname && pathname.startsWith("/admin")) return;

    const currentUrl = window.location.href;
    const resolvedSlug =
      slug ||
      (pathname && pathname !== "/" && !pathname.startsWith("/api") && !pathname.startsWith("/create")
        ? pathname.replace(/^\//, "")
        : "");

    // Simple deduplication per navigation / URL within 20 seconds
    const key = `${resolvedSlug || pathname}_${Math.floor(Date.now() / 20000)}`;
    if (lastTrackedRef.current === key) return;
    lastTrackedRef.current = key;

    const sendBeacon = (extra = {}) => {
      const payload = {
        slug: resolvedSlug,
        pageTitle: document.title || "",
        url: currentUrl,
        referrer: document.referrer || "Direct / Bookmark",
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language || navigator.userLanguage || "",
        visitorId: getOrCreateVisitorId(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        latitude: null,
        longitude: null,
        ...extra,
      };

      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch((err) => {
        console.warn("Analytics ping skipped:", err.message);
      });
    };

    if (typeof navigator !== "undefined" && navigator.geolocation && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((permission) => {
          if (permission.state === "granted") {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                sendBeacon({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                });
              },
              () => sendBeacon({ latitude: null, longitude: null }),
              { timeout: 3500, maximumAge: 60000 }
            );
            return;
          }
          sendBeacon({ latitude: null, longitude: null });
        })
        .catch(() => sendBeacon({ latitude: null, longitude: null }));
    } else {
      sendBeacon({ latitude: null, longitude: null });
    }
  }, [pathname, slug]);

  return null;
}
