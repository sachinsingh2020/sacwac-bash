"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { compressImage } from "../../lib/compressImage";
import ImageCropperModal from "./ImageCropperModal";
import BirthdayExperience from "../../components/BirthdayExperience";
import RazorpayCheckoutModal from "../../components/RazorpayCheckoutModal";
import { getBirthdayTargetInfo } from "../../lib/birthdayCountdown";
import "./wizard.css";

const SAMPLE_MESSAGES = [
  {
    title: "✨ Heartfelt & Warm",
    text: "Happy Birthday to the one who makes ordinary days feel like tiny celebrations. Your laughter has a way of turning dark clouds into sunshine, and your kindness makes the whole world a softer, sweeter place. Today, I just want you to know how deeply you are loved, how much you inspire me, and how grateful I am to share life's adventures with you. May all your dreams take flight this year! 💖",
  },
  {
    title: "😂 Playful & Bestie",
    text: "Happy Birthday to my favorite human! Another year wiser, cooler, and somehow even more ridiculous. Thank you for all the late-night talks, the endless belly laughs over things only we understand, and for always being the one person I can be 100% myself with. The world is a whole lot brighter with you in it. Let's make this year our most legendary chapter yet! 🎂🎉",
  },
  {
    title: "🌹 Deep & Romantic",
    text: "To the love of my life on your special day: you are my home, my anchor, and my happiest thought. Every single day with you is a gift I never take for granted. Thank you for loving me so patiently, for believing in me even when I doubted myself, and for filling my heart with peace. Happy Birthday, my whole heart. Today and every day, I celebrate you. 💕",
  },
  {
    title: "🌟 Inspiring & Sweet",
    text: "Happy Birthday! You have a rare and beautiful gift of making everyone around you feel seen, valued, and special. As you step into this new year of life, I hope you see yourself through the eyes of those who love you — brave, radiant, and capable of achieving anything your heart desires. Here's to good health, boundless joy, and answered prayers! ✨",
  },
];

// Exactly 8 curated reason options
const REASON_OPTIONS = [
  "Your laugh is genuinely my favorite sound in the world.",
  "You always choose kindness and empathy first.",
  "You make even the simplest days feel like magic.",
  "You believed in me when I couldn't believe in myself.",
  "The way your eyes light up when you talk about your passions.",
  "You remember the little things that everyone else forgets.",
  "You bring instant warmth and calm wherever you go.",
  "You are unapologetically, wonderfully, beautifully yourself.",
];

function calculateAge(dobStr) {
  if (!dobStr) return "";
  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age.toString() : "";
}

function getWordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const STORAGE_KEY = "birthday_bash_create_draft";

export default function BirthdayCreateWizard() {
  const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [isHydrated, setIsHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [reasonWarning, setReasonWarning] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasSeenPreview, setHasSeenPreview] = useState(false);

  // Portrait Cropper Modal State
  const [rawPortraitForCrop, setRawPortraitForCrop] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    dob: "",
    age: "",
    message: "",
    reasons: ["", "", "", "", ""],
    photo: "",
    photoPublicId: "",
    gallery: [],
    galleryPublicIds: [],
  });

  const portraitInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Helper to advance or switch steps while tracking highest step reached
  const changeStep = (newStep) => {
    setStep(newStep);
    setMaxStepReached((prev) => Math.max(prev, newStep));
  };

  // Restore draft from localStorage on initial client load (prevents SSR hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          if (parsed.formData && typeof parsed.formData === "object") {
            setFormData((prev) => ({
              ...prev,
              name: typeof parsed.formData.name === "string" ? parsed.formData.name : prev.name,
              nickname: typeof parsed.formData.nickname === "string" ? parsed.formData.nickname : prev.nickname,
              dob: typeof parsed.formData.dob === "string" ? parsed.formData.dob : prev.dob,
              age: typeof parsed.formData.age === "string" ? parsed.formData.age : prev.age,
              message: typeof parsed.formData.message === "string" ? parsed.formData.message : prev.message,
              reasons:
                Array.isArray(parsed.formData.reasons) && parsed.formData.reasons.length === 5
                  ? parsed.formData.reasons
                  : prev.reasons,
              photo: typeof parsed.formData.photo === "string" ? parsed.formData.photo : prev.photo,
              photoPublicId:
                typeof parsed.formData.photoPublicId === "string"
                  ? parsed.formData.photoPublicId
                  : prev.photoPublicId,
              gallery: Array.isArray(parsed.formData.gallery) ? parsed.formData.gallery : prev.gallery,
              galleryPublicIds: Array.isArray(parsed.formData.galleryPublicIds)
                ? parsed.formData.galleryPublicIds
                : prev.galleryPublicIds,
            }));
          }

          if (parsed.createdSlug && typeof parsed.createdSlug === "string") {
            setCreatedSlug(parsed.createdSlug);
            if (parsed.step === 6) {
              setStep(6);
            }
          }

          const savedStep = typeof parsed.step === "number" ? parsed.step : 1;
          const restoredStep = savedStep === 6 && !parsed.createdSlug ? 5 : savedStep;
          if (restoredStep >= 1 && restoredStep <= 6) {
            setStep(restoredStep);
          }

          const savedMax =
            typeof parsed.maxStepReached === "number" ? parsed.maxStepReached : restoredStep;
          setMaxStepReached(Math.max(savedMax, restoredStep, 1));

          if (typeof parsed.hasSeenPreview === "boolean") {
            setHasSeenPreview(parsed.hasSeenPreview);
          }
        }
      }
    } catch (err) {
      console.warn("Could not load draft from localStorage:", err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist entered data and step to localStorage whenever state changes
  useEffect(() => {
    if (!isHydrated) return; // Prevent overwriting stored draft during pre-hydration

    try {
      const dataToSave = {
        formData,
        step,
        maxStepReached,
        hasSeenPreview,
        createdSlug,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (err) {
      console.warn("Could not save draft to localStorage:", err);
    }
  }, [formData, step, maxStepReached, hasSeenPreview, createdSlug, isHydrated]);

  // Check if user has entered any custom data so far
  const hasDraftData = Boolean(
    formData.name.trim() ||
      formData.nickname.trim() ||
      formData.dob ||
      formData.age ||
      formData.message.trim() ||
      formData.reasons.some((r) => r.trim()) ||
      formData.photo ||
      formData.gallery.length > 0
  );

  // Clear entered data and restart wizard from Step 1
  const handleResetDraft = () => {
    if (
      typeof window !== "undefined" &&
      window.confirm("Are you sure you want to clear your entered details and start fresh?")
    ) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.warn("Failed to clear draft from localStorage:", err);
      }
      setStep(1);
      setMaxStepReached(1);
      setFormData({
        name: "",
        nickname: "",
        dob: "",
        age: "",
        message: "",
        reasons: ["", "", "", "", ""],
        photo: "",
        photoPublicId: "",
        gallery: [],
        galleryPublicIds: [],
      });
      setCreatedSlug("");
      setHasSeenPreview(false);
      setErrorMsg("");
      setReasonWarning("");
    }
  };

  // Handle DOB change with auto-age calculation
  const handleDobChange = (e) => {
    const val = e.target.value;
    const computedAge = calculateAge(val);
    setFormData((prev) => ({
      ...prev,
      dob: val,
      age: computedAge || prev.age,
    }));
  };

  // Step 3: Handle typing into any of the 5 blank reason fields
  const handleReasonInputChange = (index, value) => {
    setReasonWarning("");
    setFormData((prev) => {
      const next = [...prev.reasons];
      next[index] = value;
      return { ...prev, reasons: next };
    });
  };

  // Step 3: Clear a specific blank reason field
  const handleClearReasonField = (index) => {
    setReasonWarning("");
    setFormData((prev) => {
      const next = [...prev.reasons];
      next[index] = "";
      return { ...prev, reasons: next };
    });
  };

  // Step 3: Click to toggle one of the 8 curated reasons
  const handleToggleReason = (optionText) => {
    setReasonWarning("");
    const existingIndex = formData.reasons.findIndex(
      (r) => r.trim().toLowerCase() === optionText.trim().toLowerCase(),
    );

    if (existingIndex !== -1) {
      // Already present in one of the fields -> clear that field
      handleClearReasonField(existingIndex);
    } else {
      // Find the first empty field among the 5 slots
      const emptyIndex = formData.reasons.findIndex((r) => !r.trim());
      if (emptyIndex === -1) {
        setReasonWarning("Can't add more than 5 reasons! Clear one of the 5 fields above to add this.");
        return;
      }
      handleReasonInputChange(emptyIndex, optionText);
    }
  };

  // Step 4: Handle portrait file selection -> opens crop modal
  const handlePortraitFileSelect = (e) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setErrorMsg("");
    const reader = new FileReader();
    reader.onload = () => {
      setRawPortraitForCrop(reader.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(rawFile);
    if (portraitInputRef.current) portraitInputRef.current.value = "";
  };

  // Step 4: Crop complete -> compress & upload to Cloudinary
  const handleCropComplete = async (croppedBlob) => {
    setErrorMsg("");
    setLoading(true);
    setUploadStatus("Compressing and uploading cropped portrait... ☁️");

    try {
      const fileToUpload = await compressImage(croppedBlob, 500);
      const data = new FormData();
      data.append("file", fileToUpload, "portrait.jpg");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setFormData((prev) => ({
        ...prev,
        photo: result.url,
        photoPublicId: result.publicId || "",
      }));
      setShowCropModal(false);
      setRawPortraitForCrop(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to upload portrait.");
    } finally {
      setLoading(false);
      setUploadStatus("");
    }
  };

  // Upload multiple gallery images up to 7 (compressed if > 500KB)
  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const availableSlots = 7 - formData.gallery.length;
    if (availableSlots <= 0) {
      setErrorMsg("Maximum 7 gallery images allowed.");
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    setErrorMsg("");
    setLoading(true);

    const uploadedUrls = [];
    const uploadedIds = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadStatus(
          `Processing photo ${i + 1} of ${selectedFiles.length}...`,
        );

        const compressed = await compressImage(file, 500);
        const data = new FormData();
        data.append("file", compressed);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: data,
        });

        const result = await res.json();
        if (res.ok && result.url) {
          uploadedUrls.push(result.url);
          if (result.publicId) uploadedIds.push(result.publicId);
        }
      }

      setFormData((prev) => ({
        ...prev,
        gallery: [...prev.gallery, ...uploadedUrls].slice(0, 7),
        galleryPublicIds: [...prev.galleryPublicIds, ...uploadedIds].slice(0, 7),
      }));
    } catch (err) {
      console.error(err);
      setErrorMsg("Some images failed to upload. Please try again.");
    } finally {
      setLoading(false);
      setUploadStatus("");
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  // Remove gallery photo
  const handleRemoveGalleryPhoto = (index) => {
    setFormData((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index),
      galleryPublicIds: prev.galleryPublicIds.filter((_, i) => i !== index),
    }));
  };

  // Navigation validation
  const canGoNext = () => {
    if (step === 1) return formData.name.trim().length > 0;
    if (step === 2) {
      const words = getWordCount(formData.message);
      return words > 0 && words <= 300;
    }
    if (step === 3) {
      return formData.reasons.some((r) => r.trim().length > 0);
    }
    return true;
  };

  // Trigger in-page local preview (no database save, no public slug, URL hidden)
  const handleStartLocalPreview = () => {
    setErrorMsg("");
    setHasSeenPreview(true);
    setIsPreviewMode(true);
  };

  const cleanReasons = formData.reasons
    .map((r) => r.trim())
    .filter(Boolean);

  const finalName = formData.name.trim() || "Someone Special";
  const finalMessage =
    formData.message.trim() ||
    "Happy Birthday! You make ordinary days feel like tiny celebrations. Today, the whole world gets to celebrate you.";

  const checkoutPayload = {
    name: finalName,
    nickname: formData.nickname.trim() || finalName,
    dob: formData.dob || "",
    age: formData.age.trim() || "",
    date: formData.dob || new Date().toISOString().split("T")[0],
    message: finalMessage,
    reasons: cleanReasons.length > 0 ? cleanReasons : ["You are loved", "You make life brighter"],
    photo: formData.photo || "",
    photoPublicId: formData.photoPublicId || "",
    gallery: formData.gallery || [],
    galleryPublicIds: formData.galleryPublicIds || [],
  };

  // Open Razorpay Checkout modal
  const handleOpenCheckout = () => {
    setShowCheckoutModal(true);
  };

  // On successful Razorpay payment & backend verification
  const handlePaymentSuccess = ({ slug }) => {
    setCreatedSlug(slug);
    setShowCheckoutModal(false);
    setIsPreviewMode(false);
    changeStep(6);
  };

  // Copy shareable link
  const generatedLink =
    typeof window !== "undefined" && createdSlug
      ? `${window.location.origin}/${createdSlug}`
      : "";

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const currentWords = getWordCount(formData.message);

  return (
    <main className="wizard-page">
      <div className="wizard-ambient" />

      {/* Studio Mobile Device Preview Modal */}
      {isPreviewMode && (
        <div className="wizard-inpage-preview-portal" role="dialog" aria-modal="true">
          {/* Studio Top Control Bar */}
          <header className="preview-studio-header">
            <div className="preview-studio-left">
              <button
                type="button"
                className="preview-studio-btn-back"
                onClick={() => setIsPreviewMode(false)}
                title="Return to the editor"
              >
                ← Back to Edit
              </button>
            </div>

            <div className="preview-studio-center">
              <span className="preview-studio-device-badge">
                <span className="preview-badge-live-pulse" />
                📱 Mobile Screen Preview (What your recipient sees)
              </span>
            </div>

            <div className="preview-studio-right">
              <button
                type="button"
                className="preview-studio-btn-publish"
                onClick={handleOpenCheckout}
                disabled={loading}
                title="Unlock celebration and generate official link"
              >
                {loading ? "Unlocking... ✨" : "Unlock & Share Link 🚀"}
              </button>
            </div>
          </header>

          {/* Studio Stage with Realistic Inner Mobile Screen Mockup */}
          <div className="preview-studio-stage">
            <div className="preview-phone-device">
              {/* Phone Physical Elements */}
              <div className="preview-phone-island">
                <span className="preview-phone-camera" />
              </div>

              {/* Inner Mobile Screen Frame */}
              <div className="preview-phone-screen">
                <BirthdayExperience
                  isPreview={true}
                  previewData={{
                    name: formData.name.trim() || "Sunena",
                    nickname: formData.nickname.trim() || formData.name.trim() || "Sunny",
                    dob: formData.dob,
                    age: formData.age.trim() || "26",
                    date: formData.dob || new Date().toISOString().split("T")[0],
                    message:
                      formData.message.trim() ||
                      "You make ordinary days feel like tiny celebrations. Today, the whole world gets to celebrate you.",
                    reasons:
                      formData.reasons.map((r) => r.trim()).filter(Boolean).length > 0
                        ? formData.reasons.map((r) => r.trim()).filter(Boolean)
                        : [
                            "Your laugh is my favourite sound",
                            "The world is kinder with you in it",
                            "You make ordinary days magic",
                          ],
                    photo:
                      formData.photo ||
                      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85",
                    gallery:
                      formData.gallery.length > 0
                        ? formData.gallery
                        : [
                            "photo-1516589178581-6cd7833ae3b2",
                            "photo-1529156069898-49953e39b3ac",
                            "photo-1506869640319-fe1a24fd76dc",
                          ],
                  }}
                  onExitPreview={() => setIsPreviewMode(false)}
                  onPublish={handleOpenCheckout}
                  isPublishing={loading}
                  publishError={publishError}
                  onClearPublishError={() => setPublishError("")}
                />
              </div>

              {/* Bottom Home Indicator Bar */}
              <div className="preview-phone-home-bar" />
            </div>
          </div>
        </div>
      )}

      {/* Razorpay Secure Checkout Modal with Month Offer */}
      <RazorpayCheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        pagePayload={checkoutPayload}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Header */}
      <header className="wizard-header">
        <Link href="/" className="wizard-back-home" title="Back to Home">
          ← Back
        </Link>
        <div className="wizard-brand-tag">
          <span className="wizard-brand-full">✨ Magic Moments Creator</span>
          <span className="wizard-brand-short">✨ Magic Moments</span>
        </div>
        <div className="wizard-header-actions">
          {isHydrated && hasDraftData && step < 6 && (
            <>
              <span className="wizard-saved-pill" title="All your entered data is automatically saved!">
                ✓ Auto-Saved
              </span>
              <button
                type="button"
                className="wizard-reset-draft-btn"
                onClick={handleResetDraft}
                title="Clear all inputs and start over"
              >
                <span className="reset-draft-text-full">Clear Form ↺</span>
                <span className="reset-draft-text-short">Clear ↺</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Progress Stepper */}
      <div className="wizard-stepper">
        <div className="stepper-track">
          {[
            { num: 1, label: "Details" },
            { num: 2, label: "Message" },
            { num: 3, label: "5 Reasons" },
            { num: 4, label: "Portrait" },
            { num: 5, label: "Gallery" },
            { num: 6, label: "Preview" },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              className={`stepper-step ${step === s.num ? "active" : ""} ${step > s.num ? "completed" : ""}`}
              onClick={() => {
                if (step < 6 && (s.num <= maxStepReached || s.num < step)) {
                  changeStep(s.num);
                }
              }}
              disabled={step === 6 || (s.num > maxStepReached && s.num > step)}
            >
              <div className="step-circle">
                {step > s.num ? "✓" : s.num}
              </div>
              <span className="step-name">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Wizard Card Body */}
      <div className="wizard-card">
        {errorMsg && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: "#ffe4e6",
              color: "#e11d48",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "16px",
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* STEP 1: Basic Information */}
        {step === 1 && (
          <div className="wizard-step-content">
            <div className="wizard-title-box">
              <span className="wizard-step-tag">Step 1 of 5</span>
              <h2 className="wizard-main-title">Who are we celebrating?</h2>
              <p className="wizard-sub-title">
                Let&apos;s personalize their surprise with their name and age.
              </p>
            </div>

            <div className="wizard-field-group">
              <label className="wizard-label">
                Birthday Person&apos;s Name *
              </label>
              <input
                type="text"
                className="wizard-input"
                placeholder="e.g. Sunena, Rohit, Sneha"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                autoFocus
              />
            </div>

            <div className="wizard-field-group">
              <label className="wizard-label">Nickname / Sweet Name</label>
              <input
                type="text"
                className="wizard-input"
                placeholder="e.g. Sunny, Rancho, Chotu"
                value={formData.nickname}
                onChange={(e) =>
                  setFormData({ ...formData, nickname: e.target.value })
                }
              />
            </div>

            <div className="wizard-grid-2">
              <div className="wizard-field-group">
                <label className="wizard-label">Date of Birth</label>
                <input
                  type="date"
                  className="wizard-input"
                  value={formData.dob}
                  onChange={handleDobChange}
                />
              </div>

              <div className="wizard-field-group">
                <label className="wizard-label">
                  Age (Turning)
                  {formData.dob && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 400,
                        color: "#d95775",
                        marginLeft: "6px",
                      }}
                    >
                      (Auto-calculated)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className="wizard-input"
                  placeholder="e.g. 24"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Big Heartfelt Message */}
        {step === 2 && (
          <div className="wizard-step-content">
            <div className="wizard-title-box">
              <span className="wizard-step-tag">Step 2 of 5</span>
              <h2 className="wizard-main-title">Heartfelt Big Message</h2>
              <p className="wizard-sub-title">
                Write a personal letter that unfolds like a vintage typewriter
                note (Max 300 words).
              </p>
            </div>

            <div className="wizard-field-group">
              <div className="field-hint-row">
                <label className="wizard-label" style={{ margin: 0 }}>
                  Your Birthday Message *
                </label>
                <span
                  className={`word-counter ${currentWords > 300 ? "over-limit" : ""}`}
                >
                  {currentWords} / 300 words
                </span>
              </div>
              <textarea
                className="wizard-textarea"
                placeholder="Type your beautiful birthday letter here, or choose a sample below..."
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                rows={6}
              />
            </div>

            {/* Sample Messages */}
            <div className="sample-suggestions-box">
              <div className="sample-heading">
                <span>💡</span> Click a sample message to use:
              </div>
              <div className="sample-chips-wrap">
                {SAMPLE_MESSAGES.map((sample, idx) => (
                  <div
                    key={idx}
                    className="sample-message-card"
                    onClick={() =>
                      setFormData({ ...formData, message: sample.text })
                    }
                  >
                    <strong className="sample-card-title">{sample.title}</strong>
                    <span className="sample-card-snippet">
                      {sample.text.slice(0, 105)}...
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: 5 Reasons They Are Loved (5 Blank Fields + 8 Quick-Add Curated Options) */}
        {step === 3 && (
          <div className="wizard-step-content">
            <div className="wizard-title-box">
              <span className="wizard-step-tag">Step 3 of 5</span>
              <h2 className="wizard-main-title">5 Reasons They Are Loved</h2>
              <p className="wizard-sub-title">
                Write your personal reasons in the 5 blank fields below, or click any of the 8 curated options to quick-add!
              </p>
            </div>

            {/* Counter Bar with 5 visual dots */}
            <div className="reasons-counter-bar">
              <span className="reasons-counter-text">
                Filled: {formData.reasons.filter((r) => r.trim().length > 0).length} / 5 reasons
              </span>
              <div className="reasons-counter-dots">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <span
                    key={idx}
                    className={`reasons-counter-dot ${
                      formData.reasons[idx]?.trim() ? "filled" : ""
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Warning Message if user attempts to add more than 5 reasons */}
            {reasonWarning && (
              <div className="reasons-max-warning" role="alert">
                <span>⚠️</span>
                <span>{reasonWarning}</span>
              </div>
            )}

            {/* 5 Blank Input Fields for Custom Writing */}
            <div className="reasons-inputs-stack">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="wizard-field-group" style={{ marginBottom: "12px" }}>
                  <label className="wizard-label" style={{ fontSize: "12px", marginBottom: "4px" }}>
                    Reason #{i + 1} {i === 0 && <span style={{ color: "#d95775" }}>*</span>}
                  </label>
                  <div className="reason-field-row">
                    <input
                      type="text"
                      className="wizard-input"
                      placeholder={`e.g. ${REASON_OPTIONS[i] || "Write your reason here..."}`}
                      value={formData.reasons[i] || ""}
                      onChange={(e) => handleReasonInputChange(i, e.target.value)}
                    />
                    {formData.reasons[i]?.trim() && (
                      <button
                        type="button"
                        className="btn-clear-reason-field"
                        onClick={() => handleClearReasonField(i)}
                        title="Clear this reason"
                        aria-label="Clear reason"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 8 Curated Quick-Fill Option Cards */}
            <div className="sample-suggestions-box" style={{ marginTop: "18px" }}>
              <div className="sample-heading">
                <span>✨</span> Click any of these 8 curated reasons to quick-add:
              </div>
              <div className="reasons-options-grid">
                {REASON_OPTIONS.map((opt, idx) => {
                  const isSelected = formData.reasons.some(
                    (r) => r.trim().toLowerCase() === opt.trim().toLowerCase(),
                  );
                  return (
                    <div
                      key={idx}
                      className={`reason-option-box ${isSelected ? "selected" : ""}`}
                      onClick={() => handleToggleReason(opt)}
                    >
                      <span className="reason-option-text">{opt}</span>
                      <div className="reason-option-footer">
                        {isSelected ? (
                          <span className="reason-badge-added">✓ Added</span>
                        ) : (
                          <span className="reason-badge-add">+ Add</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Personal Portrait Photo (With Cropping) */}
        {step === 4 && (
          <div className="wizard-step-content">
            <div className="wizard-title-box">
              <span className="wizard-step-tag">Step 4 of 5</span>
              <h2 className="wizard-main-title">Portrait Photo</h2>
              <p className="wizard-sub-title">
                Upload and crop your loved one&apos;s photo to feature in their celebration envelope.
              </p>
            </div>

            <input
              ref={portraitInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePortraitFileSelect}
            />

            {formData.photo ? (
              <div className="portrait-preview-card">
                <img
                  src={formData.photo}
                  alt="Portrait preview"
                  className="portrait-img-circle"
                />
                <div className="portrait-details">
                  <span className="portrait-status">✓ Cropped portrait ready!</span>
                  <button
                    type="button"
                    className="btn-remove-photo"
                    onClick={() => portraitInputRef.current?.click()}
                  >
                    Change / Recrop Photo
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="upload-drop-zone"
                onClick={() => portraitInputRef.current?.click()}
              >
                <span className="upload-icon-big">📸</span>
                <span className="upload-text-main">
                  Click to choose & crop portrait photo
                </span>
                <span className="upload-text-sub">
                  You can zoom, reposition, and crop before uploading.
                </span>
              </div>
            )}

            {uploadStatus && (
              <div className="upload-loading-pill">
                <span className="spinner-mini" />
                <span>{uploadStatus}</span>
              </div>
            )}

            {/* Interactive Portrait Cropper Modal */}
            {showCropModal && rawPortraitForCrop && (
              <ImageCropperModal
                imageSrc={rawPortraitForCrop}
                onCancel={() => {
                  setShowCropModal(false);
                  setRawPortraitForCrop(null);
                }}
                onCropComplete={handleCropComplete}
                isProcessing={loading}
              />
            )}
          </div>
        )}

        {/* STEP 5: Photo Gallery (Up to 7 Images - Direct Upload, No Cropper) */}
        {step === 5 && (
          <div className="wizard-step-content">
            <div className="wizard-title-box">
              <span className="wizard-step-tag">Step 5 of 5</span>
              <h2 className="wizard-main-title">Memory Photo Gallery</h2>
              <p className="wizard-sub-title">
                Upload up to 7 photos to float in their celebration carousel ({formData.gallery.length} / 7).
              </p>
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handleGalleryUpload}
            />

            {formData.gallery.length < 7 && (
              <div
                className="upload-drop-zone"
                onClick={() => galleryInputRef.current?.click()}
              >
                <span className="upload-icon-big">🖼️</span>
                <span className="upload-text-main">
                  Click to add gallery photos
                </span>
                <span className="upload-text-sub">
                  Select up to {7 - formData.gallery.length} more images (Photos &gt; 500KB auto-compressed)
                </span>
              </div>
            )}

            {formData.gallery.length > 0 && (
              <div className="gallery-thumbs-grid">
                {formData.gallery.map((url, idx) => (
                  <div key={idx} className="gallery-thumb-item">
                    <img src={url} alt={`Gallery memory ${idx + 1}`} />
                    <button
                      type="button"
                      className="btn-thumb-remove"
                      onClick={() => handleRemoveGalleryPhoto(idx)}
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadStatus && (
              <div className="upload-loading-pill">
                <span className="spinner-mini" />
                <span>{uploadStatus}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: Celebration Unlocked & Share Hub */}
        {step === 6 && (
          <div className="preview-step-card final-share-card">
            <span className="preview-trophy-icon">🎉🎂✨</span>
            <div className="final-share-pill">✨ Celebration Published!</div>
            <h2 className="preview-step-title">
              {formData.name}&apos;s Page is Ready to Share!
            </h2>
            <p className="preview-step-desc">
              Your personalized interactive celebration surprise is now officially published. Copy the special link below or share directly via WhatsApp to surprise {formData.name || "them"}!
            </p>

            {/* Official Shareable Link Box */}
            <div className="final-share-url-container">
              <span className="final-share-url-label">🔗 Official Shareable Link:</span>
              <div className="final-share-url-box">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="final-share-url-input"
                  aria-label="Official shareable link"
                />
                <button
                  type="button"
                  className={`final-share-copy-btn ${copied ? "copied" : ""}`}
                  onClick={handleCopyLink}
                >
                  {copied ? "Copied! 💖" : "Copy Link"}
                </button>
              </div>
            </div>

            {/* Countdown Notice if Birthday is in the future */}
            {(() => {
              const info = getBirthdayTargetInfo(formData);
              if (!info || !info.isLocked) return null;
              return (
                <div
                  className="final-countdown-card"
                  style={{
                    width: "100%",
                    background: "linear-gradient(135deg, #fff7f9 0%, #fff0f3 100%)",
                    border: "1.5px dashed #f5a9bc",
                    borderRadius: "16px",
                    padding: "16px 18px",
                    margin: "18px 0 6px",
                    textAlign: "left",
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: "28px", lineHeight: 1 }}>⏳</span>
                  <div>
                    <strong style={{ display: "block", color: "#612f3e", fontSize: "14px", marginBottom: "4px" }}>
                      Birthday Countdown Ready!
                    </strong>
                    <p style={{ margin: 0, fontSize: "12.5px", lineHeight: "1.5", color: "#7a505e" }}>
                      Since {formData.name || "the recipient"}&apos;s birthday is on <strong>{info.formattedDate}</strong>, the live countdown will start <strong>1 hour before</strong> their birthday (at 11:00 PM on {info.countdownStartsDate}). The full celebration surprise unlocks automatically at 12:00 AM Midnight on their special day!
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Direct Action Buttons: WhatsApp & View Live */}
            <div className="final-share-actions-row">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Hey ${formData.name || "there"}! 🎂 I made something special just for you. Open this to see your birthday surprise: ${generatedLink}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="final-share-whatsapp-btn"
              >
                <span>💬</span> Share on WhatsApp
              </a>

              <Link
                href={`/${createdSlug}`}
                target="_blank"
                className="final-share-view-btn"
              >
                <span>👀 View Live Page</span>
              </Link>
            </div>

            <div className="final-share-footer-links">
              <Link href="/" className="final-share-home-link">
                ← Return to Home
              </Link>
              <button
                type="button"
                className="final-share-new-btn"
                onClick={() => {
                  try {
                    localStorage.removeItem(STORAGE_KEY);
                  } catch (err) {
                    console.warn("Failed to clear localStorage:", err);
                  }
                  setStep(1);
                  setMaxStepReached(1);
                  setFormData({
                    name: "",
                    nickname: "",
                    dob: "",
                    age: "",
                    message: "",
                    reasons: ["", "", "", "", ""],
                    photo: "",
                    photoPublicId: "",
                    gallery: [],
                    galleryPublicIds: [],
                  });
                  setCreatedSlug("");
                  setHasSeenPreview(false);
                }}
              >
                Create Another Celebration ✨
              </button>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons (Steps 1 to 5) */}
        {step < 6 && (
          <div className="wizard-footer-nav">
            {step > 1 ? (
              <button
                type="button"
                className="btn-wizard-prev"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                ← Previous
              </button>
            ) : <div />}

            {step < 5 ? (
              <button
                type="button"
                className="btn-wizard-next"
                onClick={() => changeStep(step + 1)}
                disabled={!canGoNext() || loading}
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                className="btn-wizard-next"
                onClick={handleStartLocalPreview}
                disabled={!canGoNext() || loading}
              >
                {hasSeenPreview ? "Preview Again 👀" : "Preview Experience 👀"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
