"use client";

import { useState } from "react";
import Link from "next/link";
import "./SiteFooter.css";

export default function SiteFooter() {
  const [copied, setCopied] = useState(false);
  const supportEmail = "magicmoments.work@gmail.com";
  const mailtoLink = `mailto:${supportEmail}?subject=Payment%20Done%20-%20Celebration%20Link%20Request&body=Hi%20Magic%20Moments%20Team,%0A%0AI%20completed%20the%20payment%20for%20my%20birthday%20celebration%20page%20but%20haven't%20received%20my%20link%20yet.%0A%0APayment%20Details:%0A-%20Celebrant%20Name:%20%0A-%20Amount%20Paid:%20%0A-%20Phone%20or%20Email:%20%0A-%20Razorpay%20Payment%20ID%20/%20UPI%20Ref:%20%0A%0AThank%20you!`;

  const handleCopyEmail = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(supportEmail).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      });
    }
  };

  return (
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
              Every payment is 100% safe and recorded. If money was deducted but you haven&apos;t received your celebration link, don&apos;t worry! Send us an email with your payment details or screenshot and our team will verify and deliver your link immediately.
            </p>
          </div>

          <div className="support-action-box">
            <div className="support-email-pill">
              <span className="support-email-icon">💌</span>
              <span className="support-email-label">Contact:</span>
              <a
                href={mailtoLink}
                className="support-email-address"
                title="Send an email to support"
              >
                {supportEmail}
              </a>
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

            <a
              href={mailtoLink}
              className="support-mail-btn"
              title="Compose email to Magic Moments Support"
            >
              <span>Send Email Now</span>
              <span className="support-mail-btn-arrow">→</span>
            </a>
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
                Create Birthday Surprise 🎂
              </Link>
              <Link href="/privacy" className="site-footer-link">
                Privacy Policy
              </Link>
              <Link href="/terms" className="site-footer-link">
                Terms of Service
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
  );
}
