"use client";

import { useEffect, useState } from "react";
import "./BrowserSuggestionBanner.css";

export default function BrowserSuggestionBanner() {
  const [recommendation, setRecommendation] = useState(null); // { targetBrowser: 'Safari' | 'Chrome', os: 'iOS' | 'Android' }
  const [dismissed, setDismissed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const isAlreadyDismissed = sessionStorage.getItem("mm_browser_hint_dismissed");
      if (isAlreadyDismissed) return;
    } catch (e) {}

    const ua = navigator.userAgent || "";

    // 1. Detect OS
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    // Only apply recommendation on mobile/tablet devices
    if (!isIOS && !isAndroid) return;

    // In-app webviews detection (WhatsApp, Instagram, Facebook, Messenger, Twitter/X, Telegram, LinkedIn, Snapchat)
    const isInAppBrowser = /FBAN|FBAV|Instagram|WhatsApp|Line|Twitter|Telegram|Snapchat|LinkedIn|MicroMessenger|musical_ly|BytedanceWebview/i.test(ua);

    // Common non-default browsers (Edge, Opera, Samsung, Firefox, UCBrowser, etc.)
    const isEdge = /EdgA|EdgiOS|Edge/i.test(ua);
    const isOpera = /OPR|Opera|OPT/i.test(ua);
    const isSamsung = /SamsungBrowser/i.test(ua);
    const isFirefox = /FxiOS|Firefox/i.test(ua);
    const isUC = /UCBrowser/i.test(ua);

    if (isIOS) {
      // On iOS:
      // Chrome on iOS contains "CriOS"
      // Safari contains "Safari" and "Mobile" but DOES NOT contain CriOS, FxiOS, Edg, OPR, Samsung, or in-app markers
      const isChromeIOS = /CriOS/i.test(ua);
      const isPureSafari = /Safari/i.test(ua) && !isChromeIOS && !isFirefox && !isEdge && !isOpera && !isInAppBrowser;

      // If open in Chrome or Safari, do NOT show anything!
      if (isChromeIOS || isPureSafari) return;

      // Otherwise, suggest opening in Safari
      setRecommendation({
        targetBrowser: "Safari",
        targetIcon: "🧭",
        os: "iPhone / iPad",
        tip: "Tap the Share or Options icon (⋯ or ↑) and select 'Open in Safari' for smooth music, candle blowing, and 3D animations.",
      });
    } else if (isAndroid) {
      // On Android:
      // Chrome contains "Chrome" and "Mobile", but NOT Samsung, Edg, OPR, UC, Firefox, or in-app webviews
      const isPureChrome = /Chrome/i.test(ua) && !isSamsung && !isEdge && !isOpera && !isUC && !isFirefox && !isInAppBrowser;

      // If open in Chrome, do NOT show anything!
      if (isPureChrome) return;

      // Otherwise, suggest opening in Chrome
      setRecommendation({
        targetBrowser: "Google Chrome",
        targetIcon: "🌐",
        os: "Android",
        tip: "Tap the menu (⋮ or ⋯) and select 'Open in Chrome' for sound effects, microphone candle blowout, and smooth celebration experience.",
      });
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("mm_browser_hint_dismissed", "true");
    } catch (e) {}
  };

  const handleCopyCurrentLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    });
  };

  if (!recommendation || dismissed) return null;

  return (
    <aside className="browser-hint-banner" role="complementary" aria-label="Browser recommendation">
      <div className="browser-hint-glow" aria-hidden="true" />
      <div className="browser-hint-content">
        <div className="browser-hint-icon" aria-hidden="true">
          {recommendation.targetIcon}
        </div>
        <div className="browser-hint-text">
          <div className="browser-hint-title-row">
            <strong>Open in {recommendation.targetBrowser} for the best experience ✨</strong>
          </div>
          <p className="browser-hint-body">
            You are viewing this in an in-app preview or secondary browser. For real background music, interactive candle blowing, and full screen visuals:
          </p>
          <div className="browser-hint-instruction">
            <span>👉 {recommendation.tip}</span>
          </div>
        </div>

        <div className="browser-hint-actions">
          <button
            type="button"
            className="browser-hint-copy-btn"
            onClick={handleCopyCurrentLink}
            title="Copy link to paste into browser"
          >
            {copiedLink ? "✓ Link Copied!" : "📋 Copy Link"}
          </button>
          <button
            type="button"
            className="browser-hint-dismiss-btn"
            onClick={handleDismiss}
            aria-label="Dismiss recommendation"
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
}
