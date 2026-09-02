export default function GalleryPhase({ person, gallery }) {
  return (
    <section className="gallery-page">
      <span className="script">little moments, big love</span>
      <h1>
        A gallery
        <br />
        <em>for you, {person.name}.</em>
      </h1>
      <div className="gallery-frame">
        <span className="gallery-side-border gallery-side-border-left" />
        <div className="gallery-marquee">
          <div className="gallery-track">
            {[...gallery.slice(0, 10), ...gallery.slice(0, 10)].map(
              (image, index) => (
                <div className="gallery-photo-card" key={`${image}-${index}`}>
                  <img src={image} alt="A happy memory" />
                </div>
              ),
            )}
          </div>
        </div>
        <span className="gallery-side-border gallery-side-border-right" />
      </div>
      <p>Here&apos;s to every memory behind the smile.</p>
    </section>
  );
}
