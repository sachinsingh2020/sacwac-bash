"use client";

import { useState } from "react";
import Link from "next/link";
import "./landing.css";

const services = [
  {
    id: "birthday",
    title: "Birthday Celebration",
    tagline: "The viral interactive surprise",
    icon: "🎂",
    active: true,
    badge: "Live & Ready ✨",
    desc: "A personalized multi-scene celebration with Cupid's bow, 3D cake blowout, constellation reveals, love letter, and floating photo gallery.",
    features: [
      "🏹 Interactive Bow & Arrow Shoot",
      "🎂 3D Cake & Mic Candle Blowout",
      "✦ 5 Reasons Constellation Reveal",
      "💌 Typewriter Heartfelt Letter",
      "📸 Floating Memory Photo Gallery",
    ],
    cta: "Create Birthday Page →",
  },
  {
    id: "anniversary",
    title: "Anniversary Romance",
    tagline: "Your love story, chapter by chapter",
    icon: "💍",
    active: false,
    badge: "Coming Soon ⏳",
    desc: "Celebrate your relationship milestones with custom timeline walks, memory vaults, and romantic petal showers.",
    features: [
      "📅 Milestone Story Walk",
      "🔒 Couple Secret Memory Vault",
      "🌹 Rose Petal Shower & Vows",
      "🎵 Our Song Vinyl Player",
    ],
    cta: "Explore Service →",
  },
  {
    id: "friendship",
    title: "Friendship Fiesta",
    tagline: "For the friend who knows too much",
    icon: "🤝",
    active: false,
    badge: "Coming Soon ⏳",
    desc: "Roast and toast your best friend with inside jokes, meme walls, shared nostalgia, and certified bestie awards.",
    features: [
      "🎭 Bestie Inside-Joke Vault",
      "😂 Shared Meme Carousel",
      "🏆 Lifetime Best Friend Award",
      "⚡ Fast-Paced Trivia Quiz",
    ],
    cta: "Explore Service →",
  },
  {
    id: "confession",
    title: "Love Confession",
    tagline: "The courage to say what you feel",
    icon: "💌",
    active: false,
    badge: "Coming Soon ⏳",
    desc: "A cinematic, deeply emotional interactive letter that slowly unfolds to ask the most important question.",
    features: [
      "🔐 Heart Lock Unlocker",
      "💫 Cinematic Ambient Visuals",
      "🌸 Interactive Yes/No Heart Journey",
      "💖 Personal Audio Note",
    ],
    cta: "Explore Service →",
  },
];

export default function HomePage() {
  const [comingSoonModal, setComingSoonModal] = useState(null);

  const handleCardClick = (service) => {
    if (!service.active) {
      setComingSoonModal(service);
    }
  };

  return (
    <main className="landing-container">
      <div className="landing-ambient-glow" />

      {/* Navigation */}
      <header className="landing-nav">
        <Link href="/" className="landing-brand">
          <span className="landing-brand-icon">✨</span>
          <span>Magic Moments</span>
        </Link>
        <div className="landing-nav-actions">
          <Link href="/create" className="nav-cta-btn">
            Create 🎂
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-pill-badge">
          <span>💖</span> Made with love for your special people
        </div>
        <h1 className="hero-title">
          Turn Special Days Into
          <span>Unforgettable Magic</span>
        </h1>
        <p className="hero-subtitle">
          Craft personal, interactive celebration websites in minutes — filled
          with touch-friendly games, real music, candle blowing, and heartfelt
          memories.
        </p>
        <div className="hero-cta-group">
          <Link href="/create" className="btn-primary-hero">
            Create a Birthday Page 🎂
          </Link>
          <a href="#services" className="btn-secondary-hero">
            Browse All Services ↓
          </a>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="landing-services">
        <div className="services-header">
          <span className="services-eyebrow">Interactive Studio</span>
          <h2 className="services-title">Choose an Experience</h2>
          <p className="services-desc">
            Handcrafted story-driven web journeys tailored for life’s most
            treasured relationships.
          </p>
        </div>

        <div className="services-grid">
          {services.map((service) => (
            <div
              key={service.id}
              className={`service-card ${service.active ? "card-active" : "card-upcoming"}`}
            >
              <div className="card-top-row">
                <div className="card-icon-bubble">{service.icon}</div>
                <span
                  className={`card-badge ${service.active ? "badge-live" : "badge-soon"}`}
                >
                  {service.badge}
                </span>
              </div>

              <h3 className="card-title">{service.title}</h3>
              <p className="card-tagline">{service.tagline}</p>
              <p className="card-desc">{service.desc}</p>

              <ul className="card-features-list">
                {service.features.map((feat, idx) => (
                  <li key={idx}>
                    <span>✦</span> {feat}
                  </li>
                ))}
              </ul>

              {service.active ? (
                <Link href="/create" className="card-btn card-btn-active">
                  {service.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCardClick(service)}
                  className="card-btn card-btn-soon"
                >
                  {service.cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Coming Soon Friendly Modal */}
      {comingSoonModal && (
        <div
          className="coming-soon-overlay"
          onClick={() => setComingSoonModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="coming-soon-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cs-icon-big">{comingSoonModal.icon}</div>
            <h3 className="cs-title">We are still working on this page!</h3>
            <span className="cs-service-name">
              {comingSoonModal.title}
            </span>
            <p className="cs-message">
              Wait for me, they will be available soon! 💖
              <br />
              <br />
              In the meantime, you can create a complete, personalized{" "}
              <strong>Birthday Celebration</strong> experience right now!
            </p>

            <div className="cs-actions">
              <Link href="/create" className="cs-btn-birthday">
                Create a Birthday Page 🎂
              </Link>
              <button
                type="button"
                className="cs-btn-dismiss"
                onClick={() => setComingSoonModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="landing-footer">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
          <div>
            © {new Date().getFullYear()} <strong>Magic Moments</strong> — Made with all my heart ✨
          </div>
          <div style={{ display: "flex", gap: "16px", fontSize: "12px", opacity: 0.85 }}>
            <Link href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" style={{ color: "inherit", textDecoration: "underline" }}>
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
