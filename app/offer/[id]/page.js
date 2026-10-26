"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import BirthdayExperience from "../../../components/BirthdayExperience";
import "./offer.css";

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

function ExclusiveOfferContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = params?.id;
  const templateId = rawId ? decodeURIComponent(rawId) : "";

  // Determine price from query parameter (?price=29 or ?price=39)
  const priceParam = searchParams.get("price");
  const price = priceParam === "29" ? 29 : 39;
  const is29 = price === 29;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [template, setTemplate] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [publishedSlug, setPublishedSlug] = useState("");
  const [showPurchaseCelebration, setShowPurchaseCelebration] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch template data
  useEffect(() => {
    if (!templateId) return;

    let isMounted = true;
    setLoading(true);
    setError("");

    fetch(`/api/offer?id=${encodeURIComponent(templateId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Unable to load offer details.");
        }
        return data;
      })
      .then((data) => {
        if (!isMounted) return;
        setTemplate(data);
        if (data.isConverted && data.liveSlug) {
          setPublishedSlug(data.liveSlug);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load offer details.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [templateId]);

  // Construct preview data for BirthdayExperience
  const previewData = useMemo(() => {
    if (!template) return null;
    const f = template.formData || template;
    return {
      name: f.name?.trim() || "Sunena",
      nickname: f.nickname?.trim() || f.name?.trim() || "Sunny",
      sender: f.sender?.trim() || "",
      dob: f.dob || "",
      age: f.age ? f.age.toString().trim() : "",
      date: f.dob || f.date || new Date().toISOString().split("T")[0],
      message:
        f.message?.trim() ||
        "You make ordinary days feel like tiny celebrations. Today, the whole world gets to celebrate you.",
      reasons:
        Array.isArray(f.reasons) && f.reasons.filter(Boolean).length > 0
          ? f.reasons.filter(Boolean)
          : [
              "Your laugh is my favourite sound",
              "The world is kinder with you in it",
              "You make ordinary days magic",
            ],
      photo:
        f.photo ||
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85",
      gallery:
        Array.isArray(f.gallery) && f.gallery.length > 0
          ? f.gallery
          : [
              "photo-1516589178581-6cd7833ae3b2",
              "photo-1529156069898-49953e39b3ac",
              "photo-1506869640319-fe1a24fd76dc",
            ],
    };
  }, [template]);

  // Handle Buy Now (₹29 or ₹39)
  const handleBuyNow = async () => {
    if (purchasing || !template) return;
    setPurchaseError("");
    setPurchasing(true);

    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        throw new Error("Payment gateway could not be loaded. Please check your connection.");
      }

      const tier = is29 ? "offer29" : "offer39";

      // 1. Create order for exact price
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: "INR",
          tier,
          offerPrice: price,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.orderId) {
        throw new Error(orderData.error || "Failed to initiate payment order.");
      }

      // Track InitiateCheckout in Meta Pixel
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        try {
          const initPrice = Number(Number(price || 29).toFixed(2));
          window.fbq("track", "InitiateCheckout", {
            value: initPrice,
            currency: "INR",
            content_type: "product",
            content_name: `Discount Offer: Celebration Page (₹${price})`,
            content_ids: ["celebration_offer_page"],
            num_items: 1,
          });
        } catch (e) {}
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Magic Moments",
        description: is29
          ? `Final Offer: Celebration Page (₹29)`
          : `Special Offer: Celebration Page (₹39)`,
        order_id: orderData.orderId,
        prefill: {
          name: template?.formData?.name || "",
          email: template?.userEmail || "",
        },
        theme: {
          color: "#d95775",
        },
        handler: async function (response) {
          try {
            setPurchasing(true);
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                pagePayload: template.formData,
                templateId: template.templateId,
                tier,
                userEmail: template.userEmail,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.slug) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            // Track Purchase in Meta Pixel
            if (typeof window !== "undefined" && typeof window.fbq === "function") {
              try {
                const finalPrice = Number(Number(price || 29).toFixed(2));
                window.fbq("track", "Purchase", {
                  value: finalPrice,
                  currency: "INR",
                  content_type: "product",
                  content_name: `Celebration Page: ${verifyData.slug}`,
                  content_ids: [verifyData.slug || "celebration_page"],
                  num_items: 1,
                }, { eventID: response.razorpay_payment_id });
              } catch (e) {}
            }

            setIsPreviewOpen(false);
            setShowPurchaseCelebration(true);
            setPublishedSlug(verifyData.slug);
          } catch (err) {
            console.error("Verification error:", err);
            setPurchaseError(err.message || "Payment completed but verification failed. Please contact support.");
          } finally {
            setPurchasing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPurchasing(false);
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        setPurchaseError(response.error?.description || "Payment failed. Please try again.");
        setPurchasing(false);
      });

      razorpayInstance.open();
    } catch (err) {
      console.error("Checkout initiation error:", err);
      setPurchaseError(err.message || "Failed to initiate payment. Please try again.");
      setPurchasing(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined" || !publishedSlug) return;
    const fullUrl = `${window.location.origin}/${publishedSlug}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const celebrantName = (template?.formData?.name || template?.name || "Someone Special").trim();
  const celebrantPhoto = template?.formData?.photo || template?.photo;
  const liveUrl = typeof window !== "undefined" && publishedSlug ? `${window.location.origin}/${publishedSlug}` : `/${publishedSlug}`;

  return (
    <main className="offer-page">
      <div className="offer-ambient-glow" />

      {/* Header */}
      <header className="offer-header">
        <Link href="/" className="offer-brand">
          <span>✨</span>
          <span>Magic Moments Celebration</span>
        </Link>
      </header>

      {/* Main Container Card */}
      <div className="offer-card">
        {loading ? (
          <div className="offer-loader-box">
            <div className="offer-circle-spinner" />
            <p style={{ margin: 0, fontWeight: 700, color: "#8c3b52", fontSize: "15px" }}>
              Loading your celebration offer...
            </p>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "40px 10px" }}>
            <div style={{ fontSize: "42px", marginBottom: "12px" }}>⚠️</div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#b91c1c", margin: "0 0 10px" }}>
              Offer Not Found
            </h2>
            <p style={{ color: "#78505e", fontSize: "14px", marginBottom: "22px" }}>
              {error}
            </p>
            <Link
              href="/create"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                borderRadius: "999px",
                background: "#d95775",
                color: "#fff",
                fontWeight: 700,
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Create a New Celebration
            </Link>
          </div>
        ) : publishedSlug ? (
          showPurchaseCelebration ? (
            <div className="offer-success-box purchase-celebration-card">
              <span className="purchase-celebration-icons">🎉🎂💖</span>
              <div className="purchase-celebration-badge-pill">
                ✓ Payment Successful &amp; Activated
              </div>
              <h2 className="purchase-celebration-title">
                You have successfully bought a birthday wish for your loved one!
              </h2>
              <p className="purchase-celebration-desc">
                Your personalized interactive celebration surprise for <strong>{celebrantName || "someone special"}</strong> is now officially unlocked and ready to bring them tears of joy.
              </p>

              <div className="purchase-celebration-info-box">
                <div className="purchase-info-row">
                  <span className="purchase-info-icon">🎁</span>
                  <span><strong>Celebrant:</strong> {celebrantName || "Someone Special"}</span>
                </div>
                <div className="purchase-info-row">
                  <span className="purchase-info-icon">✨</span>
                  <span><strong>Includes:</strong> Interactive cake, music, photo gallery, heartfelt letter &amp; wishes</span>
                </div>
                <div className="purchase-info-row">
                  <span className="purchase-info-icon">🔒</span>
                  <span><strong>Access:</strong> Permanent link with lifetime access</span>
                </div>
              </div>

              <button
                type="button"
                className="purchase-celebration-next-btn"
                onClick={() => {
                  setShowPurchaseCelebration(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <span>Get Celebration Link</span>
                <span>✨</span>
              </button>
            </div>
          ) : (
          /* SUCCESS STATE: Already published celebration */
          <div className="offer-success-box">
            <span className="offer-success-trophy">🎉</span>
            <div className={`offer-badge-pill ${is29 ? "price-29" : "price-39"}`}>
              {is29 ? "✨ ₹29 Final Offer Claimed!" : "✨ ₹39 Special Offer Claimed!"}
            </div>
            <h2 className="offer-title">
              {celebrantName}’s Celebration is Live!
            </h2>
            <p className="offer-sub" style={{ marginBottom: "16px" }}>
              Your interactive birthday experience has been successfully published and is ready to be shared.
            </p>

            <div className="offer-share-input-box">
              <input
                type="text"
                readOnly
                value={liveUrl}
                className="offer-share-input"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="btn-offer-copy"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>

            <div className="offer-success-actions">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Happy Birthday ${celebrantName}! 🎂 Open this special interactive celebration created just for you: ${liveUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-offer-whatsapp"
              >
                <span>📲</span>
                <span>Share with {celebrantName} on WhatsApp</span>
              </a>

              <Link
                href={`/${publishedSlug}`}
                className="btn-offer-open-live"
              >
                <span>👀</span>
                <span>View Live Celebration Page</span>
              </Link>
            </div>
          </div>
          )
        ) : (
          /* OFFER DETAILS & ACTIONS */
          <>
            {/* Offer Pill */}
            <div className={`offer-badge-pill ${is29 ? "price-29" : "price-39"}`}>
              {is29 ? "🔥 FINAL HEARTFELT OFFER • ONLY ₹29" : "💌 HANDCRAFTED WITH LOVE • SPECIAL ₹39 OFFER"}
            </div>

            <h1 className="offer-title">
              {is29
                ? `Don’t Let ${celebrantName}’s Moment Slip Away`
                : `Make ${celebrantName} Feel Truly Cherished`}
            </h1>

            <p className="offer-sub">
              {is29 ? (
                <>
                  You poured love and beautiful memories into creating this surprise for <strong>{celebrantName}</strong>.
                  True feelings should never be held back by price — as our <strong>final lowest offer</strong>, unlock their full celebration forever in just <strong>₹29</strong>!
                </>
              ) : (
                <>
                  You took the time to craft something deeply special for <strong>{celebrantName}</strong>.
                  Birthdays come once a year, but knowing they are loved lasts a lifetime. This exclusive offer is just for you — bring their celebration to life in just <strong>₹39</strong>!
                </>
              )}
            </p>

            {/* Pricing Box */}
            <div className="offer-price-box">
              <span className="offer-price-label">
                {is29 ? "Exclusive Final Price" : "Exclusive Creator Price"}
              </span>
              <div className="offer-price-numbers">
                <span className={`offer-price-current ${is29 ? "is-29" : ""}`}>
                  ₹{price}
                </span>
                <span className="offer-price-old">₹199</span>
                <span className="offer-price-savings">
                  {is29 ? "85% OFF • SAVE ₹170" : "80% OFF • SAVE ₹160"}
                </span>
              </div>
              {template?.userEmail && (
                <span className="offer-user-email-tag">
                  Reserved for <strong>{template.userEmail}</strong>
                </span>
              )}
            </div>

            {/* Celebrant Profile Box */}
            <div className="offer-profile-card">
              {celebrantPhoto ? (
                <img
                  src={celebrantPhoto}
                  alt={celebrantName}
                  className="offer-profile-avatar"
                />
              ) : (
                <div className="offer-profile-monogram">
                  {celebrantName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="offer-profile-info">
                <h3 className="offer-profile-name">{celebrantName}</h3>
                <span className="offer-profile-date">
                  {template?.formData?.dob ? `Birthday: ${template.formData.dob}` : "Custom Interactive Template"}
                </span>
                <div className="offer-profile-badges">
                  <span className="offer-profile-badge-item">🎂 Interactive Cake</span>
                  <span className="offer-profile-badge-item">📸 7-Photo Carousel</span>
                  <span className="offer-profile-badge-item">🎵 Song & Letter</span>
                </div>
              </div>
            </div>

            {/* Error Message if any */}
            {purchaseError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  marginBottom: "16px",
                  textAlign: "center",
                }}
              >
                {purchaseError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="offer-actions-group">
              {/* Preview Button */}
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="btn-offer-preview"
              >
                <span>👀</span>
                <span>Preview Full Celebration</span>
              </button>

              {/* Buy Now Button */}
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={purchasing}
                className="btn-offer-buy"
              >
                {purchasing ? (
                  <>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        border: "2px solid #ffffff",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spinOffer 0.8s linear infinite",
                      }}
                    />
                    <span>Connecting Secure Razorpay...</span>
                  </>
                ) : (
                  <>
                    <span>{is29 ? "💖" : "✨"}</span>
                    <span>{is29 ? `Unlock ${celebrantName}’s Celebration in ₹29` : `Make ${celebrantName} Smile for Just ₹39`}</span>
                  </>
                )}
              </button>
            </div>

            {/* Included Features */}
            <ul className="offer-features-list">
              <li>
                <span className="offer-feature-check">✓</span>
                <span>Complete custom interactive celebration experience</span>
              </li>
              <li>
                <span className="offer-feature-check">✓</span>
                <span>Candle blowing, fireworks & romantic envelope open</span>
              </li>
              <li>
                <span className="offer-feature-check">✓</span>
                <span>Lifetime shareable link with WhatsApp one-click sharing</span>
              </li>
              <li>
                <span className="offer-feature-check">✓</span>
                <span>Instant activation with 100% secure Razorpay checkout</span>
              </li>
            </ul>
          </>
        )}
      </div>

      {/* Fullscreen Interactive Preview Portal */}
      {isPreviewOpen && previewData && (
        <div className="offer-preview-portal">
          <header className="offer-preview-header-bar">
            <div className="offer-preview-bar-inner">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="btn-offer-exit-preview"
                aria-label="Exit preview mode"
              >
                <span className="offer-btn-back-arrow">←</span>
                <span className="offer-btn-back-text">Exit Preview</span>
              </button>

              <div className="offer-preview-center-badge">
                <span className="offer-preview-live-dot" />
                <span className="offer-preview-badge-name">{celebrantName}’s Preview</span>
              </div>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={purchasing}
                className="btn-offer-buy-mini"
                aria-label={`Buy celebration now for ₹${price}`}
              >
                <span>⚡</span>
                <span>Buy for <strong>₹{price}</strong></span>
              </button>
            </div>
          </header>

          <BirthdayExperience
            isPreview={true}
            isOfferPreview={true}
            offerPrice={price}
            previewData={previewData}
            onExitPreview={() => setIsPreviewOpen(false)}
            onPublish={handleBuyNow}
            isPublishing={purchasing}
          />
        </div>
      )}
    </main>
  );
}

export default function ExclusiveOfferPage() {
  return (
    <Suspense
      fallback={
        <main className="offer-page">
          <div className="offer-card">
            <div className="offer-loader-box">
              <div className="offer-circle-spinner" />
              <p style={{ margin: 0, fontWeight: 700, color: "#8c3b52", fontSize: "15px" }}>
                Loading your celebration offer...
              </p>
            </div>
          </div>
        </main>
      }
    >
      <ExclusiveOfferContent />
    </Suspense>
  );
}
