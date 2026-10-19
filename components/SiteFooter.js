"use client";

import { useState } from "react";
import Link from "next/link";
import PaymentSupportModal from "./PaymentSupportModal";
import "./SiteFooter.css";

export default function SiteFooter() {
  const [copied, setCopied] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const supportEmail = "magicmoments.work@gmail.com";

  const handleCopyEmail = (e) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(supportEmail).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      });
    }
  };

  return (
    <>
      <footer className="site-footer">
        <div className="site-footer-container">
          {/* Payment Support Highlight Card */}
          <div className="site-footer-support-card">
            <div className="support-card-glow" />
            
            <div className="support-card-header">
              <span className="support-badge">
                <span className="support-badge-dot" />
                Priority Assistance
              </span>
              <h3 className="support-title">
                Payment done but not received the link?
              </h3>
              <p className="support-desc">
                Every payment is 100% safe and recorded. If money was deducted but you haven&apos;t received your celebration link, don&apos;t worry! Click below to send your details directly to our support team and we will verify and deliver your link immediately.
              </p>
            </div>

            <div className="support-action-box">
              <div
                className="support-email-pill"
                onClick={() => setIsSupportModalOpen(true)}
                title="Click to open support form"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setIsSupportModalOpen(true);
                  }
                }}
              >
                <div className="support-email-main">
                  <span className="support-email-icon">💌</span>
                  <div className="support-email-text-wrap">
                    <span className="support-email-label">Support Email</span>
                    <span className="support-email-address">
                      {supportEmail}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="support-copy-btn"
                  onClick={handleCopyEmail}
                  aria-label="Copy support email address"
                  title="Copy email address"
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>

              <button
                type="button"
                className="support-mail-btn"
                onClick={() => setIsSupportModalOpen(true)}
                title="Open payment support form"
              >
                <span>Send Email Now</span>
                <span className="support-mail-btn-arrow">→</span>
              </button>
            </div>
          </div>

          {/* Footer Navigation & Brand Row */}
          <div className="site-footer-main">
            <div className="site-footer-brand-col">
              <Link href="/" className="site-footer-brand">
                <span className="site-footer-brand-sparkle">✨</span>
                <span>Magic Moments</span>
              </Link>
              <p className="site-footer-brand-tagline">
                Crafting unforgettable, interactive celebration surprise websites for the people you cherish most.
              </p>
            </div>

            <div className="site-footer-links-col">
              <span className="site-footer-links-title">Quick Links</span>
              <div className="site-footer-links-grid">
                <Link href="/create" className="site-footer-link">
                  <span className="site-footer-link-icon">🎂</span>
                  <span>Create Birthday Surprise</span>
                </Link>
                <Link href="/privacy" className="site-footer-link">
                  <span className="site-footer-link-icon">🔒</span>
                  <span>Privacy Policy</span>
                </Link>
                <Link href="/terms" className="site-footer-link">
                  <span className="site-footer-link-icon">📄</span>
                  <span>Terms of Service</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Security Strip */}
          <div className="site-footer-bottom">
            <p className="site-footer-copy">
              © {new Date().getFullYear()} <strong>Magic Moments</strong>. All rights reserved.
            </p>
            <div className="site-footer-trust-tags">
              <span className="trust-tag">🔒 256-Bit SSL Encrypted</span>
              <span className="trust-tag-sep">•</span>
              <span className="trust-tag">⚡ Powered by Razorpay</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Payment Support Modal */}
      <PaymentSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />
    </>
  );
}
