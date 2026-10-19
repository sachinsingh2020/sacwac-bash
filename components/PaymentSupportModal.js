"use client";

import { useState, useEffect, useMemo } from "react";
import "./PaymentSupportModal.css";

export default function PaymentSupportModal({ isOpen, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [upiId, setUpiId] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg("");
      setSuccess(false);
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  // Construct live preview of the message template
  const formattedMessage = useMemo(() => {
    const valName = name.trim() || "[Name]";
    const valPhone = paymentPhone.trim() || "[phone number]";
    const valWhatsapp = whatsappNumber.trim() || "[whatsapp number]";
    const valUpi = upiId.trim() || "[upi id]";
    const valRef = paymentRef.trim() || "[Razorpay Payment ID / UPI Ref]";

    return `Hi Magic Moments Team,

I completed the payment for my birthday celebration page, but I have not received the link yet. Please find my payment and delivery details below:

• Name: ${valName}
• Phone Number Used for Payment: ${valPhone}
• WhatsApp Number to Receive Link: ${valWhatsapp}
• Payment Reference: ${valRef}

If due to some reason my link is not generated then please return my money at this ${valUpi}.
${customNotes.trim() ? `\nAdditional Note: ${customNotes.trim()}\n` : ""}
Thank you!`;
  }, [name, paymentPhone, whatsappNumber, upiId, paymentRef, customNotes]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }
    if (!paymentPhone.trim()) {
      setErrorMsg("Please enter the phone number you used for payment.");
      return;
    }
    if (!whatsappNumber.trim()) {
      setErrorMsg("Please enter the WhatsApp number where you want to receive your link.");
      return;
    }
    if (!upiId.trim()) {
      setErrorMsg("Please enter your UPI ID for refund assurance.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/support/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          paymentPhone: paymentPhone.trim(),
          whatsappNumber: whatsappNumber.trim(),
          upiId: upiId.trim(),
          paymentRef: paymentRef.trim(),
          customMessage: formattedMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email. Please try again.");
      }

      setSuccess(true);
    } catch (err) {
      console.error("Support form error:", err);
      setErrorMsg(err.message || "Failed to send email. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ps-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ps-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className="ps-modal-close-btn"
          onClick={onClose}
          aria-label="Close support dialog"
          disabled={loading}
        >
          ✕
        </button>

        {success ? (
          /* SUCCESS STATE */
          <div className="ps-modal-success-box">
            <span className="ps-success-icon">💌✨</span>
            <div className="ps-success-pill">Email Delivered Successfully!</div>
            <h3 className="ps-success-title">We Have Received Your Details</h3>
            <p className="ps-success-desc">
              Your message has been sent directly to <strong>magicmoments.work@gmail.com</strong>.
            </p>

            <div className="ps-success-summary">
              <div>👤 <strong>Name:</strong> {name}</div>
              <div>📱 <strong>Payment Phone:</strong> {paymentPhone}</div>
              <div>💬 <strong>Link Delivery WhatsApp:</strong> {whatsappNumber}</div>
              <div>💸 <strong>Refund UPI ID:</strong> {upiId}</div>
            </div>

            <p className="ps-success-note">
              Our support team will verify your transaction and send your celebration link directly to your WhatsApp number shortly. If there was any payment failure, your refund will be credited to your UPI ID.
            </p>

            <button
              type="button"
              className="ps-success-done-btn"
              onClick={onClose}
            >
              Done &amp; Close
            </button>
          </div>
        ) : (
          /* FORM STATE */
          <form className="ps-modal-form" onSubmit={handleSubmit}>
            <div className="ps-modal-header">
              <span className="ps-header-badge">💌 24/7 Payment Assistance</span>
              <h2 className="ps-modal-title">Payment Done But Link Not Received?</h2>
              <p className="ps-modal-subtitle">
                Enter your details below. Our system will immediately notify our team at <strong>magicmoments.work@gmail.com</strong> so we can deliver your celebration link right away.
              </p>
            </div>

            {errorMsg && (
              <div className="ps-error-banner" role="alert">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Input Grid */}
            <div className="ps-fields-grid">
              {/* Name */}
              <div className="ps-field-group">
                <label className="ps-field-label">
                  Your Name <span className="ps-required">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="ps-input"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Email */}
              <div className="ps-field-group">
                <label className="ps-field-label">
                  Your Email Address <span className="ps-optional">(optional)</span>
                </label>
                <input
                  type="email"
                  className="ps-input"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Phone used for payment */}
              <div className="ps-field-group">
                <label className="ps-field-label">
                  Phone Number Used for Payment <span className="ps-required">*</span>
                </label>
                <input
                  type="tel"
                  required
                  className="ps-input"
                  placeholder="e.g. 9876543210"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                />
              </div>

              {/* WhatsApp Number to receive link */}
              <div className="ps-field-group">
                <label className="ps-field-label">
                  WhatsApp Number to Receive Link <span className="ps-required">*</span>
                </label>
                <input
                  type="tel"
                  required
                  className="ps-input"
                  placeholder="e.g. 9876543210"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                />
              </div>

              {/* Refund UPI ID */}
              <div className="ps-field-group ps-field-full">
                <label className="ps-field-label">
                  Refund UPI ID <span className="ps-required">*</span>
                  <span className="ps-field-hint">
                    (In case link cannot be generated, money will be returned here)
                  </span>
                </label>
                <input
                  type="text"
                  required
                  className="ps-input ps-input-upi"
                  placeholder="e.g. yourname@okhdfcbank / yourname@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>

              {/* Razorpay Ref / UPI Ref */}
              <div className="ps-field-group ps-field-full">
                <label className="ps-field-label">
                  Razorpay Payment ID / UPI Ref <span className="ps-optional">(optional)</span>
                </label>
                <input
                  type="text"
                  className="ps-input"
                  placeholder="e.g. pay_TpdrplKxxaA8Ao or 12-digit UTR"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                />
              </div>
            </div>

            {/* Live Message Template Preview */}
            <div className="ps-template-preview-box">
              <div className="ps-template-header">
                <span className="ps-template-title">📝 Email Template Preview (Sent to magicmoments.work@gmail.com):</span>
              </div>
              <pre className="ps-template-content">{formattedMessage}</pre>
            </div>

            {/* Refund Guarantee Notice Callout */}
            <div className="ps-guarantee-callout">
              <span className="ps-guarantee-icon">🛡️</span>
              <div className="ps-guarantee-text">
                <strong>100% Safe &amp; Protected:</strong> If due to some reason your celebration link is not generated, your payment will be refunded immediately to your specified UPI ID.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="ps-modal-actions">
              <button
                type="button"
                className="ps-btn-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ps-btn-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="ps-spinner-mini" />
                    <span>Sending to Support Team... ✨</span>
                  </>
                ) : (
                  <>
                    <span>🚀 Send Email to Support Now</span>
                    <span className="ps-btn-arrow">→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
