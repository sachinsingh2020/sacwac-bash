export default function MessagePhase({ person, onNext }) {
  return (
    <section className="message-scene">
      <div className="confetti">
        {Array.from({ length: 24 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <span className="script">today is all about</span>
      <h1>{person.name}</h1>
      <h2>
        Who said gifts
        <br />
        need to be expensive?
      </h2>
      <p>
        The best ones are wrapped in memories, laughter,
        <br />
        and the people who make you feel at home.
      </p>
      <button className="outline-btn" onClick={onNext}>
        Touch here to see more about you <span>→</span>
      </button>
    </section>
  );
}
