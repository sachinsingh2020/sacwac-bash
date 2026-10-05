import { useEffect, useState, useMemo } from "react";
import "./HeartTreePhase.css";

// Vivid glossy gradients matching SS2 strictly
const gradients = [
  { id: "grad-pink", top: "#ffa3c2", bottom: "#e03870" },
  { id: "grad-dark", top: "#ff638f", bottom: "#b8244e" },
  { id: "grad-gold", top: "#ffe480", bottom: "#f0a20f" },
  { id: "grad-peach", top: "#ffcdab", bottom: "#e86b3a" },
  { id: "grad-light", top: "#ffe8ed", bottom: "#ffa3c0" },
];

export default function HeartTreePhase({ person, onComplete }) {
  const [showTree, setShowTree] = useState(true);

  useEffect(() => {
    // Ensure showTree is definitely true
    setShowTree(true);
  }, []);

  useEffect(() => {
    // Trigger onComplete when heart tree branches and leaves have bloomed (~3.5s)
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3500);
    return () => clearTimeout(completeTimer);
  }, [onComplete]);

  const recipientName = person?.name?.trim() || person?.nickname?.trim() || "Special One";
  const recipientAge = person?.age ? String(person.age).trim() : "";

  const generatedHearts = useMemo(() => {
    const hearts = [];
    const numHearts = 650;
    let i = 0;

    // mathematical perfect bounding box to cluster leaves exactly into a heart shape
    while (i < numHearts) {
      let x = Math.random() * 3 - 1.5;
      let y = Math.random() * 3 - 1.5;

      let val = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;

      if (val <= 0) {
        // inside the heart
        const scale = 180; // overall width of the canopy
        const css_x = 250 + x * scale;
        const css_y = 280 - y * scale;

        let size = Math.random() * 16 + 12; // 12px to 28px

        // Stagger leaf appearance from trunk upwards
        const normalizedY = css_y / 500;
        const delay = 0.6 + normalizedY * 1.4 + Math.random() * 0.4; // Starts popping quickly at ~0.6s -> 2.4s

        const grad =
          gradients[
            Math.random() > 0.85
              ? 2
              : Math.floor(Math.random() * gradients.length)
          ];

        const gradId = `leaf-grad-${i}`;

        hearts.push(
          <div
            key={`leaf-${i}`}
            className="small-tree-heart"
            style={{
              left: `${css_x}px`,
              top: `${css_y}px`,
              "--delay": `${delay.toFixed(2)}s`,
              "--size": `${size.toFixed(1)}px`,
              zIndex: Math.floor(Math.random() * 100),
            }}>
            <svg
              viewBox="0 0 24 24"
              width="100%"
              height="100%"
              style={{ overflow: "visible" }}>
              <defs>
                <linearGradient
                  id={gradId}
                  x1="20%"
                  y1="0%"
                  x2="80%"
                  y2="100%">
                  <stop offset="0%" stopColor={grad.top} />
                  <stop offset="100%" stopColor={grad.bottom} />
                </linearGradient>
              </defs>
              <path
                fill={`url(#${gradId})`}
                style={{ fill: `url(#${gradId})` }}
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
              <path
                fill="rgba(255,255,255,0.45)"
                d="M 6.5 4 C 4.5 6 4 8 5.5 10 C 5 8 6.5 5 9.5 4.5 C 8 4 7.5 4 6.5 4 Z"
              />
            </svg>
          </div>,
        );
        i++;
      }
    }
    return hearts;
  }, []);

  return (
    <section className="heart-tree-scene">
      {/* Background radial glow */}
      <div className="perfect-tree-glow"></div>

      <div className="heart-tree-container">
        {/* Left Side: Soft gradient text block */}
        <div className={`heart-tree-text ${showTree ? "active" : ""}`}>
          <span className="script text-line-1">
            it&apos;s officially your day
          </span>
          <h1 className="text-line-2">
            Happy
            <br />
            Birthday, {recipientName}
          </h1>
          <p className="text-line-3">
            and just like that, you&apos;re turning{" "}
            <strong>{recipientAge || "another year brighter"}</strong> ✨
          </p>
        </div>

        {/* Right Side: Visual Tree */}
        <div className={`heart-tree-visual ${showTree ? "growing" : ""}`}>
          {/* The base branches drawn via stroke-dasharray */}
          <svg
            className="bare-branches-svg"
            viewBox="0 0 500 650"
            preserveAspectRatio="xMidYMax meet">
            <defs>
              {gradients.map((g) => (
                <linearGradient
                  key={g.id}
                  id={g.id}
                  x1="20%"
                  y1="0%"
                  x2="80%"
                  y2="100%">
                  <stop offset="0%" stopColor={g.top} />
                  <stop offset="100%" stopColor={g.bottom} />
                </linearGradient>
              ))}
            </defs>
            <g
              stroke="#3d2128"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round">
              {/* Trunk */}
              <path
                className="t-path p-trunk"
                strokeWidth="20"
                d="M 250 650 Q 250 500 250 370"
              />

              {/* Main left and right structure */}
              <path
                className="t-path p-b1"
                strokeWidth="14"
                d="M 250 370 C 220 320, 180 270, 150 200"
              />
              <path
                className="t-path p-b1"
                strokeWidth="14"
                d="M 250 370 C 280 320, 320 270, 350 200"
              />

              {/* Central vertical continuation */}
              <path
                className="t-path p-b2"
                strokeWidth="14"
                d="M 250 370 C 255 290, 260 210, 260 120"
              />

              {/* Left side sub-branches */}
              <path
                className="t-path p-s1"
                strokeWidth="8"
                d="M 183 260 Q 140 230 110 180"
              />
              <path
                className="t-path p-s2"
                strokeWidth="8"
                d="M 155 210 Q 120 180 100 130"
              />
              <path
                className="t-path p-s2"
                strokeWidth="8"
                d="M 160 215 Q 180 160 200 130"
              />
              <path
                className="t-path p-s2"
                strokeWidth="6"
                d="M 125 180 Q 90 170 80 130"
              />

              {/* Right side sub-branches */}
              <path
                className="t-path p-s1"
                strokeWidth="8"
                d="M 315 260 Q 360 230 390 180"
              />
              <path
                className="t-path p-s2"
                strokeWidth="8"
                d="M 345 210 Q 380 180 400 130"
              />
              <path
                className="t-path p-s2"
                strokeWidth="8"
                d="M 340 215 Q 320 160 300 130"
              />
              <path
                className="t-path p-s2"
                strokeWidth="6"
                d="M 375 180 Q 410 170 420 130"
              />

              {/* Top sub-branches */}
              <path
                className="t-path p-s3"
                strokeWidth="6"
                d="M 258 200 Q 230 150 220 100"
              />
              <path
                className="t-path p-s3"
                strokeWidth="6"
                d="M 260 180 Q 290 140 300 90"
              />
            </g>
          </svg>

          {/* The tiny leaves that completely cover the branches */}
          <div className="lush-canopy">{generatedHearts}</div>

          {/* Subtle falling leaves dropping from the tree continuously */}
          <div className="ambient-leaves">
            {Array.from({ length: 20 }).map((_, i) => {
              const ambGrad = gradients[i % gradients.length];
              const ambId = `amb-grad-${i}`;
              return (
                <div
                  key={`ambient-${i}`}
                  className="falling-leaf"
                  style={{
                    left: `${20 + ((i * 13) % 60)}%`,
                    "--float-dur": `${6 + (i % 5)}s`,
                    "--float-del": `${(i * 0.4).toFixed(1)}s`,
                    "--size": `${13 + (i % 6)}px`,
                    "--drift": `${((i % 2 === 0 ? 1 : -1) * (30 + i * 4))}px`,
                  }}>
                  <svg
                    viewBox="0 0 24 24"
                    width="100%"
                    height="100%"
                    style={{ overflow: "visible" }}>
                    <defs>
                      <linearGradient
                        id={ambId}
                        x1="20%"
                        y1="0%"
                        x2="80%"
                        y2="100%">
                        <stop offset="0%" stopColor={ambGrad.top} />
                        <stop offset="100%" stopColor={ambGrad.bottom} />
                      </linearGradient>
                    </defs>
                    <path
                      fill={`url(#${ambId})`}
                      style={{ fill: `url(#${ambId})` }}
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    />
                    <path
                      fill="rgba(255,255,255,0.45)"
                      d="M 6.5 4 C 4.5 6 4 8 5.5 10 C 5 8 6.5 5 9.5 4.5 C 8 4 7.5 4 6.5 4 Z"
                    />
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
