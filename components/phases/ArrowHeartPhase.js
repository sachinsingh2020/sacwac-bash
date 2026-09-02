export default function ArrowHeartPhase({
  person,
  arrowReleased,
  onLaunchArrow,
  onNext,
  nextBalloonPopped,
}) {
  return (
    <section className="arrow-heart-scene">
      <div className="arrow-heart-bg">
        <div className="ah-glow ah-glow-one" />
        <div className="ah-glow ah-glow-two" />
        <div className="ah-stars">
          {Array.from({ length: 32 }, (_, i) => (
            <i
              key={i}
              style={{
                "--i": i,
                top: `${(i * 31) % 100}%`,
                left: `${(i * 67) % 100}%`,
              }}
            />
          ))}
        </div>
        <div className="ah-particles">
          {Array.from({ length: 20 }, (_, i) => (
            <i key={i} style={{ "--i": i }} />
          ))}
        </div>
      </div>
      <div className="ah-intro">
        <span className="ah-script">a little love...</span>
        <p>
          There&apos;s something I want
          <br />
          you to know.
        </p>
      </div>
      <div className={`ah-heart-target ${arrowReleased ? "heart-hit" : ""}`}>
        <div className="ah-heart-glow" />
        <div className="ah-heart">
          <span>♥</span>
        </div>
        <div className="ah-heart-ring ring-one" />
        <div className="ah-heart-ring ring-two" />
        <div className="ah-heart-ring ring-three" />
        <div className="heart-explosion">
          {Array.from({ length: 18 }, (_, i) => (
            <i key={i} style={{ "--i": i }} />
          ))}
        </div>
      </div>
      <button
        type="button"
        className={`ah-arrow-launcher ${arrowReleased ? "arrow-released" : ""}`}
        onClick={onLaunchArrow}
        disabled={arrowReleased}
        aria-label="Release the arrow">
        <img className="ah-bow-image" src="/arrow-heart/bow.png" alt="" />
        <div className="ah-arrow">
          <img className="ah-arrow-image" src="/arrow-heart/arrow.png" alt="" />
        </div>
        {!arrowReleased && (
          <>
            <span className="ah-bow-hint">↘ touch the arrow</span>
          </>
        )}
      </button>
      {arrowReleased && (
        <button
          type="button"
          className={`ah-next-balloon ${
            nextBalloonPopped ? "popped" : ""
          }`}
          onClick={onNext}
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
      {!arrowReleased && (
        <div className="ah-instruction">
          <span className="ah-instruction-line" />
          <span>
            touch the arrow
            <br />
            <small>and let love fly</small>
          </span>
          <span className="ah-instruction-line" />
        </div>
      )}
      <div
        className={`ah-birthday-reveal ${arrowReleased ? "show-birthday" : ""}`}>
        <span className="ah-reveal-script">with all my heart</span>
        <div className="ah-reveal-line">
          <i />
          <span>♥</span>
          <i />
        </div>
        <h1>
          HAPPY<span>BIRTHDAY</span>
        </h1>
        <h2>{person.name}</h2>
        <p>
          Today is your day.
          <br />
          And you deserve every beautiful thing.
        </p>
        <div className="ah-reveal-sparkles">
          <span>✦</span>
          <span>✧</span>
          <span>✦</span>
          <span>♡</span>
          <span>✧</span>
        </div>
      </div>
      <div className={`ah-continue ${arrowReleased ? "show-continue" : ""}`}>
        something beautiful awaits
      </div>
    </section>
  );
}
