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

    let beaconSent = false;

    const sendBeacon = (extra = {}) => {
      beaconSent = true;
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
        locationPermission: "unknown",
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

    // If geolocation is supported, trigger the browser permission prompt immediately
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      // Safety timeout: if visitor ignores the prompt dialog for > 5 seconds, send initial visit log
      const pendingTimer = setTimeout(() => {
        if (!beaconSent) {
          sendBeacon({ locationPermission: "prompted" });
        }
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          clearTimeout(pendingTimer);
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          // Attempt fast reverse-geocoding of accurate device coordinates
          let geoDetails = {};
          try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 2500);
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
              { signal: controller.signal }
            );
            clearTimeout(tid);
            if (res.ok) {
              const data = await res.json();
              geoDetails = {
                gpsCity: data.city || data.locality || "",
                gpsRegion: data.principalSubdivision || "",
                gpsCountry: data.countryName || "",
                gpsCountryCode: data.countryCode || "",
                gpsPostal: data.postcode || "",
              };
            }
          } catch {
            // Geocode failed or timed out, coordinates are still captured
          }

          sendBeacon({
            latitude: lat,
            longitude: lon,
            isExactGps: true,
            locationPermission: "granted",
            ...geoDetails,
          });
        },
        (err) => {
          clearTimeout(pendingTimer);
          const permissionState = err.code === 1 ? "denied" : "unavailable";
          sendBeacon({
            latitude: null,
            longitude: null,
            isExactGps: false,
            locationPermission: permissionState,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      sendBeacon({
        latitude: null,
        longitude: null,
        isExactGps: false,
        locationPermission: "unsupported",
      });
    }
  }, [pathname, slug]);

  return null;
}
