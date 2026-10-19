"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import BirthdayExperience from "../BirthdayExperience";
import "./VisitorAnalyticsView.css";

export default function VisitorAnalyticsView({ adminToken }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: { today: 0, uniqueToday: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, total: 0, uniqueTotal: 0, paidBuyersCount: 0 },
    customDate: null,
    breakdowns: { devices: [], browsers: [] },
    availableSlugs: [],
    records: [],
    paidBuyers: [],
    paidBuyersCount: 0,
    paidSlugs: [],
  });

  // Three main sections: "buyers" | "abandoned" | "visitors"
  const [activeMainTab, setActiveMainTab] = useState("buyers");
  const [selectedSlug, setSelectedSlug] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [buyerSearchQuery, setBuyerSearchQuery] = useState("");
  const [visitorFilter, setVisitorFilter] = useState("all"); // "all" | "paid" | "home"
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [copiedUa, setCopiedUa] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState("");
  const [copiedPayId, setCopiedPayId] = useState("");

  // People who created but didn't buy state
  const [abandonedTemplates, setAbandonedTemplates] = useState([]);
  const [loadingAbandoned, setLoadingAbandoned] = useState(true);
  const [previewingTemplate, setPreviewingTemplate] = useState(null);
  const [historyModalTemplate, setHistoryModalTemplate] = useState(null);
  const [convertModalTemplate, setConvertModalTemplate] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState("");
  const [copiedLiveSlug, setCopiedLiveSlug] = useState("");

  // Search query for abandoned tab
  const [abandonedSearchQuery, setAbandonedSearchQuery] = useState("");

  // Permanent deletion warning modal state
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // 1-month reminder check state
  const [runningReminderCheck, setRunningReminderCheck] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const headers = {};
      if (adminToken) headers["x-admin-token"] = adminToken;

      const params = new URLSearchParams();
      if (selectedSlug && selectedSlug !== "all") params.set("slug", selectedSlug);
      if (customDate) params.set("customDate", customDate);

      const res = await fetch(`/api/admin/analytics?${params.toString()}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load visitor analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [adminToken, selectedSlug, customDate]);

  const fetchAbandonedTemplates = useCallback(async () => {
    setLoadingAbandoned(true);
    try {
      const headers = {};
      if (adminToken) headers["x-admin-token"] = adminToken;
      const res = await fetch("/api/templates/draft", { headers });
      if (res.ok) {
        const json = await res.json();
        setAbandonedTemplates(Array.isArray(json) ? json : []);
      }
    } catch (err) {
      console.error("Failed to load abandoned templates:", err);
    } finally {
      setLoadingAbandoned(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchAnalytics();
    fetchAbandonedTemplates();
  }, [fetchAnalytics, fetchAbandonedTemplates]);

  // Run 1-month reminder email trigger check
  const handleTriggerReminders = async () => {
    setRunningReminderCheck(true);
    setReminderResult(null);
    try {
      const res = await fetch("/api/admin/reminders", { method: "POST" });
      const json = await res.json();
      setReminderResult(json);
    } catch (err) {
      setReminderResult({ error: err.message });
    } finally {
      setRunningReminderCheck(false);
    }
  };

  // Lock body scroll and allow ESC key to exit fullscreen preview
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && previewingTemplate) {
        setPreviewingTemplate(null);
      }
    };
    if (previewingTemplate) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [previewingTemplate]);

  // Filter paid buyers by search
  const filteredBuyers = useMemo(() => {
    const list = data.paidBuyers || [];
    if (!buyerSearchQuery.trim()) return list;
    const q = buyerSearchQuery.toLowerCase();
    return list.filter((b) =>
      (b.name && b.name.toLowerCase().includes(q)) ||
      (b.nickname && b.nickname.toLowerCase().includes(q)) ||
      (b.slug && b.slug.toLowerCase().includes(q)) ||
      (b.paymentId && b.paymentId.toLowerCase().includes(q)) ||
      (b.orderId && b.orderId.toLowerCase().includes(q))
    );
  }, [data.paidBuyers, buyerSearchQuery]);

  // Total views across all paid links
  const totalPaidViews = useMemo(() => {
    return (data.paidBuyers || []).reduce((acc, b) => acc + (b.totalVisits || 0), 0);
  }, [data.paidBuyers]);

  // Filter visitor records by sub-filter pill & search query
  const filteredRecords = useMemo(() => {
    let list = data.records || [];
    if (visitorFilter === "paid") {
      list = list.filter((r) => r.isPaidLink);
    } else if (visitorFilter === "home") {
      list = list.filter((r) => !r.slug);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((r) =>
      (r.ip && r.ip.toLowerCase().includes(q)) ||
      (r.slug && r.slug.toLowerCase().includes(q)) ||
      (r.browser && r.browser.toLowerCase().includes(q)) ||
      (r.os && r.os.toLowerCase().includes(q)) ||
      (r.referrer && r.referrer.toLowerCase().includes(q))
    );
  }, [data.records, searchQuery, visitorFilter]);

  const paidVisitorsCount = useMemo(() => {
    return (data.records || []).filter((r) => r.isPaidLink).length;
  }, [data.records]);

  const homeVisitorsCount = useMemo(() => {
    return (data.records || []).filter((r) => !r.slug).length;
  }, [data.records]);

  // Helper to sort abandoned templates by lastVisitedAt (descending) so active returning visitors are on top
  const sortAbandonedByLastVisited = (a, b) => {
    const timeA = new Date(a.lastVisitedAt || a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.lastVisitedAt || b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  };

  const getHistoryList = (t) => {
    if (!t) return [];
    if (Array.isArray(t.creationHistory) && t.creationHistory.length > 0) {
      return [...t.creationHistory].reverse();
    }
    return [
      {
        templateId: t.templateId,
        name: t.name,
        nickname: t.nickname,
        sender: t.sender,
        dob: t.dob || t.date,
        age: t.age,
        date: t.date || t.dob,
        message: t.message,
        photo: t.photo,
        galleryCount: (t.gallery || []).length,
        reasonsCount: (t.reasons || []).length,
        createdAt: t.createdAt,
        clientIp: t.clientIp,
        userAgent: t.userAgent,
      },
    ];
  };

  // Filter abandoned templates by search and sort by lastVisitedAt
  const filteredAbandoned = useMemo(() => {
    const sorted = [...abandonedTemplates].sort(sortAbandonedByLastVisited);
    if (!abandonedSearchQuery.trim()) return sorted;
    const q = abandonedSearchQuery.toLowerCase();
    return sorted.filter((t) =>
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.nickname && t.nickname.toLowerCase().includes(q)) ||
      (t.sender && t.sender.toLowerCase().includes(q)) ||
      (t.userEmail && t.userEmail.toLowerCase().includes(q)) ||
      (t.clientIp && t.clientIp.toLowerCase().includes(q))
    );
  }, [abandonedTemplates, abandonedSearchQuery]);

  const handleCopyLiveLink = (slug) => {
    if (typeof window === "undefined" || !slug) return;
    const fullUrl = `${window.location.origin}/${slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl).then(() => {
        setCopiedLiveSlug(slug);
        setTimeout(() => setCopiedLiveSlug(""), 2200);
      });
    }
  };

  const handleConfirmConvert = async () => {
    if (!convertModalTemplate) return;
    setIsConverting(true);
    setConvertError("");

    try {
      const headers = { "Content-Type": "application/json" };
      if (adminToken) headers["x-admin-token"] = adminToken;

      const res = await fetch("/api/admin/convert-template", {
        method: "POST",
        headers,
        body: JSON.stringify({
          templateId: convertModalTemplate.templateId || convertModalTemplate._id,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to convert template.");
      }

      // Optimistically update abandoned template state
      setAbandonedTemplates((prev) =>
        prev.map((t) =>
          (t._id === convertModalTemplate._id || t.templateId === convertModalTemplate.templateId)
            ? { ...t, isConverted: true, convertedSlug: json.slug }
            : t
        )
      );

      // Prepend to paidBuyers
      if (json.page || json.slug) {
        const pageData = json.page || {};
        const newBuyer = {
          id: pageData._id || json.slug,
          _id: pageData._id || json.slug,
          slug: json.slug,
          name: pageData.name || convertModalTemplate.name,
          nickname: pageData.nickname || convertModalTemplate.nickname || "",
          dob: pageData.dob || convertModalTemplate.dob || "",
          age: pageData.age || convertModalTemplate.age || "",
          date: pageData.date || convertModalTemplate.date || "",
          photo: pageData.photo || convertModalTemplate.photo || "",
          paymentId: "admin_converted",
          orderId: "admin_manual",
          convertedByAdmin: true,
          amountPaid: 0,
          userEmail: pageData.userEmail || convertModalTemplate.userEmail || "",
          createdAt: pageData.createdAt || new Date().toISOString(),
          totalVisits: 0,
          uniqueVisitors: 0,
          lastVisit: null,
        };

        setData((prev) => ({
          ...prev,
          paidBuyers: [newBuyer, ...(prev.paidBuyers || [])],
          paidBuyersCount: (prev.paidBuyersCount || 0) + 1,
        }));
      }

      setConvertModalTemplate(null);
      handleCopyLiveLink(json.slug);
      alert(`🎉 Successfully converted! Live link: /${json.slug}\nLink copied to clipboard.`);
    } catch (err) {
      console.error("Conversion error:", err);
      setConvertError(err.message || "Failed to convert template.");
    } finally {
      setIsConverting(false);
    }
  };

  const promptDelete = (type, id, title, subtitle, slug = null, hasCloudinary = false) => {
    setDeleteError("");
    setDeleteModalItem({ type, id, title, subtitle, slug, hasCloudinary });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalItem) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const headers = { "Content-Type": "application/json" };
      if (adminToken) headers["x-admin-token"] = adminToken;

      const res = await fetch("/api/admin/records", {
        method: "DELETE",
        headers,
        body: JSON.stringify({
          type: deleteModalItem.type,
          id: deleteModalItem.id,
          slug: deleteModalItem.slug,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete record.");
      }

      // Optimistically update frontend state
      if (deleteModalItem.type === "buyer") {
        setData((prev) => ({
          ...prev,
          paidBuyers: (prev.paidBuyers || []).filter(
            (b) => b._id !== deleteModalItem.id && b.slug !== deleteModalItem.slug
          ),
          paidBuyersCount: Math.max(0, (prev.paidBuyersCount || 0) - 1),
        }));
      } else if (deleteModalItem.type === "abandoned") {
        setAbandonedTemplates((prev) =>
          prev.filter((t) => t._id !== deleteModalItem.id && t.templateId !== deleteModalItem.id)
        );
      } else if (deleteModalItem.type === "user") {
        setUsersList((prev) =>
          prev.filter((u) => u._id !== deleteModalItem.id && u.email !== deleteModalItem.title)
        );
      } else if (deleteModalItem.type === "visitor") {
        setData((prev) => ({
          ...prev,
          records: (prev.records || []).filter((r) => r._id !== deleteModalItem.id),
        }));
        if (selectedRecord && selectedRecord._id === deleteModalItem.id) {
          setSelectedRecord(null);
        }
      }

      setDeleteModalItem(null);
    } catch (err) {
      setDeleteError(err.message || "Failed to delete record.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = (slug) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/${slug}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedSlug(slug);
        setTimeout(() => setCopiedSlug(""), 2200);
      });
    }
  };

  const handleCopyPayId = (id) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(id).then(() => {
        setCopiedPayId(id);
        setTimeout(() => setCopiedPayId(""), 2200);
      });
    }
  };

  const handleInspectBuyerTraffic = (slug) => {
    setSelectedSlug(slug);
    setActiveMainTab("visitors");
    setVisitorFilter("all");
    setTimeout(() => {
      const el = document.getElementById("visitor-records-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  const handleCopyUa = (ua) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(ua).then(() => {
        setCopiedUa(true);
        setTimeout(() => setCopiedUa(false), 2000);
      });
    }
  };

  const formatTimestamp = (iso) => {
    if (!iso) return "Unknown";
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="analytics-container">
      {/* Primary Section Switcher Tabs */}
      <div className="analytics-view-tabs-bar">
        <button
          type="button"
          className={`analytics-view-tab-btn ${activeMainTab === "buyers" ? "active" : ""}`}
          onClick={() => setActiveMainTab("buyers")}
        >
          <span>💳</span>
          <span>Successful Buyers</span>
          <span className="analytics-tab-pill-badge badge-green">
            {loading ? "..." : `🎉 ${data.paidBuyersCount || 0}`}
          </span>
        </button>

        <button
          type="button"
          className={`analytics-view-tab-btn ${activeMainTab === "abandoned" ? "active" : ""}`}
          onClick={() => setActiveMainTab("abandoned")}
        >
          <span>👀</span>
          <span>people who create but didn&apos;t buy</span>
          <span className="analytics-tab-pill-badge" style={{ background: "#fff0f3", color: "#d95775" }}>
            {loadingAbandoned ? "..." : abandonedTemplates.length}
          </span>
        </button>

        <button
          type="button"
          className={`analytics-view-tab-btn ${activeMainTab === "visitors" ? "active" : ""}`}
          onClick={() => setActiveMainTab("visitors")}
        >
          <span>📋</span>
          <span>Visitor Analytics</span>
          <span className="analytics-tab-pill-badge">
            {loading ? "..." : (data.summary?.total || 0)}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: SUCCESSFUL BUYERS & PAID LINKS                          */}
      {/* ============================================================== */}
      {activeMainTab === "buyers" && (
        <section className="buyers-section" aria-label="Successful Buyers Section">
          {/* Header Banner */}
          <div className="buyers-header-card">
            <div className="buyers-header-title">
              <h3>
                <span>💳</span>
                <span>Verified Customers & Paid Celebration Links</span>
              </h3>
              <p>
                Track every user who successfully completed payment, bought their custom celebration link, and view real-time traffic to their page.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                className="analytics-refresh-btn"
                style={{ background: "#6b21a8" }}
                onClick={handleTriggerReminders}
                disabled={runningReminderCheck}
                title="Check for birthdays that occurred 1 month ago and send reminder emails"
              >
                {runningReminderCheck ? "Checking..." : "🔔 Check 1-Month Post-Birthday"}
              </button>
              <button
                type="button"
                className="analytics-refresh-btn"
                onClick={fetchAnalytics}
                disabled={loading}
                title="Refresh buyer records"
              >
                {loading ? "Refreshing..." : "↻ Refresh Buyers"}
              </button>
            </div>
          </div>

          {reminderResult && (
            <div
              style={{
                background: "#f3e8ff",
                border: "1px solid #d8b4fe",
                color: "#6b21a8",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "13px",
              }}
            >
              🔔 Reminder Check Result: Checked {reminderResult.checkedCount} pages. Triggered {reminderResult.remindersTriggeredCount} email alerts to admin.
            </div>
          )}

          {loading ? (
            <div className="analytics-page-loader">
              <div className="analytics-circle-spinner" />
              <h3 className="analytics-loader-title">Loading Successful Buyers...</h3>
              <p className="analytics-loader-sub">Fetching verified customer orders, payments, and live celebration links</p>
            </div>
          ) : (
            <>
              {/* Quick Metrics for Paid Orders - Single Row of Small Cards */}
              <div className="buyers-stats-row">
                <div className="buyers-compact-card">
                  <div className="buyers-compact-icon" style={{ background: "#fef0f3" }}>🎉</div>
                  <div className="buyers-compact-body">
                    <span className="buyers-compact-label">Paid Celebrations</span>
                    <div className="buyers-compact-value">{data.paidBuyersCount || 0}</div>
                    <span className="buyers-compact-sub">Verified customer orders</span>
                  </div>
                </div>

                <div className="buyers-compact-card">
                  <div className="buyers-compact-icon" style={{ background: "#fdf6e9" }}>💰</div>
                  <div className="buyers-compact-body">
                    <span className="buyers-compact-label">Total Revenue</span>
                    <div className="buyers-compact-value">
                      ₹{(data.paidBuyers || []).reduce((sum, b) => sum + (b.amountPaid || 199), 0)}
                    </div>
                    <span className="buyers-compact-sub">Permanent customer records</span>
                  </div>
                </div>

                <div className="buyers-compact-card">
                  <div className="buyers-compact-icon" style={{ background: "#edf9f1" }}>👁️</div>
                  <div className="buyers-compact-body">
                    <span className="buyers-compact-label">Paid Links Traffic</span>
                    <div className="buyers-compact-value">{totalPaidViews}</div>
                    <span className="buyers-compact-sub">Total views on paid links</span>
                  </div>
                </div>

                <div className="buyers-compact-card">
                  <div className="buyers-compact-icon" style={{ background: "#f2f3fd" }}>⏳</div>
                  <div className="buyers-compact-body">
                    <span className="buyers-compact-label">Latest Order</span>
                    <div className="buyers-compact-value" style={{ fontSize: "15px" }}>
                      {data.paidBuyers && data.paidBuyers.length > 0
                        ? formatTimestamp(data.paidBuyers[0].createdAt).split(",")[0]
                        : "No orders yet"}
                    </div>
                    <span className="buyers-compact-sub">Most recent verified buyer</span>
                  </div>
                </div>
              </div>

              {/* Buyers Table Card */}
              <div className="analytics-table-card">
                <div className="analytics-table-head-row">
                  <h3 className="analytics-table-title">
                    <span>💎 Verified Buyers &amp; Live Celebration Links</span>
                    <span className="count">({filteredBuyers.length} buyers)</span>
                  </h3>

                  <input
                    type="text"
                    className="analytics-search-input"
                    placeholder="Search name, slug, payment ID..."
                    value={buyerSearchQuery}
                    onChange={(e) => setBuyerSearchQuery(e.target.value)}
                  />
                </div>

                {filteredBuyers.length === 0 ? (
                  <div className="analytics-empty">
                    <div className="analytics-empty-icon">💎</div>
                    <strong>No successful buyers match your filter.</strong>
                    <p>When visitors complete their ₹49 or ₹199 purchase, their details and live links will appear here permanently.</p>
                  </div>
                ) : (
                  <div className="analytics-table-wrap">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>Celebrant &amp; Buyer</th>
                          <th>Shareable Link</th>
                          <th>Amount &amp; Payment ID</th>
                          <th>Birthday Date</th>
                          <th style={{ whiteSpace: "nowrap" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBuyers.map((b) => (
                          <tr key={b.id || b.slug}>
                            <td>
                              <div className="buyer-profile-cell">
                                {b.photo ? (
                                  <img src={b.photo} alt={b.name} className="buyer-thumb-avatar" />
                                ) : (
                                  <div className="buyer-monogram-avatar">
                                    {b.name ? b.name[0].toUpperCase() : "🎂"}
                                  </div>
                                )}
                                <div>
                                  <strong>{b.name}</strong>
                                  {b.nickname && <span className="buyer-nickname">&ldquo;{b.nickname}&rdquo;</span>}
                                  {b.userEmail && (
                                    <span style={{ display: "block", fontSize: "11px", color: "#6b4f59" }}>
                                      ✉️ {b.userEmail}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td>
                              <div className="buyer-link-pill-group">
                                <a
                                  href={`/${b.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="analytics-slug-chip"
                                >
                                  /{b.slug}
                                </a>
                                <button
                                  type="button"
                                  className="buyer-copy-btn"
                                  onClick={() => handleCopyLink(b.slug)}
                                  title="Copy public link"
                                >
                                  {copiedSlug === b.slug ? "✓ Copied" : "Copy"}
                                </button>
                              </div>
                            </td>

                            <td>
                              {b.convertedByAdmin || b.paymentId === "admin_converted" ? (
                                <div>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      fontWeight: 800,
                                      fontSize: "12px",
                                      padding: "3px 10px",
                                      borderRadius: "999px",
                                      background: "#ecfdf5",
                                      color: "#047857",
                                      border: "1px solid #a7f3d0",
                                      letterSpacing: "0.2px",
                                    }}
                                  >
                                    🪄 Converted
                                  </span>
                                  <div style={{ marginTop: "4px" }}>
                                    <span className="analytics-ip-code" style={{ fontSize: "11px", color: "#64748b" }}>
                                      Admin Manual
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span
                                      style={{
                                        fontWeight: 800,
                                        color:
                                          b.amountPaid === 29
                                            ? "#dc2626"
                                            : b.amountPaid === 39
                                            ? "#be185d"
                                            : b.amountPaid === 49
                                            ? "#d95775"
                                            : "#16a34a",
                                        fontSize: "14px",
                                      }}
                                    >
                                      ₹{b.amountPaid !== undefined && b.amountPaid !== null ? b.amountPaid : 199}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        padding: "2px 6px",
                                        borderRadius: "6px",
                                        background:
                                          b.amountPaid === 29
                                            ? "#fee2e2"
                                            : b.amountPaid === 39
                                            ? "#fce7f3"
                                            : b.amountPaid === 49
                                            ? "#fff0f3"
                                            : "#f0fdf4",
                                        color:
                                          b.amountPaid === 29
                                            ? "#b91c1c"
                                            : b.amountPaid === 39
                                            ? "#be185d"
                                            : b.amountPaid === 49
                                            ? "#d95775"
                                            : "#166534",
                                        border:
                                          b.amountPaid === 29
                                            ? "1px solid #fca5a5"
                                            : b.amountPaid === 39
                                            ? "1px solid #fbcfe8"
                                            : b.amountPaid === 49
                                            ? "1px solid #ffd6e1"
                                            : "1px solid #bbf7d0",
                                      }}
                                    >
                                      {b.amountPaid === 29
                                        ? "Final Offer (₹29)"
                                        : b.amountPaid === 39
                                        ? "Special Offer (₹39)"
                                        : b.amountPaid === 49
                                        ? "Login (₹49)"
                                        : "Standard (₹199)"}
                                    </span>
                                  </div>
                                  <div style={{ marginTop: "4px" }}>
                                    <span className="analytics-ip-code" style={{ fontSize: "11px" }}>
                                      {b.paymentId || "N/A"}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </td>

                            <td>
                              <span style={{ fontSize: "12px", color: "#613b48", fontWeight: 600 }}>
                                📅 {b.date || b.dob || "Not set"}
                              </span>
                            </td>

                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: "6px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <a
                                  href={`/${b.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="analytics-view-btn"
                                  title="Open live celebration page"
                                >
                                  View Live
                                </a>
                                <button
                                  type="button"
                                  className="analytics-view-btn"
                                  onClick={() => handleInspectBuyerTraffic(b.slug)}
                                  title="Filter visitor logs to this link"
                                >
                                  Logs
                                </button>
                                <button
                                  type="button"
                                  className="analytics-view-btn analytics-delete-action-btn"
                                  onClick={() =>
                                    promptDelete(
                                      "buyer",
                                      b._id,
                                      b.name,
                                      `Slug: /${b.slug} • Payment ID: ${b.paymentId || "N/A"}`,
                                      b.slug,
                                      true
                                    )
                                  }
                                  title="Permanently delete this buyer page and its Cloudinary photos"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PEOPLE WHO CREATE BUT DIDN'T BUY                        */}
      {/* ============================================================== */}
      {activeMainTab === "abandoned" && (
        <section className="abandoned-section" aria-label="People who create but didn't buy">
          <div className="buyers-header-card">
            <div className="buyers-header-title">
              <h3>
                <span>👀</span>
                <span>people who create but didn&apos;t buy</span>
              </h3>
              <p>
                Every visitor who filled in their celebration details, message, and photos and tested the full preview experience, but hasn&apos;t purchased their public link yet.
              </p>
            </div>
            <button
              type="button"
              className="analytics-refresh-btn"
              onClick={fetchAbandonedTemplates}
              disabled={loadingAbandoned}
            >
              {loadingAbandoned ? "Refreshing..." : "↻ Refresh Templates"}
            </button>
          </div>

          {loadingAbandoned ? (
            <div className="analytics-page-loader">
              <div className="analytics-circle-spinner" />
              <h3 className="analytics-loader-title">Loading Celebration Drafts...</h3>
              <p className="analytics-loader-sub">Fetching visitors who created templates and tested preview without buying</p>
            </div>
          ) : (
            <div className="analytics-table-card">
            <div className="analytics-table-head-row">
              <h3 className="analytics-table-title">
                <span>📝 Drafted Celebrations ({filteredAbandoned.length})</span>
                <span className="analytics-tab-pill-badge" style={{ fontSize: "11px", marginLeft: "8px" }}>
                  Max 200 kept
                </span>
              </h3>
              <input
                type="text"
                className="analytics-search-input"
                placeholder="Search drafts by name or sender..."
                value={abandonedSearchQuery}
                onChange={(e) => setAbandonedSearchQuery(e.target.value)}
                style={{ maxWidth: "300px" }}
              />
            </div>

            {filteredAbandoned.length === 0 ? (
              <div className="analytics-empty">
                <div className="analytics-empty-icon">🎨</div>
                <strong>No matching abandoned templates found.</strong>
                <p>When someone designs a celebration in the wizard and previews it without paying, their draft will be listed here.</p>
              </div>
            ) : (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Celebrant &amp; Sender</th>
                      <th>Visits / Activity</th>
                      <th>Last Visited / Created</th>
                      <th>Photos &amp; Reasons</th>
                      <th style={{ whiteSpace: "nowrap" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAbandoned.map((t) => {
                      const visits = t.visitCount || (t.creationHistory && t.creationHistory.length) || 1;
                      return (
                      <tr key={t._id || t.templateId}>
                        <td>
                          <div className="buyer-profile-cell">
                            {t.photo ? (
                              <img src={t.photo} alt={t.name} className="buyer-thumb-avatar" />
                            ) : (
                              <div className="buyer-monogram-avatar">
                                {t.name ? t.name[0].toUpperCase() : "🎂"}
                              </div>
                            )}
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <strong>{t.name}</strong>
                                {visits > 1 && (
                                  <span
                                    style={{
                                      background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
                                      border: "1px solid #fecaca",
                                      color: "#dc2626",
                                      fontSize: "10.5px",
                                      fontWeight: 800,
                                      padding: "2px 7px",
                                      borderRadius: "999px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px",
                                    }}
                                    title={`This user visited and customized templates ${visits} times!`}
                                  >
                                    🔥 {visits} visits
                                  </span>
                                )}
                              </div>
                              {t.nickname && <span className="buyer-nickname">&ldquo;{t.nickname}&rdquo;</span>}
                              {t.sender && (
                                <span style={{ display: "block", fontSize: "11px", color: "#d95775", fontWeight: 700 }}>
                                  💌 From: {t.sender}
                                </span>
                              )}
                              <span style={{ display: "block", fontSize: "11px", color: "#8a6d77" }}>
                                DOB: {t.date || t.dob || "N/A"} {t.age ? `(${t.age} yrs)` : ""}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 9px",
                                borderRadius: "999px",
                                fontSize: "12px",
                                fontWeight: 700,
                                background: visits > 1 ? "#fff1f2" : "#f8fafc",
                                border: visits > 1 ? "1.5px solid #fecdd3" : "1px solid #e2e8f0",
                                color: visits > 1 ? "#be123c" : "#64748b",
                              }}
                            >
                              {visits > 1 ? `🎯 ${visits} Creations` : "1 Creation"}
                            </span>
                            {visits > 1 && (
                              <button
                                type="button"
                                onClick={() => setHistoryModalTemplate(t)}
                                style={{
                                  display: "block",
                                  marginTop: "4px",
                                  fontSize: "11px",
                                  color: "#2563eb",
                                  fontWeight: 600,
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: 0,
                                  textDecoration: "underline",
                                }}
                              >
                                View All {visits} Visits →
                              </button>
                            )}
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: "11.5px", color: "#6e4f59", whiteSpace: "nowrap", display: "block" }}>
                            <strong>{formatTimestamp(t.lastVisitedAt || t.updatedAt || t.createdAt)}</strong>
                          </span>
                          {t.lastVisitedAt && t.createdAt && new Date(t.lastVisitedAt).getTime() - new Date(t.createdAt).getTime() > 60000 && (
                            <span style={{ fontSize: "10.5px", color: "#9ca3af", display: "block" }}>
                              First: {formatTimestamp(t.createdAt)}
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ fontSize: "12px", color: "#54303b" }}>
                            <span>📸 {(t.gallery || []).length} gallery</span> • <span>✦ {(t.reasons || []).length} reasons</span>
                          </div>
                        </td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              gap: "6px",
                              alignItems: "center",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.isConverted ? (
                              <button
                                type="button"
                                className="analytics-view-btn"
                                onClick={() => handleCopyLiveLink(t.convertedSlug)}
                                style={{ background: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0", fontWeight: 700 }}
                                title="This template has already been converted to a live celebration link"
                              >
                                {copiedLiveSlug === t.convertedSlug ? "✓ Copied!" : "✓ Converted"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="analytics-view-btn"
                                onClick={() => setConvertModalTemplate(t)}
                                style={{
                                  background: "linear-gradient(135deg, #10b981, #059669)",
                                  color: "#ffffff",
                                  borderColor: "#059669",
                                  fontWeight: 700,
                                  boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
                                }}
                                title="Convert this template into a live celebration link without payment"
                              >
                                🪄 Convert
                              </button>
                            )}
                            <button
                              type="button"
                              className="analytics-view-btn"
                              onClick={() => setPreviewingTemplate(t)}
                              style={{ background: "#d95775", color: "#fff", borderColor: "#d95775" }}
                              title="Inspect full celebration preview"
                            >
                              👀 View
                            </button>
                            <button
                              type="button"
                              className="analytics-view-btn"
                              onClick={() => setHistoryModalTemplate(t)}
                              style={{
                                background: visits > 1 ? "#eff6ff" : "#f8fafc",
                                color: visits > 1 ? "#1d4ed8" : "#475569",
                                borderColor: visits > 1 ? "#bfdbfe" : "#cbd5e1",
                                fontWeight: 700,
                              }}
                              title="Check how many times this user came and created"
                            >
                              📜 History ({visits})
                            </button>
                            <button
                              type="button"
                              className="analytics-view-btn analytics-delete-action-btn"
                              onClick={() =>
                                promptDelete(
                                  "abandoned",
                                  t._id,
                                  t.name,
                                  `Created: ${formatTimestamp(t.createdAt)}${t.userEmail ? " • User: " + t.userEmail : " • Guest"}`,
                                  null,
                                  true
                                )
                              }
                              title="Permanently delete this draft template and its Cloudinary photos"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}
        </section>
      )}

      {/* ============================================================== */}
      {/* TAB 3: VISITOR ANALYTICS & TRAFFIC (Max 2,000 normal visits)    */}
      {/* ============================================================== */}
      {activeMainTab === "visitors" && (
        <section className="traffic-section" aria-label="Visitor Traffic Section">
          {/* Controls Bar */}
          <div className="analytics-header-row">
            <div>
              <h2>All Visitor Traffic Logs</h2>
              <p>Normal visit records auto-trim after 2,000 records, while paid buyer visits are kept permanently.</p>
            </div>

            <div className="analytics-controls">
              <select
                className="analytics-select"
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
              >
                <option value="all">All Pages (Sitewide)</option>
                {data.availableSlugs.map((s) => (
                  <option key={s} value={s}>
                    /{s}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="analytics-refresh-btn"
                onClick={fetchAnalytics}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "↻ Refresh Logs"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="analytics-page-loader">
              <div className="analytics-circle-spinner" />
              <h3 className="analytics-loader-title">Loading Visitor Traffic Logs...</h3>
              <p className="analytics-loader-sub">Fetching IP logs, device details, and page views</p>
            </div>
          ) : (
            <div className="analytics-table-card" id="visitor-records-section">
            <div className="analytics-table-head-row">
              <h3 className="analytics-table-title">
                <span>📋 Detailed Visitor Records</span>
                <span className="count">({filteredRecords.length} records)</span>
              </h3>

              <input
                type="text"
                className="analytics-search-input"
                placeholder="Search IP, Link, Browser, OS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sub-Filter Pills */}
            <div className="analytics-subfilter-row">
              <button
                type="button"
                className={`analytics-subfilter-btn ${visitorFilter === "all" ? "active" : ""}`}
                onClick={() => setVisitorFilter("all")}
              >
                <span>🌐 All Traffic</span>
                <span className="badge-num">{(data.records || []).length}</span>
              </button>

              <button
                type="button"
                className={`analytics-subfilter-btn ${visitorFilter === "paid" ? "active" : ""}`}
                onClick={() => setVisitorFilter("paid")}
              >
                <span>💎 Paid Links Only</span>
                <span className="badge-num">{paidVisitorsCount}</span>
              </button>

              <button
                type="button"
                className={`analytics-subfilter-btn ${visitorFilter === "home" ? "active" : ""}`}
                onClick={() => setVisitorFilter("home")}
              >
                <span>🏠 Normal Visits / Homepage</span>
                <span className="badge-num">{homeVisitorsCount}</span>
              </button>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="analytics-empty">
                <div className="analytics-empty-icon">👀</div>
                <strong>No visitor records found.</strong>
                <p>Visits will appear here in real time as people open your links.</p>
              </div>
            ) : (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Page / Link Type</th>
                      <th>IP Address</th>
                      <th>Device / Browser</th>
                      <th>Referrer</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span style={{ fontSize: "11.5px", color: "#6e4f59", whiteSpace: "nowrap" }}>
                            {formatTimestamp(r.createdAt)}
                          </span>
                        </td>

                        <td>
                          {r.slug ? (
                            <div style={{ display: "inline-flex", alignItems: "center" }}>
                              <a
                                href={`/${r.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="analytics-slug-chip"
                              >
                                /{r.slug}
                              </a>
                              {r.isPaidLink ? (
                                <span className="analytics-badge-paid" title="This link was purchased by a verified customer">
                                  💎 Paid
                                </span>
                              ) : (
                                <span style={{ marginLeft: "6px", fontSize: "11px", color: "#8a6d77" }}>
                                  (Normal Visit)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "#7a5965", fontWeight: 600 }}>
                              🏠 Normal Visit (Homepage /)
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="analytics-ip-code">{r.ip}</span>
                        </td>

                        <td>
                          <span style={{ whiteSpace: "nowrap" }}>
                            {r.device === "Mobile" ? "📱 " : "💻 "}
                            <strong>{r.browser}</strong> on {r.os}
                          </span>
                        </td>

                        <td>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#8d7780",
                              maxWidth: "140px",
                              display: "inline-block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={r.referrer}
                          >
                            {r.referrer || "Direct"}
                          </span>
                        </td>

                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              className="analytics-view-btn"
                              onClick={() => setSelectedRecord(r)}
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              className="analytics-view-btn analytics-delete-action-btn"
                              onClick={() =>
                                promptDelete(
                                  "visitor",
                                  r._id,
                                  r.ip,
                                  `Target: ${r.url || r.slug || "Home"} • Time: ${formatTimestamp(r.createdAt)}`,
                                  null,
                                  false
                                )
                              }
                              title="Delete this visitor log record"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}
        </section>
      )}

      {/* Abandoned Template Fullscreen Preview Portal */}
      {previewingTemplate && (
        <div
          className="admin-preview-fullscreen-portal"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview template for ${previewingTemplate.name}`}
        >
          {/* Floating Sleek Admin Toolbar */}
          <header className="admin-preview-floating-bar">
            <div className="admin-preview-bar-left">
              <button
                type="button"
                className="admin-preview-back-btn"
                onClick={() => setPreviewingTemplate(null)}
                title="Return to Admin Dashboard (or press ESC)"
              >
                <span>← Exit Preview</span>
              </button>
            </div>

            <div className="admin-preview-bar-center">
              <span className="admin-preview-dot-pulse" />
              <div className="admin-preview-info-text">
                <span className="admin-preview-badge">Draft Template</span>
                <span className="admin-preview-name">{previewingTemplate.name}</span>
                {previewingTemplate.age && (
                  <span className="admin-preview-meta">({previewingTemplate.age} yrs)</span>
                )}
                {(previewingTemplate.dob || previewingTemplate.date) && (
                  <span className="admin-preview-meta">
                    • DOB: {previewingTemplate.dob || previewingTemplate.date}
                  </span>
                )}
              </div>
            </div>

            <div className="admin-preview-bar-right">
              {previewingTemplate.userEmail ? (
                <span className="admin-preview-email-tag" title={previewingTemplate.userEmail}>
                  ✉️ {previewingTemplate.userEmail}
                </span>
              ) : (
                <span className="admin-preview-guest-tag">👤 Guest</span>
              )}
              <button
                type="button"
                className="admin-preview-close-circle"
                onClick={() => setPreviewingTemplate(null)}
                aria-label="Close Preview"
                title="Close Preview (ESC)"
              >
                ✕
              </button>
            </div>
          </header>

          {/* Fullscreen Interactive Celebration Canvas */}
          <div className="admin-preview-canvas-holder">
            <BirthdayExperience
              isPreview={true}
              isAdminPreview={true}
              previewData={{
                name: previewingTemplate.name,
                nickname: previewingTemplate.nickname || previewingTemplate.name,
                dob: previewingTemplate.dob,
                age: previewingTemplate.age,
                date: previewingTemplate.date,
                message: previewingTemplate.message,
                reasons: previewingTemplate.reasons,
                photo: previewingTemplate.photo,
                gallery: previewingTemplate.gallery,
              }}
              onExitPreview={() => setPreviewingTemplate(null)}
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CREATION & VISIT HISTORY MODAL                                 */}
      {/* ============================================================== */}
      {historyModalTemplate && (
        <div className="analytics-modal-backdrop" onClick={() => setHistoryModalTemplate(null)}>
          <div
            className="analytics-modal analytics-history-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "820px", width: "95%" }}
          >
            <div className="analytics-modal-header" style={{ borderBottom: "1px solid #fed7e2" }}>
              <div>
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, color: "#881337" }}>
                  <span>📜</span>
                  <span>Creation &amp; Visit History</span>
                  <span
                    style={{
                      fontSize: "12px",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      background: "#fecdd3",
                      color: "#9f1239",
                      fontWeight: 800,
                    }}
                  >
                    Visited &amp; Created {historyModalTemplate.visitCount || (historyModalTemplate.creationHistory?.length || 1)} Time(s)
                  </span>
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#9f1239" }}>
                  Track every time this visitor came to the site and customized a celebration template without purchasing.
                </p>
              </div>
              <button
                type="button"
                className="analytics-modal-close-btn"
                onClick={() => setHistoryModalTemplate(null)}
              >
                ✕
              </button>
            </div>

            <div className="analytics-modal-body" style={{ maxHeight: "72vh", overflowY: "auto", padding: "20px 24px" }}>
              {/* User Identity Summary Bar */}
              <div
                style={{
                  background: "linear-gradient(135deg, #fff5f7 0%, #fff1f2 100%)",
                  border: "1.5px solid #fecdd3",
                  borderRadius: "14px",
                  padding: "14px 18px",
                  marginBottom: "20px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                  fontSize: "12px",
                }}
              >
                <div>
                  <span style={{ color: "#9f1239", fontWeight: 600, display: "block" }}>👤 Celebrant:</span>
                  <strong style={{ fontSize: "14px", color: "#371b22" }}>{historyModalTemplate.name}</strong>
                  {historyModalTemplate.nickname && <span style={{ color: "#881337" }}> ({historyModalTemplate.nickname})</span>}
                </div>
                <div>
                  <span style={{ color: "#9f1239", fontWeight: 600, display: "block" }}>💌 Sender:</span>
                  <strong style={{ fontSize: "13px", color: "#371b22" }}>{historyModalTemplate.sender || "Not specified"}</strong>
                </div>
                <div>
                  <span style={{ color: "#9f1239", fontWeight: 600, display: "block" }}>✉️ User Account:</span>
                  <strong style={{ fontSize: "12.5px", color: historyModalTemplate.userEmail ? "#1d4ed8" : "#64748b" }}>
                    {historyModalTemplate.userEmail || "Guest (Not logged in)"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#9f1239", fontWeight: 600, display: "block" }}>🌐 IP Address:</span>
                  <code style={{ fontSize: "11.5px", background: "#fff", padding: "2px 6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    {historyModalTemplate.clientIp || "Unknown"}
                  </code>
                </div>
                <div>
                  <span style={{ color: "#9f1239", fontWeight: 600, display: "block" }}>📅 First Created:</span>
                  <span style={{ color: "#371b22" }}>{formatTimestamp(historyModalTemplate.createdAt)}</span>
                </div>
                <div>
                  <span style={{ color: "#9f1239", fontWeight: 600, display: "block" }}>⏱️ Last Visited / Created:</span>
                  <strong style={{ color: "#be123c" }}>
                    {formatTimestamp(historyModalTemplate.lastVisitedAt || historyModalTemplate.updatedAt || historyModalTemplate.createdAt)}
                  </strong>
                </div>
              </div>

              {/* Timeline of Each Creation */}
              <h4 style={{ fontSize: "13px", fontWeight: 800, color: "#881337", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Creation Activity Log ({getHistoryList(historyModalTemplate).length} Recorded Event(s))
              </h4>

              <div className="history-timeline" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {getHistoryList(historyModalTemplate).map((item, index, arr) => {
                  const isLatest = index === 0;
                  const eventNumber = arr.length - index;
                  return (
                    <div
                      key={item._id || item.templateId || index}
                      style={{
                        background: isLatest ? "#ffffff" : "#fafafa",
                        border: isLatest ? "2px solid #fda4af" : "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "16px 18px",
                        boxShadow: isLatest ? "0 4px 14px rgba(225, 29, 72, 0.08)" : "none",
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              background: isLatest ? "#e11d48" : "#64748b",
                              color: "#fff",
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "3px 9px",
                              borderRadius: "999px",
                            }}
                          >
                            Visit / Creation #{eventNumber} {isLatest && "• LATEST"}
                          </span>
                          <strong style={{ fontSize: "14px", color: "#1e293b" }}>
                            {item.name || historyModalTemplate.name}
                            {item.nickname && ` ("${item.nickname}")`}
                          </strong>
                        </div>
                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                          🕒 {formatTimestamp(item.createdAt || item.timestamp)}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                        {item.photo ? (
                          <img
                            src={item.photo}
                            alt={item.name}
                            style={{ width: "64px", height: "64px", borderRadius: "10px", objectFit: "cover", flexShrink: 0, border: "1px solid #fecdd3" }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "64px",
                              height: "64px",
                              borderRadius: "10px",
                              background: "#fff1f2",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "24px",
                              flexShrink: 0,
                              border: "1px solid #fecdd3",
                            }}
                          >
                            🎂
                          </div>
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {item.sender && (
                            <div style={{ fontSize: "12px", color: "#d95775", marginBottom: "4px", fontWeight: 700 }}>
                              💌 Sender: {item.sender}
                            </div>
                          )}
                          {item.message && (
                            <p
                              style={{
                                fontSize: "12.5px",
                                color: "#475569",
                                margin: "0 0 8px",
                                background: "#f8fafc",
                                padding: "8px 12px",
                                borderRadius: "8px",
                                border: "1px solid #f1f5f9",
                                fontStyle: "italic",
                                maxHeight: "80px",
                                overflowY: "auto",
                              }}
                            >
                              &ldquo;{item.message}&rdquo;
                            </p>
                          )}
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "11.5px", color: "#64748b" }}>
                            <span>📸 {item.galleryCount || (item.gallery ? item.gallery.length : 0)} gallery photos</span>
                            <span>✦ {item.reasonsCount || (item.reasons ? item.reasons.length : 0)} reasons</span>
                            {item.dob && <span>🎂 DOB: {item.dob}</span>}
                            {item.age && <span>({item.age} yrs)</span>}
                            <code style={{ fontSize: "10.5px", color: "#94a3b8" }}>ID: {item.templateId || "N/A"}</code>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="analytics-view-btn"
                          onClick={() => {
                            setPreviewingTemplate({
                              ...historyModalTemplate,
                              ...item,
                              templateId: item.templateId || historyModalTemplate.templateId,
                            });
                          }}
                          style={{
                            background: "#fff",
                            color: "#d95775",
                            borderColor: "#fecdd3",
                            padding: "6px 12px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            alignSelf: "center",
                          }}
                          title="Preview this historical celebration draft"
                        >
                          👀 Preview
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="analytics-modal-footer" style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9" }}>
              <button
                type="button"
                className="analytics-modal-footer-btn"
                onClick={() => setHistoryModalTemplate(null)}
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visitor Detail Modal */}
      {selectedRecord && (
        <div className="analytics-modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="analytics-modal-header">
              <div>
                <h3>Visitor Inspection</h3>
                <p>{selectedRecord.ip} • {formatTimestamp(selectedRecord.createdAt)}</p>
              </div>
              <button
                type="button"
                className="analytics-modal-close-btn"
                onClick={() => setSelectedRecord(null)}
              >
                ✕
              </button>
            </div>

            <div className="analytics-modal-body">
              <div className="analytics-detail-section">
                <h4 className="analytics-detail-section-title">
                  <span>🌐 Page &amp; URL</span>
                </h4>
                <div className="analytics-detail-grid">
                  <div className="analytics-detail-item">
                    <label>Page URL</label>
                    <span style={{ color: "#d95775" }}>{selectedRecord.url || "N/A"}</span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Referrer</label>
                    <span>{selectedRecord.referrer || "Direct / Bookmark"}</span>
                  </div>
                </div>
              </div>

              <div className="analytics-detail-section">
                <h4 className="analytics-detail-section-title">
                  <span>💻 Device &amp; Environment</span>
                </h4>
                <div className="analytics-detail-grid">
                  <div className="analytics-detail-item">
                    <label>Device Type</label>
                    <span>{selectedRecord.device}</span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Operating System</label>
                    <span>
                      {selectedRecord.os} {selectedRecord.osVersion ? `(${selectedRecord.osVersion})` : ""}
                    </span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Browser</label>
                    <span>
                      {selectedRecord.browser}{" "}
                      {selectedRecord.browserVersion ? `v${selectedRecord.browserVersion}` : ""}
                    </span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Screen Resolution</label>
                    <span>{selectedRecord.screenResolution || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="analytics-detail-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 className="analytics-detail-section-title">
                    <span>📋 Raw User-Agent Header</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleCopyUa(selectedRecord.userAgent)}
                    style={{
                      background: "none",
                      border: "0",
                      color: "#d95775",
                      fontSize: "11.5px",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    {copiedUa ? "✓ Copied!" : "📋 Copy User-Agent"}
                  </button>
                </div>
                <div className="analytics-ua-box">{selectedRecord.userAgent || "No user-agent"}</div>
              </div>
            </div>

            <div className="analytics-modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                className="analytics-modal-footer-btn"
                style={{ background: "#fee2e2", color: "#b91c1c", borderColor: "#fca5a5" }}
                onClick={() =>
                  promptDelete(
                    "visitor",
                    selectedRecord._id,
                    selectedRecord.ip,
                    `Target: ${selectedRecord.url || selectedRecord.slug || "Home"} • Time: ${formatTimestamp(selectedRecord.createdAt)}`,
                    null,
                    false
                  )
                }
              >
                🗑️ Delete Record
              </button>
              <button
                type="button"
                className="analytics-modal-footer-btn"
                onClick={() => setSelectedRecord(null)}
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PERMANENT DELETION WARNING MODAL                               */}
      {/* ============================================================== */}
      {deleteModalItem && (
        <div
          className="analytics-modal-backdrop"
          onClick={() => !isDeleting && setDeleteModalItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="analytics-modal analytics-delete-warning-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="analytics-delete-modal-icon">⚠️</div>
            <h3 className="analytics-delete-modal-title">Confirm Permanent Deletion</h3>
            <p className="analytics-delete-modal-subtitle">
              Are you sure you want to permanently delete this record? This action cannot be undone.
            </p>

            <div className="analytics-delete-modal-item-box">
              <span className="analytics-delete-pill">{deleteModalItem.type?.toUpperCase()}</span>
              <strong className="analytics-delete-name">{deleteModalItem.title}</strong>
              {deleteModalItem.subtitle && (
                <span className="analytics-delete-details">{deleteModalItem.subtitle}</span>
              )}
              {deleteModalItem.hasCloudinary && (
                <div className="analytics-delete-cloud-alert">
                  <span>☁️</span>
                  <span>
                    All uploaded portrait &amp; gallery photos in Cloudinary will be destroyed immediately.
                  </span>
                </div>
              )}
            </div>

            {deleteError && (
              <div className="analytics-delete-error-box">
                ⚠️ {deleteError}
              </div>
            )}

            <div className="analytics-delete-actions">
              <button
                type="button"
                className="analytics-delete-cancel-btn"
                onClick={() => setDeleteModalItem(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="analytics-delete-confirm-btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "🗑️ Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CONVERT TEMPLATE CONFIRMATION MODAL                            */}
      {/* ============================================================== */}
      {convertModalTemplate && (
        <div
          className="analytics-modal-backdrop"
          onClick={() => !isConverting && setConvertModalTemplate(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="analytics-modal"
            style={{ maxWidth: "480px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="analytics-modal-header" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#ecfdf5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                  }}
                >
                  🪄
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                    Convert Template to Live Link
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                    Create live celebration page without payment
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="analytics-modal-close-btn"
                onClick={() => !isConverting && setConvertModalTemplate(null)}
                disabled={isConverting}
              >
                ✕
              </button>
            </div>

            <div className="analytics-modal-body" style={{ padding: "20px" }}>
              <p style={{ margin: "0 0 16px 0", fontSize: "15px", color: "#1e293b", fontWeight: 600, lineHeight: 1.5 }}>
                Are you sure you want to convert this template into link?
              </p>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                {convertModalTemplate.photo ? (
                  <img
                    src={convertModalTemplate.photo}
                    alt={convertModalTemplate.name}
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #e2e8f0",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: "#fee2e2",
                      color: "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "18px",
                    }}
                  >
                    {convertModalTemplate.name ? convertModalTemplate.name[0].toUpperCase() : "🎂"}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                    {convertModalTemplate.name}
                    {convertModalTemplate.nickname ? ` (${convertModalTemplate.nickname})` : ""}
                  </h4>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {convertModalTemplate.userEmail ? (
                      <span style={{ color: "#2563eb", fontWeight: 600 }}>✉️ {convertModalTemplate.userEmail}</span>
                    ) : (
                      <span>Guest User</span>
                    )}
                    {(convertModalTemplate.date || convertModalTemplate.dob) && (
                      <span> • 📅 {convertModalTemplate.date || convertModalTemplate.dob}</span>
                    )}
                  </div>
                </div>
              </div>

              {convertError && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "10px 12px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#dc2626",
                    fontSize: "12.5px",
                    fontWeight: 600,
                  }}
                >
                  ⚠️ {convertError}
                </div>
              )}
            </div>

            <div
              className="analytics-modal-footer"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                padding: "14px 20px",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              <button
                type="button"
                className="analytics-modal-footer-btn"
                onClick={() => setConvertModalTemplate(null)}
                disabled={isConverting}
                style={{
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="analytics-modal-footer-btn"
                onClick={handleConfirmConvert}
                disabled={isConverting}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 18px",
                  fontWeight: 700,
                  cursor: isConverting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(16, 185, 129, 0.25)",
                }}
              >
                {isConverting ? "Converting..." : "Yes, Convert to Link ✨"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
