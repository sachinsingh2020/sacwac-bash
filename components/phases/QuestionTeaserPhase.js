"use client";

import { useState, useMemo, useCallback } from "react";
import "./QuestionTeaserPhase.css";

const NO_LABELS = [
  "No 😜",
  "Wait, really? 🥺",
  "Are you sure? 😂",
  "Nope, can't catch me! 🏃‍♂️",
  "Nice try! 🙈",
  "Still trying? 😜",
  "You have to say Yes! 💕",
  "Yes is the only way! ✨",
  "Give up and say Yes! 🥰",
];

export default function QuestionTeaserPhase({ person, onYes }) {
  const [hasDodged, setHasDodged] = useState(false);
  const [dodgeCount, setDodgeCount] = useState(0);
  const [noPosition, setNoPosition] = useState({ top: "50%", left: "50%" });

  // Floating background sparkles and decorative elements
  const decor = useMemo(() => {
    const stars = [];
    for (let i = 0; i < 18; i++) {
      stars.push({
        id: i,
        top: `${(i * 17) % 88 + 6}%`,
        left: `${(i * 23) % 90 + 5}%`,
        delay: `${(i * 0.22).toFixed(2)}s`,
        size: `${(i % 3) * 6 + 10}px`,
      });
    }
    const icons = [
      { emoji: "💌", top: "12%", left: "9%", delay: "0s" },
      { emoji: "✨", top: "18%", right: "11%", delay: "1.2s" },
      { emoji: "💖", bottom: "16%", left: "10%", delay: "2.4s" },
      { emoji: "🌸", bottom: "20%", right: "9%", delay: "0.8s" },
    ];
    return { stars, icons };
  }, []);

  const recipientName = person?.name?.trim() || "Special One";

  // Teleports the "No" button to a random safe area on the screen
  const handleDodge = useCallback((e) => {
    if (e) {
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }

    // Pick random percentage coordinates well within viewport bounds (12% to 82% width, 16% to 84% height)
    const randomX = Math.floor(Math.random() * 70) + 12;
    const randomY = Math.floor(Math.random() * 66) + 16;

    setNoPosition({
      top: `${randomY}vh`,
      left: `${randomX}vw`,
    });
    setHasDodged(true);
    setDodgeCount((prev) => prev + 1);
  }, []);

  // Text on the "No" button updates as they keep trying to click it
  const currentNoLabel = NO_LABELS[dodgeCount % NO_LABELS.length];

  // Scale the "Yes" button slightly on each failed "No" attempt
  const yesScale = Math.min(1 + dodgeCount * 0.05, 1.35);

  return (
    <section className="qt-scene" aria-label="Special Question">
      {/* Background Aurora */}
      <div className="qt-aurora" aria-hidden="true" />

      {/* Decorative Sparkles & Floating Icons */}
      <div className="qt-sparkles" aria-hidden="true">
        {decor.stars.map((s) => (
          <span
            key={s.id}
            className="qt-star"
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
        {decor.icons.map((item, i) => (
          <span
            key={i}
            className="qt-floating-icon"
            style={{
              top: item.top,
              bottom: item.bottom,
              left: item.left,
              right: item.right,
              animationDelay: item.delay,
            }}
          >
            {item.emoji}
          </span>
        ))}
      </div>

      {/* Main Question Card */}
      <main className="qt-card">
        {/* Recipient Photo / Heart */}
        <div className="qt-avatar-wrapper">
          {person?.photo ? (
            <img
              src={person.photo}
              alt={recipientName}
              className="qt-avatar"
            />
          ) : (
            <div className="qt-avatar-fallback">💖</div>
          )}
          <span className="qt-avatar-badge" aria-hidden="true">
            💌
          </span>
        </div>

        {/* Top Pill Badge */}
        <div className="qt-pill">
          <span className="qt-pill-dot" />
          <span>A Secret Message</span>
        </div>

        {/* First Line */}
        <h1 className="qt-first-line">
          There is something special I want to tell you...
        </h1>

        {/* Second Line */}
        <p className="qt-second-line">
          Do you want to see what I have to tell you?
        </p>

        {/* Action Buttons: Yes & Runaway No */}
        <div className="qt-actions-row">
          {/* YES Button */}
          <button
            type="button"
            className="qt-btn-yes"
            onClick={onYes}
            style={{
              transform: `scale(${yesScale})`,
            }}
          >
            <span>Yes! 💖</span>
          </button>

          {/* NO Button (Runs away on hover/touch/click!) */}
          <button
            type="button"
            className={`qt-btn-no ${hasDodged ? "is-dodging" : ""}`}
            style={
              hasDodged
                ? {
                    top: noPosition.top,
                    left: noPosition.left,
                    position: "fixed",
                  }
                : undefined
            }
            onMouseEnter={handleDodge}
            onPointerDown={handleDodge}
            onTouchStart={handleDodge}
            onClick={handleDodge}
            aria-label="No option"
          >
            <span>{currentNoLabel}</span>
          </button>
        </div>

        {/* Playful hint after a few dodges */}
        {dodgeCount > 1 && (
          <div className="qt-dodge-hint" aria-live="polite">
            <span>✨</span>
            <span>Psst... You can&apos;t click No! The only answer is Yes! 😉</span>
          </div>
        )}
      </main>
    </section>
  );
}
