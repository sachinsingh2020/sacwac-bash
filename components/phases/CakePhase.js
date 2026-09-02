export default function CakePhase({ person }) {
  return (
    <section className="final-scene cake-page">
      <span className="script">make a wish</span>
      <div className="cake">
        <div className="candle">🕯️</div>
        <div className="icing" />
        <div className="cake-layer layer-one" />
        <div className="cake-layer layer-two" />
        <div className="cake-layer layer-three" />
      </div>
      <h1>Happy birthday, {person.name}!</h1>
      <p className="final-prompt">A little sweetness, made just for you.</p>
    </section>
  );
}
