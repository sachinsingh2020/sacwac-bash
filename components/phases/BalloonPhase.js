export default function BalloonPhase({ popped, onPop, onOpenGallery }) {
  return (
    <section className="balloon-page">
      <span className="script">one more little surprise</span>
      <h1>
        Pop a balloon,
        <br />
        <em>find a message.</em>
      </h1>
      <p className="final-prompt">Choose them in any order.</p>
      <div className="balloon-row">
        {[
          "You are magic ✦",
          "Keep shining ✨",
          "More adventures!",
          "You are so loved ♡",
        ].map((text, index) => (
          <button
            key={text}
            className={`pop-balloon b${index + 1} ${popped.includes(index) ? "popped" : ""}`}
            onClick={() => onPop(index)}>
            <span>{popped.includes(index) ? text : "🎈"}</span>
          </button>
        ))}
      </div>
      <button
        className={`outline-btn gallery-button ${popped.length === 4 ? "visible" : ""}`}
        onClick={onOpenGallery}>
        Open your memory gallery <span>→</span>
      </button>
    </section>
  );
}
