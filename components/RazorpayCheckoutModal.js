"use client";

import { useState, useEffect } from "react";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existingScript = document.getElementById("razorpay-checkout-script");
    if (existingScript) return resolve(true);

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RazorpayCheckoutModal({
  isOpen,
  onClose,
  pagePayload,
  onPaymentSuccess,
  templateId = "",
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [animStep, setAnimStep] = useState(0); // 0: initial ₹299, 1: pen crossing out, 2: ₹99 revealed
  const [capturedPayment, setCapturedPayment] = useState(null);

  // Trigger fast pen-crossing animation when modal opens
  useEffect(() => {
    if (!isOpen) {
      setAnimStep(0);
      setShowExitWarning(false);
      setErrorMsg("");
      setCapturedPayment(null);
      return;
    }

    setAnimStep(0);
    const timer1 = setTimeout(() => {
      setAnimStep(1); // start pen crossing
    }, 280);

    const timer2 = setTimeout(() => {
      setAnimStep(2); // write ₹99
    }, 620);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showExitWarning) {
          setShowExitWarning(false);
        } else if (!loading) {
          setShowExitWarning(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showExitWarning, loading]);

  if (!isOpen) return null;

  const personName = pagePayload?.name?.trim() || "Their";

  const verifyPayment = async (paymentDetails) => {
    try {
      setLoading(true);
      setErrorMsg("");

      const verifyRes = await fetch("/api/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: paymentDetails.razorpay_order_id,
          razorpay_payment_id: paymentDetails.razorpay_payment_id,
          razorpay_signature: paymentDetails.razorpay_signature,
          pagePayload,
          templateId,
          tier: "login",
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.slug) {
        throw new Error(verifyData.error || "Payment verification failed.");
      }

      // Track Purchase in Meta Pixel with full standard parameters and eventID for CAPI deduplication
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        try {
          window.fbq("track", "Purchase", {
            value: typeof verifyData.amountPaid === "number" && verifyData.amountPaid > 0 ? Number(verifyData.amountPaid.toFixed(2)) : 99.00,
            currency: "INR",
            content_type: "product",
            content_name: `Celebration Page: ${verifyData.slug}`,
            content_ids: [verifyData.slug || "celebration_page"],
            num_items: 1,
          }, { eventID: paymentDetails.razorpay_payment_id });
        } catch (e) {}
      }

      onPaymentSuccess({ slug: verifyData.slug });
    } catch (err) {
      console.error("Verification error:", err);
      setErrorMsg(err.message || "Payment received but link generation encountered an issue. Tap below to retry generating your link.");
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePayment = async () => {
    // If payment was already completed on Razorpay, avoid opening payment popup again
    if (capturedPayment) {
      return verifyPayment(capturedPayment);
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay payment window. Please check your internet connection.");
      }

      // 1. Create server-side order for ₹99
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "INR", tier: "login", offerPrice: 99 }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.orderId) {
        throw new Error(orderData.error || "Failed to create payment order.");
      }

      // Track InitiateCheckout in Meta Pixel with standard parameters
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        try {
          window.fbq("track", "InitiateCheckout", {
            value: orderData.amount ? Number((orderData.amount / 100).toFixed(2)) : 99.00,
            currency: orderData.currency || "INR",
            content_type: "product",
            content_name: `Celebration Page: ${personName}`,
            content_ids: ["celebration_page"],
            num_items: 1,
          });
        } catch (e) {}
      }

      // 2. Configure Razorpay Standard Checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Magic Moments",
        description: `Celebration Surprise for ${personName}`,
        order_id: orderData.orderId,
        prefill: {
          name: pagePayload?.sender || personName || "",
        },
        theme: {
          color: "#d95775",
        },
        handler: async function (response) {
          setCapturedPayment(response);
          await verifyPayment(response);
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on("payment.failed", function (response) {
        console.error("Razorpay payment failed:", response.error);
        setErrorMsg(response.error?.description || "Payment failed. Please try a different payment method.");
        setLoading(false);
      });

      razorpayInstance.open();
    } catch (err) {
      console.error("Checkout initiation error:", err);
      setErrorMsg(err.message || "Failed to initiate payment. Please try again.");
      setLoading(false);
    }
  };

  const handleAttemptClose = () => {
    if (loading) return;
    setShowExitWarning(true);
  };

  return (
    <>
      <div className="checkout-modal-overlay" onClick={handleAttemptClose} role="dialog" aria-modal="true">
        <div className="checkout-modal-card discounted-checkout-card" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="checkout-close-btn"
            onClick={handleAttemptClose}
            aria-label="Close checkout modal"
            disabled={loading}
          >
            ✕
          </button>

          <div className="checkout-header">
            <span className="checkout-icon" aria-hidden="true">🎂</span>
            <h2 className="checkout-title">Unlock {personName}&apos;s Celebration</h2>
            <p className="checkout-sub">
              Your celebration surprise is ready! Unlock the permanent link to send directly on WhatsApp.
            </p>
          </div>

          {/* Animated Pen-Crossing Price Card (299 -> crossed -> 99) */}
          <div className="animated-price-stage">
            <div className="price-tag-wrapper">
              <div className={`price-original-box ${animStep >= 1 ? "is-crossed" : ""}`}>
                <span className="price-original-label">Regular Price</span>
                <div className="price-strike-container">
                  <span className="price-original-val">₹299</span>
                  {/* Pen Slash Graphic */}
                  <svg className={`pen-slash-svg ${animStep >= 1 ? "draw-slash" : ""}`} viewBox="0 0 100 30" preserveAspectRatio="none">
                    <path
                      d="M 5,22 Q 45,5 95,8"
                      fill="none"
                      stroke="#e11d48"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  {animStep >= 1 && <span className="pen-tip-icon" aria-hidden="true">✍️</span>}
                </div>
              </div>

              {/* Arrow Transition */}
              <div className={`price-arrow-divider ${animStep >= 2 ? "show-divider" : ""}`}>
                →
              </div>

              {/* Discounted ₹99 Reveal */}
              <div className={`price-discounted-box ${animStep >= 2 ? "pop-discount" : "hidden-discount"}`}>
                <span className="price-discount-pill">Special Celebration Offer</span>
                <div className="price-deal-row">
                  <span className="price-deal-num">₹99</span>
                  <span className="price-deal-tax">Only</span>
                </div>
              </div>
            </div>

            <div className={`price-savings-toast ${animStep >= 2 ? "show-savings" : ""}`}>
              🎉 You save <strong>₹200 (67% OFF)</strong> today!
            </div>
          </div>

          {/* Value Highlights */}
          <ul className="checkout-features-list">
            <li>
              <span className="feature-check">✓</span>
              <span><strong>Secret Midnight Lock:</strong> Automatically unlocks at 12:00 AM on their birthday.</span>
            </li>
            <li>
              <span className="feature-check">✓</span>
              <span><strong>Full Interactive Journey:</strong> Floating memories, music, cake candles &amp; openable card.</span>
            </li>
            <li>
              <span className="feature-check">✓</span>
              <span><strong>Permanent Link:</strong> Never expires, ad-free, and looks stunning on all phones.</span>
            </li>
          </ul>

          {errorMsg && (
            <div className="checkout-error-pill" role="alert">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary CTA */}
          <button
            type="button"
            className="checkout-pay-btn"
            onClick={handleInitiatePayment}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-mini" />
                <span>{capturedPayment ? "Generating Your Link... 🎂" : "Connecting Razorpay... ✨"}</span>
              </>
            ) : capturedPayment ? (
              <>
                <span>Generate Shareable Link</span>
                <span className="checkout-btn-arrow">→</span>
              </>
            ) : (
              <>
                <span>Pay ₹99 &amp; Get Shareable Link</span>
                <span className="checkout-btn-arrow">→</span>
              </>
            )}
          </button>

          <p className="checkout-guarantee-note">
            🔒 Secure 256-bit payment via Razorpay · Instant link generation
          </p>
        </div>
      </div>

      {/* Exit confirmation prompt */}
      {showExitWarning && (
        <div className="checkout-exit-overlay" onClick={() => setShowExitWarning(false)}>
          <div className="checkout-exit-card" onClick={(e) => e.stopPropagation()}>
            <span className="checkout-exit-icon">✨</span>
            <h3>Keep this special ₹99 price?</h3>
            <p>
              Your celebration surprise for <strong>{personName}</strong> is ready to share. If you leave now, you might miss this limited ₹99 rate.
            </p>
            <div className="checkout-exit-buttons">
              <button
                type="button"
                className="checkout-exit-btn-resume"
                onClick={() => setShowExitWarning(false)}
              >
                Claim for ₹99 &amp; Continue 💖
              </button>
              <button
                type="button"
                className="checkout-exit-btn-quit"
                onClick={() => {
                  setShowExitWarning(false);
                  onClose();
                }}
              >
                Exit without saving
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
