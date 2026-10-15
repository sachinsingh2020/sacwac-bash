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

function loadGoogleScript() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.google?.accounts?.id) return resolve(true);

    let script = document.getElementById("google-gsi-client");
    if (!script) {
      script = document.createElement("script");
      script.id = "google-gsi-client";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    if (window.google?.accounts?.id) return resolve(true);

    const onReady = () => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          resolve(true);
        } else if (attempts > 30) {
          clearInterval(interval);
          resolve(false);
        }
      }, 50);
    };

    script.addEventListener("load", onReady, { once: true });
    script.addEventListener("error", () => resolve(false), { once: true });

    // Fallback polling in case the script tag already fired load
    let pollCount = 0;
    const pollInterval = setInterval(() => {
      pollCount++;
      if (window.google?.accounts?.id) {
        clearInterval(pollInterval);
        resolve(true);
      } else if (pollCount > 60) {
        clearInterval(pollInterval);
        resolve(false);
      }
    }, 100);
  });
}

export default function RazorpayCheckoutModal({
  isOpen,
  onClose,
  pagePayload,
  onPaymentSuccess,
  templateId = "",
}) {
  const [currency, setCurrency] = useState(() => detectUserCurrencySync());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showExitWarning, setShowExitWarning] = useState(false);

  // User Auth & Tier State
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [googleBtnLoaded, setGoogleBtnLoaded] = useState(false);
  const [selectedTier, setSelectedTier] = useState("login"); // "login" (₹49) or "guest" (₹199)

  // Email OTP Login Modal / Form State
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");

  // Check existing session
  useEffect(() => {
    if (!isOpen) return;
    setCheckingAuth(true);
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.authenticated && data.user) {
          setUser(data.user);
          setSelectedTier("login");
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false));
  }, [isOpen]);

  // Load Google Identity Services SDK
  useEffect(() => {
    if (!isOpen || user || showEmailAuth) {
      setGoogleBtnLoaded(false);
      return;
    }

    let isCancelled = false;
    setGoogleBtnLoaded(false);

    loadGoogleScript().then((loaded) => {
      if (isCancelled) return;
      if (loaded && window.google?.accounts?.id) {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "591096592690-3cn1g4fpj1sqcehhnuh2rm4spuilfaro.apps.googleusercontent.com";
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render button if container exists
          const renderBtn = () => {
            if (isCancelled) return;
            const btnContainer = document.getElementById("google-signin-btn-container");
            if (btnContainer && window.google?.accounts?.id) {
              btnContainer.innerHTML = "";
              window.google.accounts.id.renderButton(btnContainer, {
                theme: "outline",
                size: "large",
                shape: "pill",
                text: "continue_with",
                width: 250,
              });
              setGoogleBtnLoaded(true);
            }
          };

          renderBtn();
          const timer = setTimeout(renderBtn, 80);
          return () => clearTimeout(timer);
        } catch (gErr) {
          console.warn("Google initialization error:", gErr);
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, user, showEmailAuth]);

  // Handle Google Token Response
  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        throw new Error(data.error || "Google login failed.");
      }
      setUser(data.user);
      setSelectedTier("login");
      setShowEmailAuth(false);
    } catch (err) {
      setAuthError(err.message || "Failed to sign in with Google.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Send Email OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!emailInput.trim() || !emailInput.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccessMsg("");
    try {
      const res = await fetch("/api/auth/email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code.");
      setOtpSent(true);
      setAuthSuccessMsg("Verification code sent! Check your inbox.");
    } catch (err) {
      setAuthError(err.message || "Error sending code. Try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Verify Email OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otpInput.trim() || otpInput.trim().length !== 6) {
      setAuthError("Please enter the 6-digit code.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, code: otpInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) throw new Error(data.error || "Verification failed.");
      setUser(data.user);
      setSelectedTier("login");
      setShowEmailAuth(false);
      setOtpSent(false);
      setEmailInput("");
      setOtpInput("");
      if (templateId && pagePayload) {
        fetch("/api/templates/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId,
            formData: pagePayload,
            userEmail: data.user.email,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      setAuthError(err.message || "Invalid verification code.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Auto-detect user region & currency in background
  useEffect(() => {
    detectUserCurrencyAsync().then((detected) => {
      if (detected) setCurrency(detected);
    });
  }, []);

  // When checkout modal is open and user is logged in, attach their email to draft
  useEffect(() => {
    if (isOpen && user?.email && templateId && pagePayload) {
      fetch("/api/templates/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          formData: pagePayload,
          userEmail: user.email,
        }),
      }).catch(() => {});
    }
  }, [isOpen, user, templateId, pagePayload]);

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

  // Active price calculation
  const isLoginTier = selectedTier === "login";
  const activeAmountDisplay = isLoginTier ? "₹49" : (currency === "INR" ? "₹199" : pricing.displayPrice);

  const handleInitiatePayment = async () => {
    // If user selected login tier but isn't logged in yet, prompt them to log in
    if (isLoginTier && !user) {
      setErrorMsg("Please sign in with Google or Email to claim the ₹49 discounted rate, or choose 'Pay ₹199 without login'.");
      setShowEmailAuth(true);
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      // 1. Ensure Razorpay SDK is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay payment window. Please check your internet connection.");
      }

      // 2. Create server-side order with auto-detected currency and chosen tier
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, tier: selectedTier }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.orderId) {
        throw new Error(orderData.error || "Failed to create payment order.");
      }

      // Track InitiateCheckout in Meta Pixel
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        try {
          window.fbq("track", "InitiateCheckout", {
            value: isLoginTier ? 49 : 199,
            currency: "INR",
            content_name: `${offer.month} Offer: Celebration Page (${selectedTier})`,
          });
        } catch (e) {}
      }

      // 3. Configure Razorpay Standard Checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Magic Moments",
        description: `${offer.month} Special: ${pagePayload.name || "Celebration"} Page`,
        order_id: orderData.orderId,
        prefill: {
          name: pagePayload.name || "",
          email: user?.email || "",
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
                templateId,
                tier: selectedTier,
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
                  value: isLoginTier ? 49 : 199,
                  currency: "INR",
                  content_name: `Celebration Page: ${verifyData.slug}`,
                });
              } catch (e) {}
            }

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
              Choose your preferred option to publish this interactive celebration page and receive your official shareable link.
            </p>
          </div>

          {/* Pricing Tier Selector (199 without login vs 49 with login) */}
          <div className="pricing-tier-container" style={{ margin: "16px 0 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {/* Option A: Pay ₹49 with Login (Recommended) */}
              <div
                onClick={() => setSelectedTier("login")}
                style={{
                  border: selectedTier === "login" ? "2px solid #d95775" : "1.5px solid #ebd8dc",
                  background: selectedTier === "login" ? "#fff5f7" : "#ffffff",
                  borderRadius: "16px",
                  padding: "16px 14px",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.2s ease",
                  boxShadow: selectedTier === "login" ? "0 6px 18px rgba(217, 87, 117, 0.15)" : "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "-10px",
                    right: "12px",
                    background: "#d95775",
                    color: "#fff",
                    fontSize: "9.5px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "10px",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  SAVE ₹150 🔥
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <input
                    type="radio"
                    name="pricingTier"
                    checked={selectedTier === "login"}
                    onChange={() => setSelectedTier("login")}
                    style={{ accentColor: "#d95775", margin: 0, width: "16px", height: "16px" }}
                  />
                  <strong style={{ fontSize: "14px", color: "#361b24" }}>With Login</strong>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", margin: "6px 0 4px" }}>
                  <span style={{ fontSize: "24px", fontWeight: 800, color: "#d95775" }}>₹49</span>
                  <span style={{ fontSize: "13px", textDecoration: "line-through", color: "#a0858e" }}>₹199</span>
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: "#785863", lineHeight: 1.35 }}>
                  {user ? `Signed in as ${user.name || user.email}` : "Sign in with Google / Email to unlock ₹49"}
                </p>
              </div>

              {/* Option B: Pay ₹199 continue without login */}
              <div
                onClick={() => setSelectedTier("guest")}
                style={{
                  border: selectedTier === "guest" ? "2px solid #d95775" : "1.5px solid #ebd8dc",
                  background: selectedTier === "guest" ? "#fff5f7" : "#ffffff",
                  borderRadius: "16px",
                  padding: "16px 14px",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.2s ease",
                  boxShadow: selectedTier === "guest" ? "0 6px 18px rgba(217, 87, 117, 0.15)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <input
                    type="radio"
                    name="pricingTier"
                    checked={selectedTier === "guest"}
                    onChange={() => setSelectedTier("guest")}
                    style={{ accentColor: "#d95775", margin: 0, width: "16px", height: "16px" }}
                  />
                  <strong style={{ fontSize: "14px", color: "#361b24" }}>Without Login</strong>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", margin: "6px 0 4px" }}>
                  <span style={{ fontSize: "24px", fontWeight: 800, color: "#361b24" }}>₹199</span>
                  <span style={{ fontSize: "13px", color: "#a0858e" }}>Standard</span>
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: "#785863", lineHeight: 1.35 }}>
                  Instant checkout, no login or account creation needed.
                </p>
              </div>
            </div>
          </div>

          {/* User Sign-In Box if "login" tier is selected but user is NOT logged in */}
          {isLoginTier && !user && (
            <div
              style={{
                background: "#fffafb",
                border: "1.5px dashed #f5a9bc",
                borderRadius: "16px",
                padding: "16px 18px",
                marginBottom: "18px",
                textAlign: "center",
              }}
            >
              <strong style={{ display: "block", color: "#542533", fontSize: "13.5px", marginBottom: "6px" }}>
                Sign in to activate your ₹49 member discount:
              </strong>

              {/* Google One-Tap / Standard Button Container with Circle Loader */}
              <div
                style={{
                  position: "relative",
                  minHeight: "44px",
                  margin: "12px 0 10px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {!googleBtnLoaded && (
                  <div className="google-btn-loading-placeholder" role="status" aria-label="Loading Google Sign-In">
                    <div className="google-spinner-circle" />
                    <span>Loading Google Sign-In...</span>
                  </div>
                )}

                <div
                  id="google-signin-btn-container"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "42px",
                    width: "100%",
                    visibility: googleBtnLoaded ? "visible" : "hidden",
                    position: googleBtnLoaded ? "static" : "absolute",
                    opacity: googleBtnLoaded ? 1 : 0,
                    transition: "opacity 0.25s ease",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
                <span style={{ flex: 1, height: "1px", background: "#f0d5db" }} />
                <span style={{ fontSize: "11px", color: "#92747e", textTransform: "uppercase" }}>or with email OTP</span>
                <span style={{ flex: 1, height: "1px", background: "#f0d5db" }} />
              </div>

              {!showEmailAuth ? (
                <button
                  type="button"
                  onClick={() => setShowEmailAuth(true)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #d95775",
                    color: "#d95775",
                    borderRadius: "20px",
                    padding: "8px 18px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ✉️ Sign In with Email OTP
                </button>
              ) : (
                <div style={{ marginTop: "10px", textAlign: "left" }}>
                  {!otpSent ? (
                    <form onSubmit={handleSendOtp} style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="email"
                        placeholder="Enter your email address"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        disabled={authLoading}
                        style={{
                          flex: 1,
                          padding: "9px 12px",
                          borderRadius: "10px",
                          border: "1px solid #ebd3d8",
                          fontSize: "13px",
                          margin: 0,
                        }}
                      />
                      <button
                        type="submit"
                        disabled={authLoading}
                        style={{
                          background: "#d95775",
                          color: "#fff",
                          border: "none",
                          borderRadius: "10px",
                          padding: "9px 16px",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {authLoading ? "Sending..." : "Send OTP"}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="6-digit code"
                        maxLength={6}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        disabled={authLoading}
                        style={{
                          width: "120px",
                          textAlign: "center",
                          letterSpacing: "4px",
                          fontWeight: 700,
                          padding: "9px 12px",
                          borderRadius: "10px",
                          border: "1px solid #ebd3d8",
                          fontSize: "14px",
                          margin: 0,
                        }}
                      />
                      <button
                        type="submit"
                        disabled={authLoading}
                        style={{
                          background: "#d95775",
                          color: "#fff",
                          border: "none",
                          borderRadius: "10px",
                          padding: "9px 16px",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {authLoading ? "Verifying..." : "Verify & Unlock ₹49"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#886571",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Resend
                      </button>
                    </form>
                  )}
                  {authError && (
                    <div style={{ color: "#e11d48", fontSize: "12px", marginTop: "6px" }}>⚠️ {authError}</div>
                  )}
                  {authSuccessMsg && (
                    <div style={{ color: "#16a34a", fontSize: "12px", marginTop: "6px" }}>✓ {authSuccessMsg}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Logged in success badge */}
          {user && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "8px 14px",
                borderRadius: "12px",
                marginBottom: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>👤</span>
                <span style={{ fontSize: "12.5px", color: "#166534" }}>
                  Signed in as <strong>{user.name || user.email}</strong> (₹49 unlocked)
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/me", { method: "POST" });
                  setUser(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#dc2626",
                  fontSize: "11px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Log out
              </button>
            </div>
          )}

          {/* Feature Highlights */}
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
                  <span>Pay {activeAmountDisplay} &amp; Unlock Official Link</span>
                  <span className="pay-arrow">→</span>
                </>
              )}
            </button>

            <div className="checkout-trust-badge">
              <span>🔒 Secured by Razorpay</span>
              <span>•</span>
              <span>UPI, GPay, PhonePe, Cards & NetBanking</span>
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
