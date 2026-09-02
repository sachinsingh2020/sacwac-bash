"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ArrowHeartPhase from "./phases/ArrowHeartPhase";
import BalloonPhase from "./phases/BalloonPhase";
import CakePhase from "./phases/CakePhase";
import GalleryPhase from "./phases/GalleryPhase";
import IntroPhase from "./phases/IntroPhase";
import MessagePhase from "./phases/MessagePhase";
import TreePhase from "./phases/TreePhase";
import WishPhase from "./phases/WishPhase";

const fallback = {
  name: "Satwika",
  nickname: "Saturday",
  age: "26",
  message:
    "You make ordinary days feel like tiny celebrations. Today, the whole world gets to celebrate you.",
  photo:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85",
  gallery: [
    "photo-1516589178581-6cd7833ae3b2",
    "photo-1529156069898-49953e39b3ac",
    "photo-1506869640319-fe1a24fd76dc",
    "photo-1491438590914-bc09fcaaf77a",
    "photo-1530103862676-de8c9debad1d",
  ],
};

export default function BirthdayExperience({ slug }) {
  const [person, setPerson] = useState(fallback);
  const [phase, setPhase] = useState(0);
  const [sound, setSound] = useState(true);
  const [popped, setPopped] = useState([]);
  const [introPopped, setIntroPopped] = useState(false);
  const [uploadedGallery, setUploadedGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [arrowReleased, setArrowReleased] = useState(false);
  const [nextBalloonPopped, setNextBalloonPopped] = useState(false);
  const audio = useRef(null);

  useEffect(() => {
    fetch(`/api/pages/${slug}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((found) => {
        if (found) {
          setPerson({ ...fallback, ...found });
          setUploadedGallery(
            Array.isArray(found.gallery) ? found.gallery.slice(0, 2) : [],
          );
        }
      })
      .catch((error) => console.error("Unable to load birthday page:", error))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (loading || !audio.current) return;

    const startAudio = () => {
      if (!audio.current || !sound) return;

      audio.current.play().catch((error) => {
        if (error.name !== "NotAllowedError") {
          console.error("Unable to start background music:", error);
        }
      });
    };

    if (sound) {
      startAudio();
      window.addEventListener("pointerdown", startAudio, { once: true });
      window.addEventListener("keydown", startAudio, { once: true });
    } else {
      audio.current.pause();
    }

    return () => {
      window.removeEventListener("pointerdown", startAudio);
      window.removeEventListener("keydown", startAudio);
    };
  }, [loading, sound]);

  const gallery = useMemo(
    () =>
      person.gallery?.map((item) =>
        item.startsWith("http")
          ? item
          : `https://images.unsplash.com/${item}?auto=format&fit=crop&w=800&q=80`,
      ) || [],
    [person.gallery],
  );
  const introGallery = useMemo(
    () =>
      uploadedGallery.map((item) =>
        item.startsWith("http")
          ? item
          : `https://images.unsplash.com/${item}?auto=format&fit=crop&w=800&q=80`,
      ),
    [uploadedGallery],
  );
  const prev = () => setPhase((current) => Math.max(current - 1, 0));
  const next = () => setPhase((current) => Math.min(current + 1, 7));
  useEffect(() => {
    setNextBalloonPopped(false);
  }, [phase]);
  const popNextBalloon = () => {
    if (nextBalloonPopped) return;
    setNextBalloonPopped(true);
    setTimeout(next, 520);
  };
  const launchArrow = () => {
    if (arrowReleased) return;
    setArrowReleased(true);
  };
  const popIntroBalloon = () => {
    if (introPopped) return;
    setIntroPopped(true);
    setTimeout(next, 420);
  };
  const pop = (index) => {
    if (!popped.includes(index)) setPopped([...popped, index]);
  };

  if (loading)
    return (
      <main className="experience loading-screen">
        <div className="birthday-loader" role="status" aria-live="polite">
          <span className="loader-ring" />
          <strong>Happy Birthday</strong>
          <small>preparing something lovely...</small>
        </div>
      </main>
    );

  return (
    <>
      <main className="phone-blocked-message">
        <div className="phone-blocked-card">
          <div className="phone-blocked-emoji">💌✨</div>
          <h1>Hello {person.name}!</h1>
          <p>
            I didn&apos;t make this for a phone.
            <br />
            Go look at it on a laptop, pretty please! 💖
          </p>
          <p className="phone-blocked-tease">
            I told you to see it on a laptop, but you still opened it on your
            phone 😒
          </p>
          <span>Something magical is waiting for you there 🥰</span>
        </div>
      </main>
      <main className={`experience phase-${phase}`}>
      <audio ref={audio} src="/music/birthday.mp3" loop autoPlay preload="auto" />
      <button className="sound-toggle" onClick={() => setSound(!sound)}>
        {sound ? "♪" : "×"} <span>{sound ? "Sound on" : "Sound off"}</span>
      </button>
      {phase === 0 && (
        <ArrowHeartPhase
          person={person}
          arrowReleased={arrowReleased}
          onLaunchArrow={launchArrow}
          onNext={popNextBalloon}
          nextBalloonPopped={nextBalloonPopped}
        />
      )}
      {phase === 1 && (
        <IntroPhase
          person={person}
          introGallery={introGallery}
        />
      )}
      {phase === 2 && (
        <WishPhase
          person={person}
          fallbackPhoto={fallback.photo}
        />
      )}
      {phase === 3 && <GalleryPhase person={person} gallery={gallery} />}
      {phase === 4 && <MessagePhase person={person} />}
      {phase === 5 && <TreePhase person={person} />}
      {phase === 6 && <CakePhase person={person} />}
      {phase === 7 && (
        <BalloonPhase
          popped={popped}
          onPop={pop}
          onOpenGallery={() => setPhase(3)}
        />
      )}
      {phase > 0 && phase < 7 && phase !== 3 && (
        <button
          type="button"
          className={`ah-next-balloon shared-next-balloon ${
            nextBalloonPopped ? "popped" : ""
          }`}
          onClick={popNextBalloon}
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
      {phase >= 0 && phase < 8 && (
        <div className="progress-dots">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((dot) => (
            <i className={phase >= dot ? "active" : ""} key={dot} />
          ))}
        </div>
      )}
      {phase >= 0 && phase <= 7 && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "24px",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "12px",
            zIndex: 30,
          }}>
          <button
            type="button"
            onClick={prev}
            disabled={phase === 0}
            style={{
              border: "1px solid rgba(122, 87, 95, 0.35)",
              background:
                phase === 0
                  ? "rgba(255, 255, 255, 0.5)"
                  : "rgba(255, 255, 255, 0.82)",
              color: "#6e4f59",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "12px 18px",
              cursor: phase === 0 ? "not-allowed" : "pointer",
              opacity: phase === 0 ? 0.5 : 1,
              boxShadow: "0 10px 28px rgba(127, 85, 95, 0.12)",
              backdropFilter: "blur(8px)",
            }}>
            Prev
          </button>
          <button
            type="button"
            onClick={next}
            disabled={phase === 7}
            style={{
              border: "1px solid #d95775",
              background: phase === 7 ? "rgba(217, 87, 117, 0.4)" : "#d95775",
              color: "#fff",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "12px 18px",
              cursor: phase === 7 ? "not-allowed" : "pointer",
              boxShadow: "0 10px 28px rgba(217, 87, 117, 0.22)",
              backdropFilter: "blur(8px)",
            }}>
            {phase === 7 ? "Done" : "Next"}
          </button>
        </div>
      )}
      </main>
    </>
  );
}
