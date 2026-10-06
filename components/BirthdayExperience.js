"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QuestionTeaserPhase from "./phases/QuestionTeaserPhase";
import ArrowHeartPhase from "./phases/ArrowHeartPhase";
import BalloonPhase from "./phases/BalloonPhase";
import StarRevealPhase from "./phases/StarRevealPhase";
import CakePhase from "./phases/CakePhase";
import GalleryPhase from "./phases/GalleryPhase";
import HeartTreePhase from "./phases/HeartTreePhase";
import WishPhase from "./phases/WishPhase";
import CelebrationEndPhase from "./phases/CelebrationEndPhase";
import BirthdayCountdown from "./BirthdayCountdown";
import { getBirthdayTargetInfo } from "../lib/birthdayCountdown";

const fallback = {
  name: "Sunena",
  nickname: "Sunny",
  age: "26",
  message:
    "You make ordinary days feel like tiny celebrations. Today, the whole world gets to celebrate you.",
  photo:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85",
  gallery: [
    "photo-1516589178581-6cd7833ae3b2",
    "photo-1529156069898-49953e39b3ac",
    "photo-1506869640319-fe1a24fd76dc",
    "photo-1491438590914-bc09fcaaf77a",
    "photo-1530103862676-de8c9debad1d",
  ],
  reasons: [
    "Your laugh is my favourite sound",
    "The world is kinder with you in it",
    "You remember the little things I forget",
    "You believed in me when I didn't",
    "You make ordinary days magic",
  ],
};

export default function BirthdayExperience({
  slug,
  previewData = null,
  isPreview = false,
  onExitPreview,
  onPublish,
  isPublishing = false,
  publishError = "",
  onClearPublishError,
}) {
  const [person, setPerson] = useState(previewData ? { ...fallback, ...previewData } : fallback);
  const [phase, setPhase] = useState(0);
  const [sound, setSound] = useState(true);
  const [popped, setPopped] = useState([]);
  const [introPopped, setIntroPopped] = useState(false);
  const [uploadedGallery, setUploadedGallery] = useState(
    previewData && Array.isArray(previewData.gallery)
      ? previewData.gallery.slice(0, 2)
      : []
  );
  const [loading, setLoading] = useState(!previewData);
  const [arrowReleased, setArrowReleased] = useState(false);
  const [nextBalloonPopped, setNextBalloonPopped] = useState(false);
  const [treeComplete, setTreeComplete] = useState(false);
  const [cakeComplete, setCakeComplete] = useState(false);
  const [letterComplete, setLetterComplete] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unlockedManually, setUnlockedManually] = useState(false);
  const [previewShowCelebration, setPreviewShowCelebration] = useState(false);
  const audio = useRef(null);

  const countdownInfo = useMemo(() => getBirthdayTargetInfo(person), [person]);
  const isLocked = countdownInfo.isLocked && !unlockedManually;

  useEffect(() => {
    if (previewData) {
      setPerson({ ...fallback, ...previewData });
      setUploadedGallery(
        Array.isArray(previewData.gallery) ? previewData.gallery.slice(0, 2) : [],
      );
      setLoading(false);
      return;
    }

    if (!slug) {
      setLoading(false);
      return;
    }

    fetch(`/api/pages/${slug}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((found) => {
        if (found) {
          setPerson({ ...fallback, ...found });
          setUploadedGallery(
            Array.isArray(found.gallery) ? found.gallery.slice(0, 2) : [],
          );
        }
      })
      .catch((error) => console.error("Unable to load birthday page:", error))
      .finally(() => setLoading(false));
  }, [slug, previewData]);

  useEffect(() => {
    if (loading || !audio.current) return;

    const startAudio = () => {
      if (!audio.current || !sound) return;

      audio.current.play().catch((error) => {
        if (error.name !== "NotAllowedError") {
          console.error("Unable to start background music:", error);
        }
      });
    };

    if (sound) {
      startAudio();
      window.addEventListener("pointerdown", startAudio, { once: true });
      window.addEventListener("keydown", startAudio, { once: true });
    } else {
      audio.current.pause();
    }

    return () => {
      window.removeEventListener("pointerdown", startAudio);
      window.removeEventListener("keydown", startAudio);
    };
  }, [loading, sound]);

  const gallery = useMemo(
    () =>
      person.gallery?.map((item) =>
        item.startsWith("http")
          ? item
          : `https://images.unsplash.com/${item}?auto=format&fit=crop&w=800&q=80`,
      ) || [],
    [person.gallery],
  );
  const introGallery = useMemo(
    () =>
      uploadedGallery.map((item) =>
        item.startsWith("http")
          ? item
          : `https://images.unsplash.com/${item}?auto=format&fit=crop&w=800&q=80`,
      ),
    [uploadedGallery],
  );
  useEffect(() => {
    // Early mic request as requested so permission prompt appears when opening website
    const askMicEarly = () => {
      if (typeof window !== "undefined") {
        if (!window.__birthdayAudioCtx && (window.AudioContext || window.webkitAudioContext)) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          try {
            window.__birthdayAudioCtx = new AudioContextClass();
          } catch (e) {}
        }
        if (window.__birthdayAudioCtx && window.__birthdayAudioCtx.state === "suspended") {
          window.__birthdayAudioCtx.resume().catch(() => {});
        }
        if (navigator.mediaDevices?.getUserMedia && !window.__birthdayMicStream) {
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
              window.__birthdayMicStream = stream;
            })
            .catch(() => {});
        }
      }
    };
    askMicEarly();
    window.addEventListener("pointerdown", askMicEarly, { once: true });
    return () => {
      window.removeEventListener("pointerdown", askMicEarly);
    };
  }, []);

  const prev = () => setPhase((current) => Math.max(current - 1, 0));
  const next = () => setPhase((current) => Math.min(current + 1, 7));
  const handleLetterComplete = useCallback(() => {
    setLetterComplete(true);
  }, []);
  useEffect(() => {
    setNextBalloonPopped(false);
    setLetterComplete(false);
    setTreeComplete(false);
    setCakeComplete(false);
  }, [phase]);
  const popNextBalloon = () => {
    if (nextBalloonPopped) return;
    setNextBalloonPopped(true);
    setTimeout(next, 520);
  };
  const launchArrow = () => {
    if (arrowReleased) return;
    setArrowReleased(true);
  };
  const popIntroBalloon = () => {
    if (introPopped) return;
    setIntroPopped(true);
    setTimeout(next, 420);
  };
  const pop = (index) => {
    if (!popped.includes(index)) setPopped([...popped, index]);
  };

  if (loading)
    return (
      <main className="experience loading-screen">
        <div className="birthday-loader" role="status" aria-live="polite">
          <span className="loader-ring" />
          <strong>Happy Birthday</strong>
          <small>preparing something lovely...</small>
        </div>
      </main>
    );

  const shareUrl =
    typeof window !== "undefined"
      ? slug
        ? `${window.location.origin}/${slug}`
        : window.location.href
      : "";

  const handleCopyLink = () => {
    if (!shareUrl) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      });
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Hey ${person.name || "there"}! 🎂 I made something special just for you. Open this to see your birthday surprise: ${shareUrl}`,
  )}`;

  if (isLocked && (!isPreview || !previewShowCelebration)) {
    return (
      <>
        <audio
          ref={audio}
          src="/music/birthday.mp3"
          loop
          autoPlay
          preload="auto"
        />
        <BirthdayCountdown
          person={person}
          onUnlock={() => setUnlockedManually(true)}
          isPreview={isPreview}
          onPreviewCelebration={() => {
            if (isPreview) {
              setPreviewShowCelebration(true);
            } else {
              setUnlockedManually(true);
            }
          }}
          sound={sound}
          onToggleSound={() => setSound(!sound)}
        />
      </>
    );
  }

  return (
    <>
      {unlockedManually && countdownInfo.isLocked && !isPreview && (
        <button
          type="button"
          onClick={() => setUnlockedManually(false)}
          style={{
            position: "fixed",
            top: "16px",
            right: "16px",
            zIndex: 999,
            background: "rgba(255, 255, 255, 0.94)",
            backdropFilter: "blur(10px)",
            border: "1px solid #f9cbd5",
            color: "#d95775",
            borderRadius: "999px",
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: 700,
            boxShadow: "0 6px 20px rgba(217, 87, 117, 0.2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          title="Return to the countdown screen"
        >
          <span>⏳</span> Return to Countdown
        </button>
      )}
      <main className={`experience phase-${phase} ${isPreview ? "has-preview-bar is-preview-mode" : ""}`}>
        {isPreview && (
          <aside className="preview-top-bar" role="banner" aria-label="Preview toolbar">
            <div className="preview-bar-left">
              <button
                type="button"
                className="preview-bar-btn-back"
                onClick={onExitPreview}
                title="Return to the wizard editor"
              >
                <span className="preview-btn-text-full">← Back to Edit</span>
                <span className="preview-btn-text-short">← Edit</span>
              </button>
            </div>

            <div className="preview-bar-center">
              <span className="preview-badge-dot" />
              <span className="preview-badge-title">Preview</span>
              <span className="preview-badge-desc">Draft</span>
            </div>

            <div className="preview-bar-actions">
              {countdownInfo.isLocked && (
                <button
                  type="button"
                  className="preview-bar-btn-sound is-on"
                  onClick={() => setPreviewShowCelebration(false)}
                  title="Switch to countdown screen preview"
                  aria-label="View countdown screen preview"
                >
                  <span className="preview-sound-icon">⏳</span>
                  <span className="preview-sound-label">Countdown</span>
                </button>
              )}
              <button
                type="button"
                className={`preview-bar-btn-sound ${sound ? "is-on" : "is-off"}`}
                onClick={() => setSound(!sound)}
                title={sound ? "Mute music" : "Play music"}
                aria-label={sound ? "Mute music" : "Play music"}
              >
                <span className="preview-sound-icon">{sound ? "🎵" : "🔇"}</span>
                <span className="preview-sound-label">{sound ? "Sound on" : "Sound off"}</span>
              </button>

              <button
                type="button"
                className="preview-bar-btn-publish"
                onClick={onPublish}
                disabled={isPublishing}
                title="Unlock celebration and generate official link"
              >
                <span className="preview-publish-text-full">
                  {isPublishing ? "Unlocking... ✨" : "Unlock Link 🚀"}
                </span>
                <span className="preview-publish-text-short">
                  {isPublishing ? "Unlocking..." : "Unlock 🚀"}
                </span>
              </button>
            </div>
          </aside>
        )}
        {isPreview && publishError && (
          <div className="preview-error-toast" role="alert">
            <span>⚠️ {publishError}</span>
            {onClearPublishError && (
              <button
                type="button"
                onClick={onClearPublishError}
                className="preview-error-close"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            )}
          </div>
        )}
        <audio
          ref={audio}
          src="/music/birthday.mp3"
          loop
          autoPlay
          preload="auto"
        />
        {!isPreview && (
          <button
            type="button"
            className={`sound-toggle ${sound ? "is-playing" : "is-muted"}`}
            onClick={() => setSound(!sound)}
            aria-label={sound ? "Mute music" : "Play music"}
          >
            <span className="sound-bars" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="sound-label">{sound ? "Sound on" : "Sound off"}</span>
          </button>
        )}
        {phase === 0 && (
          <QuestionTeaserPhase
            person={person}
            onYes={() => setPhase(1)}
          />
        )}
        {phase === 1 && (
          <ArrowHeartPhase
            person={person}
            arrowReleased={arrowReleased}
            onLaunchArrow={launchArrow}
            onNext={popNextBalloon}
            nextBalloonPopped={nextBalloonPopped}
          />
        )}
        {phase === 2 && (
          <HeartTreePhase
            person={person}
            onComplete={() => setTreeComplete(true)}
          />
        )}
        {phase === 3 && (
          <CakePhase
            person={person}
            onComplete={() => setCakeComplete(true)}
          />
        )}
        {phase === 4 && (
          <StarRevealPhase
            popped={popped}
            onPop={pop}
            reasons={person.reasons || fallback.reasons}
          />
        )}
        {phase === 5 && (
          <WishPhase
            person={person}
            fallbackPhoto={fallback.photo}
            onMessageComplete={handleLetterComplete}
          />
        )}
        {phase === 6 && (
          <GalleryPhase
            person={person}
            gallery={gallery}
          />
        )}
        {phase === 7 && (
          <CelebrationEndPhase
            person={person}
            onReplay={() => {
              setPhase(0);
              setArrowReleased(false);
              setPopped([]);
            }}
            onShare={() => setShowShareModal(true)}
          />
        )}
        {phase > 1 &&
          phase < 7 &&
          (phase !== 2 || treeComplete) &&
          (phase !== 3 || cakeComplete) &&
          (phase !== 4 || popped.length === 5) &&
          (phase !== 5 || letterComplete) && (
            <button
              type="button"
              className={`ah-next-balloon shared-next-balloon ${
                nextBalloonPopped ? "popped" : ""
              }`}
              onClick={popNextBalloon}
              aria-label="Pop the balloon to continue">
              <span>next</span>
              <i />
              <b />
              <em className="balloon-piece piece-one" />
              <em className="balloon-piece piece-two" />
              <em className="balloon-piece piece-three" />
              <em className="balloon-piece piece-four" />
            </button>
          )}
        {phase > 0 && phase < 8 && (
          <div className="progress-dots">
            {[1, 2, 3, 4, 5, 6, 7].map((dot) => (
              <i className={phase >= dot ? "active" : ""} key={dot} />
            ))}
          </div>
        )}
        {phase > 0 && phase <= 7 && (
          <div
            style={{
              position: "fixed",
              left: "50%",
              bottom: "24px",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "12px",
              zIndex: 30,
            }}>
            <button
              type="button"
              onClick={prev}
              disabled={phase === 1}
              style={{
                border: "1px solid rgba(122, 87, 95, 0.35)",
                background:
                  phase === 1
                    ? "rgba(255, 255, 255, 0.5)"
                    : "rgba(255, 255, 255, 0.82)",
                color: "#6e4f59",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "12px 18px",
                cursor: phase === 1 ? "not-allowed" : "pointer",
                opacity: phase === 1 ? 0.5 : 1,
                boxShadow: "0 10px 28px rgba(127, 85, 95, 0.12)",
                backdropFilter: "blur(8px)",
              }}>
              Prev
            </button>
            <button
              type="button"
              onClick={next}
              disabled={phase === 7}
              style={{
                border: "1px solid #d95775",
                background: phase === 7 ? "rgba(217, 87, 117, 0.4)" : "#d95775",
                color: "#fff",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "12px 18px",
                cursor: phase === 7 ? "not-allowed" : "pointer",
                boxShadow: "0 10px 28px rgba(217, 87, 117, 0.22)",
                backdropFilter: "blur(8px)",
              }}>
              {phase === 7 ? "Done" : "Next"}
            </button>
          </div>
        )}
      </main>

      {showShareModal && (
        <div
          className="exp-share-modal-overlay"
          onClick={() => setShowShareModal(false)}>
          <div
            className="exp-share-modal-card"
            onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="exp-share-close-btn"
              onClick={() => setShowShareModal(false)}
              aria-label="Close share modal">
              ✕
            </button>
            <div className="exp-share-icon" aria-hidden="true">💌</div>
            {isPreview ? (
              <>
                <h2>Ready to Share with {person.name}?</h2>
                <p>
                  You are currently in <strong>Preview Mode</strong>. The shareable link has not been generated yet. Click below to publish and unlock your official link!
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "18px" }}>
                  <button
                    type="button"
                    className="exp-share-whatsapp-btn"
                    style={{ justifyContent: "center", cursor: "pointer", border: 0, padding: "14px 20px" }}
                    onClick={() => {
                      setShowShareModal(false);
                      if (onPublish) onPublish();
                    }}
                    disabled={isPublishing}
                  >
                    <span>🚀</span> {isPublishing ? "Unlocking... ✨" : "Unlock Share Link 🚀"}
                  </button>
                  <button
                    type="button"
                    className="exp-share-copy-btn"
                    style={{ background: "#f5e8ea", color: "#6a404c", width: "100%", justifyContent: "center", padding: "12px 18px" }}
                    onClick={() => setShowShareModal(false)}
                  >
                    Keep Exploring Preview
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Send to {person.name}</h2>
                <p>
                  Share this magical celebration link directly with {person.name} so they can experience the surprise!
                </p>
                <div className="exp-share-url-box">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="exp-share-url-input"
                    aria-label="Celebration URL"
                  />
                  <button
                    type="button"
                    className={`exp-share-copy-btn ${copied ? "copied" : ""}`}
                    onClick={handleCopyLink}>
                    {copied ? "Copied! 💖" : "Copy Link"}
                  </button>
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="exp-share-whatsapp-btn">
                  <span>💬</span> Share on WhatsApp
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
