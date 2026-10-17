export default function TreePhase({ person, onReplay }) {
  return (
    <section className="tree-scene">
      <div className="tree-copy">
        <span className="script">it&apos;s officially</span>
        <h1>
          your
          <br />
          <em>day</em>, {person.name}
        </h1>
        <p>
          {person.age && person.age.toString().trim() ? (
            <>
              Just like that, you are turning{" "}
              <strong>{person.age.toString().trim()}</strong>.
            </>
          ) : (
            <>
              Just like that, another beautiful chapter begins.
            </>
          )}
        </p>
        {onReplay && (
          <button type="button" className="replay-btn" onClick={onReplay}>
            Replay the magic <span>↺</span>
          </button>
        )}
      </div>
      <div className="blossom-tree" aria-label="Cherry blossom tree">
        <div className="trunk" />
        <div className="branch branch-a" />
        <div className="branch branch-b" />
        <div className="branch branch-c" />
        {Array.from({ length: 24 }, (_, i) => (
          <i className="blossom" style={{ "--i": i }} key={i}>
            ✿
          </i>
        ))}
      </div>
      <div className="falling-leaves">
        {Array.from({ length: 18 }, (_, i) => (
          <i style={{ "--i": i }} key={i}>
            ✿
          </i>
        ))}
      </div>
    </section>
  );
}
