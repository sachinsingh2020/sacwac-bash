"use client";

import { useEffect, useState, useMemo } from "react";
import { getBirthdayTargetInfo } from "../lib/birthdayCountdown";
import "./BirthdayCountdown.css";

export default function BirthdayCountdown({
  person,
  onUnlock,
  isPreview = false,
  onPreviewCelebration,
  sound = false,
  onToggleSound,
}) {
  const [countdown, setCountdown] = useState(() => getBirthdayTargetInfo(person));
  const [copied, setCopied] = useState(false);

  // Background sparkles and decorative balloons
  const decor = useMemo(() => {
    const stars = [];
    for (let i = 0; i < 20; i++) {
      stars.push({
        id: i,
        top: `${(i * 19) % 90 + 5}%`,
        left: `${(i * 23) % 92 + 4}%`,
        delay: `${(i * 0.2).toFixed(2)}s`,
        size: `${(i % 3) * 6 + 10}px`,
      });
    }
    const balloons = [
      { emoji: "🎈", top: "14%", left: "8%", delay: "0s" },
      { emoji: "✨", top: "20%", right: "10%", delay: "1.2s" },
      { emoji: "🎈", bottom: "16%", left: "11%", delay: "2.4s" },
      { emoji: "🌸", bottom: "22%", right: "8%", delay: "0.8s" },
    ];
    return { stars, balloons };
  }, []);

  // Live countdown timer ticking every second
  useEffect(() => {
    const tick = () => {
      const info = getBirthdayTargetInfo(person);
      setCountdown(info);

      if (!info.isLocked && onUnlock) {
        onUnlock();
      }
    };

    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [person, onUnlock]);

  const recipientName = person?.name?.trim() || "Someone Special";
  const firstName = recipientName.split(" ")[0];
  const monogram = firstName ? firstName[0].toUpperCase() : "🎂";

  // Google Calendar Reminder Link
  const calendarUrl = useMemo(() => {
    if (!countdown.targetDate) return "";
    const start = new Date(countdown.targetDate);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const pad = (n) => String(n).padStart(2, "0");
    const formatCalDate = (d) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T000000`;

    const title = encodeURIComponent(`🎂 ${recipientName}'s Birthday Surprise Celebration!`);
    const details = encodeURIComponent(
      `Open this magical link to experience ${recipientName}'s personalized birthday surprise: ${
        typeof window !== "undefined" ? window.location.href : ""
      }`
    );

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatCalDate(
      start
    )}/${formatCalDate(end)}&details=${details}`;
  }, [countdown.targetDate, recipientName]);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      });
    }
  };

  return (
    <section className="bday-countdown-screen" aria-label="Birthday Countdown">
      {/* Aurora Ambient Glow */}
      <div className="bday-countdown-aurora" aria-hidden="true" />

      {/* Decorative Sparkles and Balloons */}
      <div className="bday-countdown-sparkles" aria-hidden="true">
        {decor.stars.map((s) => (
          <span
            key={s.id}
            className="bday-countdown-star"
            style={{
              top: s.top,
              left: s.left,
              fontSize: s.size,
              animationDelay: s.delay,
            }}
          >
            ✦
          </span>
        ))}
        {decor.balloons.map((b, i) => (
          <span
            key={i}
            className="bday-floating-balloon"
            style={{
              top: b.top,
              bottom: b.bottom,
              left: b.left,
              right: b.right,
              animationDelay: b.delay,
            }}
          >
            {b.emoji}
          </span>
        ))}
      </div>

      {/* Preview Bar Switcher (When viewed inside creator wizard preview) */}
      {isPreview && (
        <aside className="bday-countdown-preview-banner" role="status">
          <span>👀 <strong>Countdown Preview:</strong> Visitors see this until birthday</span>
          {onPreviewCelebration && (
            <button
              type="button"
              className="bday-preview-btn-switch"
              onClick={onPreviewCelebration}
            >
              Preview Celebration →
            </button>
          )}
        </aside>
      )}

      {/* Countdown Card */}
      <main className="bday-countdown-card">
        {/* Recipient Photo / Monogram */}
        <div className="bday-countdown-avatar-wrapper">
          {person?.photo ? (
            <img
              src={person.photo}
              alt={recipientName}
              className="bday-countdown-avatar"
            />
          ) : (
            <div className="bday-countdown-monogram">{monogram}</div>
          )}
          <span className="bday-countdown-avatar-badge" aria-hidden="true">
            🎂
          </span>
        </div>

        {/* Status Pill */}
        <div className="bday-countdown-pill">
          <span className="bday-countdown-pill-dot" />
          <span>
            {countdown.isCountdownActive
              ? "⏳ 1-Hour Final Countdown Active"
              : "🔒 Secret Surprise Locked"}
          </span>
        </div>

        {/* Title & Subtitle */}
        {countdown.isCountdownActive ? (
          <>
            <h1 className="bday-countdown-title">
              The final countdown is on for <span>{recipientName}</span>!
            </h1>
            <p className="bday-countdown-subtitle">
              Only minutes remain until midnight! Get ready for something truly magical to unfold.
            </p>

            {/* Real-time Countdown Digits (Minutes, Seconds) */}
            <div
              className="bday-timer-grid"
              style={{
                gridTemplateColumns: countdown.hours > 0 ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
                maxWidth: countdown.hours > 0 ? "400px" : "320px",
              }}
              role="timer"
              aria-live="polite"
            >
              {countdown.hours > 0 && (
                <div className="bday-timer-box">
                  <span className="bday-timer-num">
                    {String(countdown.hours).padStart(2, "0")}
                  </span>
                  <span className="bday-timer-lbl">Hours</span>
                </div>
              )}

              <div className="bday-timer-box">
                <span className="bday-timer-num">
                  {String(countdown.minutes).padStart(2, "0")}
                </span>
                <span className="bday-timer-lbl">Minutes</span>
              </div>

              <div className="bday-timer-box">
                <span className="bday-timer-num seconds-pulse">
                  {String(countdown.seconds).padStart(2, "0")}
                </span>
                <span className="bday-timer-lbl">Seconds</span>
              </div>
            </div>

            {/* Date Highlight */}
            <div className="bday-target-date-box">
              <span>
                📅 Unlocks: <strong>{countdown.formattedDate || "Tonight"}</strong> at 12:00 AM Midnight
              </span>
            </div>
          </>
        ) : (
          <>
            <h1 className="bday-countdown-title">
              A special surprise awaits <span>{recipientName}</span>
            </h1>
            <p className="bday-countdown-subtitle">
              It’s still too early to open the surprise! The live final countdown will officially begin <strong>1 hour before</strong> their birthday at <strong>11:00 PM</strong> on{" "}
              <strong>{countdown.countdownStartsDate || "the day before"}</strong>.
            </p>

            {/* Date Highlight */}
            <div className="bday-target-date-box" style={{ flexDirection: "column", gap: "6px" }}>
              <span>
                ⏳ Live 1-Hour Countdown Begins: <strong>11:00 PM on {countdown.countdownStartsDate || "the day before"}</strong>
              </span>
              <span>
                🎂 Celebration Unlocks: <strong>{countdown.formattedDate}</strong> at 12:00 AM Midnight
              </span>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="bday-countdown-actions">
          {calendarUrl && (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bday-btn-cal"
            >
              <span>🔔</span> Remind Me
            </a>
          )}

          <button
            type="button"
            className={`bday-btn-copy ${copied ? "copied" : ""}`}
            onClick={handleCopyLink}
          >
            <span>{copied ? "✓ Copied!" : "🔗 Bookmark Link"}</span>
          </button>

          {onToggleSound && (
            <button
              type="button"
              className="bday-btn-music"
              onClick={onToggleSound}
              aria-label={sound ? "Mute music" : "Play music"}
            >
              <span>{sound ? "🎵 Music On" : "🔇 Music Off"}</span>
            </button>
          )}

          {!countdown.isCountdownActive && (
            <button
              type="button"
              className="bday-btn-preview"
              onClick={onPreviewCelebration || onUnlock}
              title="Preview the celebration surprise"
              aria-label="Preview celebration surprise"
            >
              <span>👀</span> Preview
            </button>
          )}
        </div>

        <div className="bday-countdown-footer-note">
          <span>✨</span>
          <span>Come back when the countdown hits zero to open your gift!</span>
        </div>
      </main>
    </section>
  );
}
