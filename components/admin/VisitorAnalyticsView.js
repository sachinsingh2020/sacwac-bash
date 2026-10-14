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

  // Four main sections: "buyers" | "abandoned" | "users" | "visitors"
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
  const [previewingTemplate, setPreviewingTemplate] = useState(null);

  // Logged-in users state
  const [usersList, setUsersList] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");

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
    }
  }, [adminToken]);

  const fetchUsers = useCallback(async () => {
    try {
      const headers = {};
      if (adminToken) headers["x-admin-token"] = adminToken;
      const res = await fetch("/api/admin/users", { headers });
      if (res.ok) {
        const json = await res.json();
        setUsersList(Array.isArray(json) ? json : []);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchAnalytics();
    fetchAbandonedTemplates();
    fetchUsers();
  }, [fetchAnalytics, fetchAbandonedTemplates, fetchUsers]);

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

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return usersList;
    const q = userSearchQuery.toLowerCase();
    return usersList.filter((u) =>
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.name && u.name.toLowerCase().includes(q))
    );
  }, [usersList, userSearchQuery]);

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
            🎉 {data.paidBuyersCount || 0}
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
            {abandonedTemplates.length}
          </span>
        </button>

        <button
          type="button"
          className={`analytics-view-tab-btn ${activeMainTab === "users" ? "active" : ""}`}
          onClick={() => setActiveMainTab("users")}
        >
          <span>👥</span>
          <span>Logged In Users</span>
          <span className="analytics-tab-pill-badge" style={{ background: "#eff6ff", color: "#2563eb" }}>
            {usersList.length}
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
            {data.summary?.total || 0}
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
                      <th>Traffic to Link</th>
                      <th>Actions</th>
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
                          <div>
                            <span style={{ fontWeight: 700, color: "#16a34a", fontSize: "13px" }}>
                              ₹{b.amountPaid || 199}
                            </span>
                            <div style={{ marginTop: "3px" }}>
                              <span className="analytics-ip-code" style={{ fontSize: "11px" }}>
                                {b.paymentId || "N/A"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: "12px", color: "#613b48", fontWeight: 600 }}>
                            📅 {b.date || b.dob || "Not set"}
                          </span>
                        </td>

                        <td>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <span className="badge-num" style={{ background: "#fef0f3", color: "#d95775" }}>
                              {b.totalVisits || 0} views
                            </span>
                            <span style={{ fontSize: "11px", color: "#8a6e76" }}>
                              ({b.uniqueVisitors || 0} unique)
                            </span>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
            >
              ↻ Refresh Templates
            </button>
          </div>

          <div className="analytics-table-card">
            <div className="analytics-table-head-row">
              <h3 className="analytics-table-title">
                <span>📝 Drafted Celebrations ({abandonedTemplates.length})</span>
              </h3>
            </div>

            {abandonedTemplates.length === 0 ? (
              <div className="analytics-empty">
                <div className="analytics-empty-icon">🎨</div>
                <strong>No abandoned templates recorded yet.</strong>
                <p>When someone designs a celebration in the wizard and previews it without paying, their draft will be listed here.</p>
              </div>
            ) : (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Celebrant Details</th>
                      <th>Created At</th>
                      <th>User Email (if signed in)</th>
                      <th>IP &amp; Device</th>
                      <th>Photos &amp; Reasons</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abandonedTemplates.map((t) => (
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
                              <strong>{t.name}</strong>
                              {t.nickname && <span className="buyer-nickname">&ldquo;{t.nickname}&rdquo;</span>}
                              <span style={{ display: "block", fontSize: "11px", color: "#8a6d77" }}>
                                DOB: {t.date || t.dob || "N/A"} {t.age ? `(${t.age} yrs)` : ""}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: "11.5px", color: "#6e4f59", whiteSpace: "nowrap" }}>
                            {formatTimestamp(t.createdAt)}
                          </span>
                        </td>

                        <td>
                          {t.userEmail ? (
                            <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600 }}>
                              ✉️ {t.userEmail}
                            </span>
                          ) : (
                            <span className="muted">Guest (Not logged in)</span>
                          )}
                        </td>

                        <td>
                          <div>
                            <span className="analytics-ip-code" style={{ fontSize: "11px" }}>{t.clientIp || "Unknown"}</span>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: "12px", color: "#54303b" }}>
                            <span>📸 {(t.gallery || []).length} gallery</span> • <span>✦ {(t.reasons || []).length} reasons</span>
                          </div>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="analytics-view-btn"
                            onClick={() => setPreviewingTemplate(t)}
                            style={{ background: "#d95775", color: "#fff", borderColor: "#d95775" }}
                          >
                            👀 View Template
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* TAB 3: LOGGED IN USERS                                         */}
      {/* ============================================================== */}
      {activeMainTab === "users" && (
        <section className="users-section" aria-label="Logged In Users">
          <div className="buyers-header-card">
            <div className="buyers-header-title">
              <h3>
                <span>👥</span>
                <span>Dedicated Logged In Users Directory</span>
              </h3>
              <p>
                Permanent list of all registered and logged in users with their email addresses for your records and future communication.
              </p>
            </div>
            <button
              type="button"
              className="analytics-refresh-btn"
              onClick={fetchUsers}
            >
              ↻ Refresh Users
            </button>
          </div>

          <div className="analytics-table-card">
            <div className="analytics-table-head-row">
              <h3 className="analytics-table-title">
                <span>📧 Registered Users ({filteredUsers.length})</span>
              </h3>
              <input
                type="text"
                className="analytics-search-input"
                placeholder="Search email or name..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
            </div>

            {filteredUsers.length === 0 ? (
              <div className="analytics-empty">
                <div className="analytics-empty-icon">👥</div>
                <strong>No registered users found.</strong>
                <p>When visitors sign in via Google OAuth or Email OTP to claim the ₹49 rate, their profile and email are permanently saved here.</p>
              </div>
            ) : (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>User Name &amp; Profile</th>
                      <th>Email Address</th>
                      <th>Login Provider</th>
                      <th>First Joined</th>
                      <th>Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id || u.email}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {u.picture ? (
                              <img src={u.picture} alt={u.name} className="buyer-thumb-avatar" />
                            ) : (
                              <div className="buyer-monogram-avatar" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                                {u.name ? u.name[0].toUpperCase() : "U"}
                              </div>
                            )}
                            <strong>{u.name || "User"}</strong>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e3a8a" }}>
                            {u.email}
                          </span>
                        </td>

                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              background: u.provider === "google" ? "#fee2e2" : "#f1f5f9",
                              color: u.provider === "google" ? "#b91c1c" : "#475569",
                            }}
                          >
                            {u.provider === "google" ? "Google OAuth" : "Email OTP"}
                          </span>
                        </td>

                        <td>
                          <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                            {formatTimestamp(u.createdAt)}
                          </span>
                        </td>

                        <td>
                          <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                            {formatTimestamp(u.lastLoginAt || u.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* TAB 4: VISITOR ANALYTICS & TRAFFIC (Max 2,000 normal visits)    */}
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

          {/* Detailed Visitor Records Table */}
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
                          <button
                            type="button"
                            className="analytics-view-btn"
                            onClick={() => setSelectedRecord(r)}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Abandoned Template Preview Modal */}
      {previewingTemplate && (
        <div className="analytics-modal-backdrop" onClick={() => setPreviewingTemplate(null)}>
          <div
            className="analytics-modal"
            style={{ width: "95vw", height: "92vh", maxWidth: "1200px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="analytics-modal-header">
              <div>
                <h3>Created Template: {previewingTemplate.name}</h3>
                <p>Status: Drafted by user (Did not buy)</p>
              </div>
              <button
                type="button"
                className="analytics-modal-close-btn"
                onClick={() => setPreviewingTemplate(null)}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              <BirthdayExperience
                isPreview={true}
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

            <div className="analytics-modal-footer">
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
    </div>
  );
}
