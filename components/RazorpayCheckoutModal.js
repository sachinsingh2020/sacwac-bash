"use client";

import { useState, useEffect } from "react";
import PaperOfferCoupon from "./PaperOfferCoupon";
import { getCurrentMonthOffer } from "../lib/monthlyOffer";
import { detectUserCurrencySync, detectUserCurrencyAsync } from "../lib/currencyDetector";

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
}) {
  const [currency, setCurrency] = useState(() => detectUserCurrencySync());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showExitWarning, setShowExitWarning] = useState(false);

  // Auto-detect user region & currency in background
  useEffect(() => {
    detectUserCurrencyAsync().then((detected) => {
      if (detected) setCurrency(detected);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowExitWarning(false);
    }
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

  const offer = getCurrentMonthOffer(null, currency);
  const pricing = offer.pricing || offer.inr;

  const handleInitiatePayment = async () => {
    setErrorMsg("");
    setLoading(true);

    try {
      // 1. Ensure Razorpay SDK is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay payment window. Please check your internet connection.");
      }

      // 2. Create server-side order with auto-detected currency
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.orderId) {
        throw new Error(orderData.error || "Failed to create payment order.");
      }

      // Track InitiateCheckout in Meta Pixel
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        try {
          window.fbq("track", "InitiateCheckout", {
            value: pricing.current,
            currency: currency,
            content_name: `${offer.month} Offer: Celebration Page`,
          });
        } catch (e) {}
      }

      // 3. Configure Razorpay Standard Checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Magic Moments",
        description: `${offer.month} Offer: ${pagePayload.name || "Celebration"} Page`,
        order_id: orderData.orderId,
        prefill: {
          name: pagePayload.name || "",
        },
        theme: {
          color: "#d95775",
        },
        handler: async function (response) {
          // 4. Payment completed by customer -> verify cryptographic signature on backend
          try {
            setLoading(true);
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                pagePayload,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.slug) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            // Track Purchase in Meta Pixel
            if (typeof window !== "undefined" && typeof window.fbq === "function") {
              try {
                window.fbq("track", "Purchase", {
                  value: pricing.current,
                  currency: currency,
                  content_name: `${offer.month} Offer: Celebration Page`,
                });
              } catch (e) {}
            }

            // 5. Celebration is verified & saved! Trigger success callback
            onPaymentSuccess({ slug: verifyData.slug });
          } catch (err) {
            console.error("Verification error:", err);
            setErrorMsg(err.message || "Payment completed but verification failed. Please contact support.");
            setLoading(false);
          }
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

  const handleCancelExit = () => {
    setShowExitWarning(false);
  };

  const handleConfirmExit = () => {
    setShowExitWarning(false);
    onClose();
  };

  const personName = pagePayload?.name?.trim() || "";
  const titleName = personName ? `${personName}’s` : "Their";

  return (
    <>
      <div className="checkout-modal-overlay" onClick={handleAttemptClose} role="dialog" aria-modal="true">
        <div className="checkout-modal-card" onClick={(e) => e.stopPropagation()}>
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
            <h2 className="checkout-title">Unlock {pagePayload.name || "Their"} Celebration</h2>
            <p className="checkout-sub">
              Publish this interactive celebration page and receive your official shareable link.
            </p>
          </div>

          {/* Dynamic Month Paper Coupon with auto-detected currency & seasonal quote */}
          <PaperOfferCoupon
            currency={currency}
          />

          {/* Feature Highlights (without any lifetime reference) */}
          <ul className="checkout-features-list">
            <li>
              <span className="feature-check">✓</span>
              <span><strong>Private &amp; Secure:</strong> 100% ad-free, personalized interactive surprise.</span>
            </li>
            <li>
              <span className="feature-check">✓</span>
              <span><strong>Interactive Magic:</strong> Candle blowing, star fireworks, 7-photo carousel &amp; song.</span>
            </li>
            <li>
              <span className="feature-check">✓</span>
              <span><strong>1-Click WhatsApp Share:</strong> Pre-filled surprise greeting message ready to send.</span>
            </li>
          </ul>

          {errorMsg && (
            <div className="checkout-error-pill" role="alert">
              <span>⚠️ {errorMsg}</span>
            </div>
          )}

          {/* CTA Button */}
          <div className="checkout-actions">
            <button
              type="button"
              className="checkout-pay-btn"
              onClick={handleInitiatePayment}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="checkout-spinner" />
                  <span>Opening Secure Checkout...</span>
                </>
              ) : (
                <>
                  <span>Pay {pricing.displayPrice} &amp; Unlock Official Link</span>
                  <span className="pay-arrow">→</span>
                </>
              )}
            </button>

            <div className="checkout-trust-badge">
              <span>🔒 Secured by Razorpay</span>
              <span>•</span>
              <span>{currency === "INR" ? "UPI, GPay, PhonePe & Cards" : "Cards, NetBanking & Digital Wallets"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Retention / Exit Intent Notification Box / Bottom Sheet */}
      {showExitWarning && (
        <div
          className="checkout-exit-overlay"
          onClick={handleCancelExit}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm exit"
        >
          <div
            className="checkout-exit-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="exit-warning-emoji" aria-hidden="true">
              🥺
            </div>

            <h3 className="exit-warning-title">
              Wait — {titleName} surprise isn’t saved yet
            </h3>

            <p className="exit-warning-sub">
              The cake, the balloons, your letter — everything you just made lives
              only on this screen right now. One step secures it forever.
            </p>

            <div className="exit-warning-actions">
              <button
                type="button"
                className="exit-warning-btn-primary"
                onClick={handleCancelExit}
              >
                Finish the surprise 💛
              </button>

              <button
                type="button"
                className="exit-warning-btn-secondary"
                onClick={handleConfirmExit}
              >
                I’ll let it go
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
