export default function IntroPhase({ person, introGallery }) {
  return (
    <section className="intro-scene">
      <div className="intro-aurora" />
      <div className="intro-grid" />
      <div className="intro-stars">
        {Array.from({ length: 26 }, (_, i) => (
          <i
            key={i}
            style={{
              "--i": i,
              top: `${(i * 37) % 100}%`,
              left: `${(i * 61) % 100}%`,
            }}
          />
        ))}
      </div>
      <div className="petals">
        {Array.from({ length: 34 }, (_, i) => (
          <i key={i} style={{ "--i": i }} />
        ))}
      </div>
      <div className="intro-orbit orbit-one" />
      <div className="intro-orbit orbit-two" />
      <div className="intro-badge">
        <span>✦</span> a tiny celebration <span>✦</span>
      </div>{" "}
      <div className="birthday-crowd" aria-label="Birthday memories">
        {introGallery[0] && (
          <div className="real-person person-left">
            <img
              src={introGallery[0]}
              alt={`${person.name}'s birthday memory`}
            />
          </div>
        )}
        {introGallery[1] && (
          <div className="real-person person-right">
            <img
              src={introGallery[1]}
              alt={`${person.name}'s birthday memory`}
            />
          </div>
        )}
      </div>
      <div className="floating-notes" aria-label="Romantic birthday notes">
        <span className="love-note note-one">
          you make
          <br />
          ordinary days
          <br />
          feel magical <b>♡</b>
        </span>
        <span className="love-note note-two">
          forever looks
          <br />
          beautiful with you <b>✦</b>
        </span>
        <span className="love-note note-three">
          my favorite
          <br />
          place is beside you <b>♡</b>
        </span>
        <span className="love-note note-four">
          you are loved
          <br />
          more than words say <b>✧</b>
        </span>
      </div>
      <div className="intro-copy">
        <div className="intro-monogram">✦</div>
        <span className="script">a little magic for</span>
        <h1>{person.name}</h1>
        <p>Something beautiful is blooming...</p>
        <div className="intro-divider">
          <i /> <span>♡</span> <i />
        </div>
        <span className="intro-hint">pop the balloon to begin</span>{" "}
      </div>
      <div className="intro-sparkle sparkle-one">✦</div>
      <div className="intro-sparkle sparkle-two">✧</div>
      <div className="intro-sparkle sparkle-three">✦</div>
    </section>
  );
}
