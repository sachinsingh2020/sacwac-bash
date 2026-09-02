import { useEffect, useState } from "react";

export default function WishPhase({ person, fallbackPhoto, onMessageComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMessage, setVisibleMessage] = useState("");
  const message = person.message || "";
  useEffect(() => {
    if (!isOpen) return;
    setVisibleMessage("");
    if (!message.length) {
      onMessageComplete();
      return;
    }
    let character = 0;
    const timer = window.setInterval(() => {
      character += 1;
      setVisibleMessage(message.slice(0, character));
      if (character >= message.length) {
        window.clearInterval(timer);
        onMessageComplete();
      }
    }, 20);
    return () => window.clearInterval(timer);
  }, [isOpen, message, onMessageComplete]);
  const messageWords = (person.message || "").trim().split(/\s+/).filter(Boolean).length;
  const messageLength = messageWords >= 150 ? "long-note" : "short-note";

  return (
    <section className="wish-scene">
      <div className="sun-glow" />
      <div className={`letter-envelope ${isOpen ? "is-open" : ""}`}>
        <div className="envelope-back" />
        <div className="envelope-sparkles" aria-hidden="true">
          <i>✦</i>
          <i>✧</i>
          <i>♡</i>
        </div>
        <div className="envelope-wrinkles" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className={`wish-card ${messageLength}`}>
          <span className="wish-cake" aria-hidden="true">🎂</span>
          <span className="card-kicker">
            A note for you · {person.nickname || "you"}
          </span>
          <div className="portrait-wrap">
            <img src={person.photo || fallbackPhoto} alt={person.name} />
            <span className="portrait-sparkle">✦</span><span className="photo-candles" aria-hidden="true"><i /><i /><i /></span>
          </div>
          <h1>
            Happy
            <br />
            <em>Birthday</em>, {person.name}!
          </h1>
          <p>{visibleMessage}</p>
          <span className={`card-sign ${visibleMessage.length === message.length ? "show-sign" : ""}`}>with all the love in the world ♡</span>
        </div>
        <div className="envelope-front" />
        <button
          type="button"
          className="envelope-seal"
          onClick={() => setIsOpen(true)}
          disabled={isOpen}
          aria-label={`Open this letter. Only ${person.name} can open this`}>
          <span>ONLY {person.name.toUpperCase()}<br />CAN OPEN THIS</span>
        </button>
        {!isOpen && (
          <span className="envelope-prompt">
            open me, please <b>♡</b>
          </span>
        )}
      </div>
    </section>
  );
}
