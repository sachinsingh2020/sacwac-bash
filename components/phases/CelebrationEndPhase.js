"use client";

import { useMemo } from "react";
import "./CelebrationEndPhase.css";

export default function CelebrationEndPhase({ person, onReplay, onShare }) {
  // Generate playful celebratory confetti dots and stars
  const confettiItems = useMemo(() => {
    const colors = [
      "#ffd700",
      "#ff5c8a",
      "#a259ff",
      "#ff9233",
      "#2ecc71",
      "#00f0ff",
      "#ffffff",
      "#ff758c",
    ];
    const shapes = ["circle", "square", "star"];
    const items = [];

    for (let i = 0; i < 28; i++) {
      items.push({
        id: i,
        shape: shapes[i % shapes.length],
        color: colors[i % colors.length],
        left: `${(i * 13) % 94 + 3}%`,
        top: `${(i * 17) % 88 + 5}%`,
        delay: `${(i * 0.18).toFixed(2)}s`,
        duration: `${(3.2 + (i % 4) * 0.45).toFixed(2)}s`,
        scale: (0.7 + (i % 3) * 0.25).toFixed(2),
        rotate: (i * 24) % 360,
      });
    }
    return items;
  }, []);

  const senderName = person?.sender?.trim() || "";

  return (
    <section className="celebration-end-page">
      <div className="celebration-ambient-glow" aria-hidden="true" />

      {/* Floating Confetti & Star Sparkles */}
      <div className="celebration-confetti-field" aria-hidden="true">
        {confettiItems.map((item) => (
          <span
            key={item.id}
            className={`celebration-confetti piece-${item.shape}`}
            style={{
              left: item.left,
              top: item.top,
              background: item.color,
              animationDelay: item.delay,
              animationDuration: item.duration,
              transform: `scale(${item.scale}) rotate(${item.rotate}deg)`,
            }}
          />
        ))}
      </div>

      <div className="celebration-content">
        {/* Top Typography */}
        <div className="celebration-title-group">
          <h1 className="celebration-heading">
            <span>HAPPY</span>
            <span>BIRTHDAY</span>
          </h1>
          <div className="celebration-name-script">
            {person?.name ? `${person.name}!` : "Special One!"}
          </div>
        </div>

        {/* Celebration Cat Mascot from SS3 */}
        <div className="celebration-cat-wrapper">
          <img
            src="/images/celebration-cat.png"
            alt="Birthday Celebration Cat"
            className="celebration-cat-img"
          />
        </div>

        {/* Subtitle / Sender Note */}
        <p className="celebration-made-with-love">
          Made with love, just for you
          {senderName ? (
            <>
              {" "}— <span className="celebration-sender-highlight">{senderName}</span>
            </>
          ) : ""} 💛
        </p>

        {/* 2 Action Buttons moved from SS1 */}
        <div className="celebration-actions">
          {onShare && (
            <button
              type="button"
              className="share-link-btn celebration-share-btn"
              onClick={onShare}
            >
              Send the link to your loved one 💌
            </button>
          )}
          {onReplay && (
            <button
              type="button"
              className="replay-btn celebration-replay-btn"
              onClick={onReplay}
            >
              Celebrate Again <span>↺</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
