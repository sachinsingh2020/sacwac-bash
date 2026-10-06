import { useEffect, useState, useRef, useMemo } from "react";
import "./CakePhase.css";

export default function CakePhase({ person, onComplete }) {
  const [scene, setScene] = useState(0);
  const [micEnabled, setMicEnabled] = useState(false);
  const [blownOut, setBlownOut] = useState(false);
  const [isBuilt, setIsBuilt] = useState(false);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const reqRef = useRef(null);

  useEffect(() => {
    if (scene === 0) {
      const t = setTimeout(() => setScene(2), 3500);
      return () => clearTimeout(t);
    } else if (scene === 2) {
      const tBuild = setTimeout(() => setIsBuilt(true), 3500);
      let streamGrabbed = null;
      const attachAudio = (stream) => {
        streamGrabbed = stream;
        setMicEnabled(true);
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        // Auto-resume AudioContext on iOS/Android if started in suspended state
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        const ensureActive = () => {
          if (audioContextRef.current && audioContextRef.current.state === "suspended") {
            audioContextRef.current.resume().catch(() => {});
          }
        };
        window.addEventListener("touchstart", ensureActive, { passive: true, once: true });
        window.addEventListener("pointerdown", ensureActive, { passive: true, once: true });

        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.3; // Responsive to fast air puffs

        microphoneRef.current = ctx.createMediaStreamSource(stream);
        microphoneRef.current.connect(analyserRef.current);

        const freqBins = analyserRef.current.frequencyBinCount;
        const freqData = new Uint8Array(freqBins);
        const timeData = new Uint8Array(freqBins);

        const startTime = Date.now();
        let blowFrames = 0;

        const checkAudio = () => {
          if (blownOut) return;

          // Keep audio context running
          if (ctx.state === "suspended") {
            ctx.resume().catch(() => {});
          }

          analyserRef.current.getByteFrequencyData(freqData);
          analyserRef.current.getByteTimeDomainData(timeData);

          // 1. Low-Frequency Energy (Wind & breath turbulence: 0-600Hz)
          const lowBins = Math.min(18, freqBins);
          let lowSum = 0;
          for (let i = 1; i < lowBins; i++) {
            lowSum += freqData[i];
          }
          const lowAvg = lowSum / (lowBins - 1);

          // 2. Time-domain amplitude displacement (direct air impact on mic diaphragm)
          let timeDevSum = 0;
          for (let i = 0; i < timeData.length; i++) {
            timeDevSum += Math.abs(timeData[i] - 128);
          }
          const timeDevAvg = timeDevSum / timeData.length;

          // 3. Overall frequency average
          let totalSum = 0;
          for (let i = 0; i < freqBins; i++) totalSum += freqData[i];
          const overallAvg = totalSum / freqBins;

          // Sensitive detection specifically tuned for mobile phones:
          // A natural gentle blow produces lowAvg >= 20 or timeDevAvg >= 10
          const isBlowingNow = lowAvg >= 20 || timeDevAvg >= 10 || overallAvg >= 18;

          // Allow blowout after a brief 600ms grace period after cake builds
          if (Date.now() - startTime > 600) {
            if (isBlowingNow) {
              blowFrames += 1;
              if (blowFrames >= 2) {
                handleBlowOut();
                return;
              }
            } else {
              blowFrames = Math.max(0, blowFrames - 1);
            }
          }

          reqRef.current = requestAnimationFrame(checkAudio);
        };
        checkAudio();
      };

      if (typeof window !== "undefined" && window.__birthdayMicStream && window.__birthdayMicStream.active) {
        attachAudio(window.__birthdayMicStream);
      } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          })
          .catch(() => navigator.mediaDevices.getUserMedia({ audio: true }))
          .then((stream) => {
            window.__birthdayMicStream = stream;
            attachAudio(stream);
          })
          .catch((err) => {
            console.log("Mic access denied or error:", err);
            setMicEnabled(false);
          });
      }
      return () => {
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
        if (
          audioContextRef.current &&
          audioContextRef.current.state !== "closed"
        ) {
          audioContextRef.current.close().catch(console.error);
        }
      };
    }
  }, [scene, blownOut]);

  const handleBlowOut = () => {
    if (blownOut) return;
    setBlownOut(true);
    if (reqRef.current) cancelAnimationFrame(reqRef.current);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([70, 50, 90, 60, 120]);
      } catch (e) {}
    }
    if (typeof window !== "undefined" && window.__birthdayMicStream) {
      try {
        window.__birthdayMicStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
    }
    // Signal completion after candle blowout celebration fireworks have bloomed (~2.8s)
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 2800);
  };

  const crackerBursts = useMemo(() => {
    const burstConfigs = [
      { id: 1, left: "20%", top: "28%", color: "#ffd700", accent: "#ff6b8b", delay: "0.1s", size: 1.15 },
      { id: 2, left: "50%", top: "18%", color: "#ff2a6d", accent: "#ffd700", delay: "0.55s", size: 1.35 },
      { id: 3, left: "80%", top: "26%", color: "#00f0ff", accent: "#d16ba5", delay: "0.95s", size: 1.2 },
      { id: 4, left: "34%", top: "15%", color: "#ff9233", accent: "#ff3b75", delay: "1.55s", size: 1.1 },
      { id: 5, left: "66%", top: "16%", color: "#e865f0", accent: "#ffe066", delay: "2.15s", size: 1.25 },
    ];

    return burstConfigs.map((cfg) => {
      const sparkCount = 20;
      const sparks = Array.from({ length: sparkCount }).map((_, i) => {
        const angle = (i * 360) / sparkCount;
        const dist = 65 + (i % 3) * 22;
        return {
          id: i,
          angle: `${angle}deg`,
          dist: `${dist}px`,
          color: i % 2 === 0 ? cfg.color : cfg.accent,
          gravity: `${18 + (i % 4) * 8}px`,
        };
      });

      const glitters = Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * 60 + 15) * (Math.PI / 180);
        const dist = 38 + Math.random() * 45;
        return {
          id: i,
          tx: `${Math.cos(angle) * dist}px`,
          ty: `${Math.sin(angle) * dist + 32}px`,
          char: i % 3 === 0 ? "✦" : i % 3 === 1 ? "✧" : "✨",
          color: i % 2 === 0 ? cfg.color : cfg.accent,
        };
      });

      return {
        ...cfg,
        sparks,
        glitters,
      };
    });
  }, []);

  const confetti = Array.from({ length: 65 }).map((_, i) => (
    <div
      key={i}
      className={`confetti-piece c-${i % 4}`}
      style={{
        "--delay": `${Math.random() * 0.3}s`,
        "--x": `${(Math.random() - 0.5) * 450}px`,
        "--y": `${(Math.random() - 0.5) * 450 - 150}px`,
        "--rot": `${Math.random() * 720}deg`,
        "--scale": `${Math.random() * 0.6 + 0.5}`,
      }}
    />
  ));

  const sparks = Array.from({ length: 80 }).map((_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const velocity = 20 + Math.random() * 100;
    const vz = 40 + Math.random() * 150;
    const dx = Math.cos(angle) * velocity;
    const dy = -vz + Math.sin(angle) * velocity * 0.3;
    const rot = Math.random() * 360;
    return (
      <div
        key={`sp2-${i}`}
        className="epic-spark"
        style={{
          "--dx": `${dx}px`,
          "--dy": `${dy}px`,
          "--rot": `${rot}deg`,
          "--delay": `${1 + Math.random() * 0.4}s`,
          "--scale": `${0.5 + Math.random() * 0.8}`,
          background: Math.random() > 0.6 ? "#fff" : "#f5d471",
          boxShadow: `0 0 15px ${Math.random() > 0.5 ? "#ff9d00" : "#f5d471"}`,
        }}
      />
    );
  });

  const ambientBackground = useMemo(() => {
    const items = [];
    for (let i = 0; i < 90; i++) {
      const type =
        Math.random() > 0.6 ? "rect" : Math.random() > 0.5 ? "circle" : "star";
      items.push({
        id: i,
        type,
        left: `${Math.random() * 100}vw`,
        top: `${Math.random() * 100}vh`,
        animDuration: `${5 + Math.random() * 10}s`,
        animDelay: `-${Math.random() * 10}s`,
        size: type === "star" ? "12px" : `${3 + Math.random() * 6}px`,
        opacity: Math.random() * 0.4 + 0.2,
      });
    }
    return items;
  }, []);

  return (
    <section className="interactive-cake-phase">
      <div className="cake-gradient-bg">
        {ambientBackground.map((p) => (
          <div
            key={`amb-${p.id}`}
            className={`ambient-part ${p.type}`}
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDuration: p.animDuration,
              animationDelay: p.animDelay,
              opacity: p.opacity,
            }}
          />
        ))}
      </div>
      <div className={`shelf-line ${scene === 0 ? "visible" : "hidden"}`}></div>

      <div
        className={`scene-container epic-gift-scene ${scene === 0 ? "scene-active" : ""}`}>
        <div className="epic-gift-wrapper">
          <div className="epic-base">
            <div className="e-face base-inside"></div>
            <div className="e-face base-left"></div>
            <div className="e-face base-right"></div>
            <div className="e-face ribbon-bl"></div>
            <div className="e-face ribbon-br"></div>
          </div>

          <div className="epic-lid">
            <div className="e-face lid-top-wrapper">
              <div className="e-face lid-top"></div>
              <div className="lid-ribbon-x"></div>
              <div className="lid-ribbon-y"></div>
            </div>
            <div className="e-face lid-left"></div>
            <div className="e-face lid-right"></div>
            <div className="e-face ribbon-ll"></div>
            <div className="e-face ribbon-lr"></div>
            <div className="epic-bow">
              <div className="sbl sbl-1"></div>
              <div className="sbl sbl-2"></div>
              <div className="sbl sbl-3"></div>
              <div className="sbl sbl-4"></div>
              <div className="sbl sbl-5"></div>
              <div className="sbl-center"></div>
            </div>
          </div>

          <div className="explosion-flash"></div>
          <div className="epic-sparks-container">{scene === 0 && sparks}</div>
        </div>
      </div>

      <div
        className={`scene-container candle-scene ${scene === 2 ? "scene-active" : ""}`}>
        {!blownOut && <div className="top-title">First things first 🎂</div>}

        {/* Blooming Fireworks & Crackers in the sky above the cake */}
        {blownOut && (
          <div className="blooming-crackers-sky" aria-hidden="true">
            {crackerBursts.map((b) => (
              <div
                key={b.id}
                className="cracker-burst-node"
                style={{
                  left: b.left,
                  top: b.top,
                  "--delay": b.delay,
                  "--scale": b.size,
                  "--primary-color": b.color,
                  "--accent-color": b.accent,
                }}
              >
                {/* Rocket trail */}
                <div className="cracker-rocket" />

                {/* Core shockwave & flash */}
                <div className="cracker-core-flash" />
                <div className="cracker-ring r1" />
                <div className="cracker-ring r2" />

                {/* 20 Blooming sparks radiating in 360 degrees */}
                {b.sparks.map((s) => (
                  <div
                    key={s.id}
                    className="cracker-spark"
                    style={{
                      "--angle": s.angle,
                      "--dist": s.dist,
                      "--color": s.color,
                      "--gravity": s.gravity,
                    }}
                  />
                ))}

                {/* Shimmering stardust embers */}
                {b.glitters.map((g) => (
                  <span
                    key={g.id}
                    className="cracker-glitter-star"
                    style={{
                      "--tx": g.tx,
                      "--ty": g.ty,
                      "--color": g.color,
                    }}
                  >
                    {g.char}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}

        <div
          className="interactive-cake"
          onClick={() => {
            if (isBuilt) handleBlowOut();
          }}>
          <div className="layer level-one"></div>
          <div className="layer level-two"></div>
          <div className="layer level-three">
            <div className="icing-blob i1"></div>
            <div className="icing-blob i2"></div>
            <div className="icing-blob i3"></div>
            <div className="icing-blob i4"></div>
            <div className="icing-blob i5"></div>
            <div className="icing-blob i6"></div>
          </div>
          <div className={`candle-stick ${blownOut ? "extinguished" : ""}`}>
            {!blownOut && (
              <div className="flame-wrapper">
                <div className="flame"></div>
                <div className="flame-glow"></div>
              </div>
            )}
            {blownOut && <div className="smoke-wisp"></div>}
          </div>

          {isBuilt && !blownOut && (
            <div className="candle-instruction">
              <span className="text">blow or tap candle</span>
              <svg
                className="arrow-drawn"
                viewBox="0 0 50 50"
                width="30"
                height="30">
                <path
                  d="M 38,8 C 30,18 24,24 16,28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <polyline
                  points="24,23 16,28 18,20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>
        {blownOut && (
          <div className="cake-celebration-reveal">
            <div className="cake-sparkle-stars">✨ ✦ 🎂 ✦ ✨</div>
            <h1 className="cake-hbd-text">
              Happy Birthday,
              <span>{person?.name || person?.nickname || "Rancho"}!</span>
            </h1>
            <p className="cake-hbd-sub">
              Your wish is flying up to the stars! 🎉💖
            </p>
          </div>
        )}
        {blownOut && scene === 2 && (
          <div className="celebration-confetti">{confetti}</div>
        )}
      </div>
    </section>
  );
}
