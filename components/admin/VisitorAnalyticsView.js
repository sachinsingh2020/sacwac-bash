"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  const [activeMainTab, setActiveMainTab] = useState("buyers"); // "buyers" | "visitors"
  const [selectedSlug, setSelectedSlug] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [buyerSearchQuery, setBuyerSearchQuery] = useState("");
  const [visitorFilter, setVisitorFilter] = useState("all"); // "all" | "paid" | "home"
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [copiedUa, setCopiedUa] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState("");
  const [copiedPayId, setCopiedPayId] = useState("");

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

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

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
          <span>Successful Buyers & Paid Links</span>
          <span className="analytics-tab-pill-badge badge-green">
            🎉 {data.paidBuyersCount || 0} Paid
          </span>
        </button>

        <button
          type="button"
          className={`analytics-view-tab-btn ${activeMainTab === "visitors" ? "active" : ""}`}
          onClick={() => setActiveMainTab("visitors")}
        >
          <span>📋</span>
          <span>All Visitor Traffic</span>
          <span className="analytics-tab-pill-badge">
            {data.summary?.total || 0} Visits
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

          {/* Quick Metrics for Paid Orders */}
          <div className="analytics-stats-grid">
            <div className="analytics-stat-card card-today">
              <div className="analytics-stat-icon">🎉</div>
              <div className="analytics-stat-body">
                <span className="analytics-stat-label">Paid Celebrations</span>
                <div className="analytics-stat-value">{data.paidBuyersCount || 0}</div>
                <span className="analytics-stat-sub">Verified customer orders</span>
              </div>
            </div>

            <div className="analytics-stat-card card-week">
              <div className="analytics-stat-icon">💰</div>
              <div className="analytics-stat-body">
                <span className="analytics-stat-label">Total Revenue</span>
                <div className="analytics-stat-value">₹{(data.paidBuyersCount || 0) * 99}</div>
                <span className="analytics-stat-sub">From ₹99 promotional offer</span>
              </div>
            </div>

            <div className="analytics-stat-card card-month">
              <div className="analytics-stat-icon">👁️</div>
              <div className="analytics-stat-body">
                <span className="analytics-stat-label">Paid Links Traffic</span>
                <div className="analytics-stat-value">{totalPaidViews}</div>
                <span className="analytics-stat-sub">Total views across paid links</span>
              </div>
            </div>

            <div className="analytics-stat-card card-alltime">
              <div className="analytics-stat-icon">⏳</div>
              <div className="analytics-stat-body">
                <span className="analytics-stat-label">Latest Order</span>
                <div className="analytics-stat-value" style={{ fontSize: "16px", marginTop: "4px" }}>
                  {data.paidBuyers && data.paidBuyers.length > 0
                    ? formatTimestamp(data.paidBuyers[0].createdAt).split(",")[0]
                    : "None yet"}
                </div>
                <span className="analytics-stat-sub">
                  {data.paidBuyers && data.paidBuyers.length > 0
                    ? formatTimestamp(data.paidBuyers[0].createdAt).split(",")[1] || ""
                    : "No orders yet"}
                </span>
              </div>
            </div>
          </div>

          {/* Paid Buyers Table Card */}
          <div className="buyers-table-card">
            <div className="buyers-table-head-row">
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 800, color: "#36242a" }}>
                  🛍️ Paid Buyers Records ({filteredBuyers.length})
                </h3>
                <span style={{ fontSize: "12px", color: "#8c737c" }}>
                  Detailed list of all customers who paid and their published links.
                </span>
              </div>

              <input
                type="text"
                className="analytics-search-input"
                placeholder="Search Name, Slug, Payment ID (pay_...)"
                value={buyerSearchQuery}
                onChange={(e) => setBuyerSearchQuery(e.target.value)}
                style={{ minWidth: "260px" }}
              />
            </div>

            {filteredBuyers.length === 0 ? (
              <div className="analytics-empty">
                <div className="analytics-empty-icon">💳</div>
                <strong>No paid buyer records found.</strong>
                <p>When visitors complete checkout via Razorpay, their published link and payment IDs will appear here automatically.</p>
              </div>
            ) : (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Recipient / Buyer</th>
                      <th>Published Link</th>
                      <th>Payment Status & IDs</th>
                      <th>Purchased At</th>
                      <th>Views / Traffic</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuyers.map((b) => (
                      <tr key={b.id}>
                        {/* Recipient */}
                        <td>
                          <div className="buyers-recipient-cell">
                            {b.photo ? (
                              <img src={b.photo} alt={b.name} className="buyers-avatar" />
                            ) : (
                              <div className="buyers-avatar-monogram">
                                {b.name ? b.name[0].toUpperCase() : "🎂"}
                              </div>
                            )}
                            <div className="buyers-info-col">
                              <span className="buyers-name">{b.name}</span>
                              <span className="buyers-meta-sub">
                                {b.nickname ? `"${b.nickname}"` : ""}
                                {b.age ? ` • Age ${b.age}` : ""}
                                {b.date ? ` • ${b.date}` : ""}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Published Link */}
                        <td>
                          <div className="buyers-link-chip-group">
                            <a
                              href={`/${b.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="buyers-link-chip"
                              title="Open live celebration page"
                            >
                              <span>/{b.slug}</span>
                              <span>↗</span>
                            </a>
                            <button
                              type="button"
                              className="buyers-copy-btn"
                              onClick={() => handleCopyLink(b.slug)}
                              title="Copy link to clipboard"
                            >
                              {copiedSlug === b.slug ? "✓ Copied!" : "📋 Copy"}
                            </button>
                          </div>
                        </td>

                        {/* Payment Verification & Razorpay IDs */}
                        <td>
                          <div className="buyers-pay-badge-box">
                            <span className="buyers-status-pill">
                              <span className="online-dot" style={{ width: "6px", height: "6px", background: "#1f8a4c" }} />
                              Verified Paid
                            </span>
                            {b.paymentId && (
                              <span
                                className="buyers-payment-id-code"
                                onClick={() => handleCopyPayId(b.paymentId)}
                                title="Click to copy Payment ID"
                              >
                                {b.paymentId}
                                <span style={{ opacity: 0.6 }}>{copiedPayId === b.paymentId ? "✓" : "📋"}</span>
                              </span>
                            )}
                            {b.orderId && (
                              <span
                                className="buyers-payment-id-code"
                                style={{ background: "#fdf8fa", color: "#8a6d76" }}
                                onClick={() => handleCopyPayId(b.orderId)}
                                title="Click to copy Order ID"
                              >
                                {b.orderId}
                                <span style={{ opacity: 0.6 }}>{copiedPayId === b.orderId ? "✓" : "📋"}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Purchased Timestamp */}
                        <td>
                          <span style={{ fontSize: "12px", color: "#61474f", whiteSpace: "nowrap" }}>
                            {formatTimestamp(b.createdAt)}
                          </span>
                        </td>

                        {/* Views & Traffic */}
                        <td>
                          <div className="buyers-traffic-stat">
                            <span className="buyers-traffic-num">
                              <span>👁️</span>
                              <span>{b.totalVisits} visits</span>
                            </span>
                            <span className="buyers-traffic-last">
                              {b.uniqueVisitors > 0 ? `(${b.uniqueVisitors} unique)` : "No visitors yet"}
                            </span>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td>
                          <div className="buyers-action-row">
                            <button
                              type="button"
                              className="buyers-action-inspect-btn"
                              onClick={() => handleInspectBuyerTraffic(b.slug)}
                              title="Filter visitor records for this link"
                            >
                              <span>🔍</span>
                              <span>View Traffic</span>
                            </button>

                            <a
                              href={`/${b.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="buyers-action-view-btn"
                              title="Open live customer page"
                            >
                              <span>Open ↗</span>
                            </a>
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
      {/* TAB 2: ALL VISITOR TRAFFIC                                     */}
      {/* ============================================================== */}
      {activeMainTab === "visitors" && (
        <section className="visitors-traffic-section" aria-label="Visitor Traffic Section">
          {/* Header & Controls */}
          <div className="analytics-header-row">
            <div>
              <h2>📊 Real-Time Visitor Analytics</h2>
              <p>Comprehensive tracking of all incoming visits, devices, and link traffic.</p>
            </div>

            <div className="analytics-controls">
              {/* Link / Slug selector */}
              <div className="analytics-filter-group">
                <label htmlFor="analytics-slug-select">Celebration Link:</label>
                <select
                  id="analytics-slug-select"
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  className="analytics-select"
                >
                  <option value="all">🌐 All Celebrations & Landing Page</option>
                  {(data.availableSlugs || []).map((slug) => (
                    <option key={slug} value={slug}>
                      /{slug} {data.paidSlugs?.includes(slug) ? "💎 (Paid)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                className="analytics-refresh-btn"
                onClick={fetchAnalytics}
                disabled={loading}
                title="Refresh visitor metrics"
              >
                {loading ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>
          </div>

          {/* Main Counter Cards */}
          <div className="analytics-stats-grid">
            <div className="analytics-stat-card card-today">
              <div className="analytics-stat-icon">⚡</div>
              <div className="analytics-stat-body">
                <span className="analytics-stat-label">Today&apos;s Visits</span>
                <div className="analytics-stat-value">{data.summary?.today || 0}</div>
                <span className="analytics-stat-sub">
                  {data.summary?.uniqueToday || 0} unique today
                </span>
              </div>
            </div>

            <div className="analytics-stat-card card-week">
              <div className="analytics-stat-icon">📅</div>
              <div className="analytics-stat-body">
                <span className="analytics-stat-label">This Week</span>
                <div className="analytics-stat-value">{data.summary?.thisWeek || 0}</div>
                <span className="analytics-stat-sub">Rolling week total</span>
              </div>
            </div>

            <div className="analytics-stat-card card-month">
              <div className="analytics-stat-icon">🗓️</div>
              <div className="analytics-stat-body">
                <span className="analytics-stat-label">This Month</span>
                <div className="analytics-stat-value">{data.summary?.thisMonth || 0}</div>
                <span className="analytics-stat-sub">Current calendar month</span>
              </div>
            </div>

            <div className="analytics-stat-card card-year">
              <div className="analytics-stat-icon">✨</div>
              <div className="analytics-stat-body">
                <span className="analytics-stat-label">This Year</span>
                <div className="analytics-stat-value">{data.summary?.thisYear || 0}</div>
                <span className="analytics-stat-sub">Full year visits</span>
              </div>
            </div>

            <div className="analytics-stat-card card-alltime">
              <div className="analytics-stat-icon">🚀</div>
              <div className="analytics-stat-body">
                <span className="analytics-stat-label">All-Time Total</span>
                <div className="analytics-stat-value">{data.summary?.total || 0}</div>
                <span className="analytics-stat-sub">
                  {data.summary?.uniqueTotal || 0} unique visitors
                </span>
              </div>
            </div>
          </div>

          {/* Custom Date Filter Section */}
          <div className="analytics-custom-date-box">
            <div className="analytics-custom-date-header">
              <div>
                <h3>📅 Inspect Custom Date Traffic</h3>
                <p>Select any specific day to check the exact number of people who opened your links.</p>
              </div>
              <div className="analytics-custom-date-inputs">
                <input
                  type="date"
                  className="analytics-date-picker"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
                {customDate && (
                  <button
                    type="button"
                    className="analytics-date-clear-btn"
                    onClick={() => setCustomDate("")}
                  >
                    Clear Date
                  </button>
                )}
              </div>
            </div>

            {customDate && data.customDate && (
              <div className="analytics-custom-date-result">
                <div className="analytics-custom-result-pill">
                  <span>Date:</span> <strong>{data.customDate.formatted || customDate}</strong>
                </div>
                <div className="analytics-custom-result-pill highlight">
                  <span>Visits on this day:</span>{" "}
                  <strong>{data.customDate.count} visits</strong>
                </div>
                <div className="analytics-custom-result-pill">
                  <span>Unique visitors:</span>{" "}
                  <strong>{data.customDate.uniqueVisitors} unique</strong>
                </div>
              </div>
            )}
          </div>

          {/* Breakdowns Row (Devices & Browsers) */}
          <div className="analytics-breakdowns-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {/* Top Devices */}
            <div className="analytics-breakdown-card">
              <h4 className="analytics-breakdown-title">📱 Device Breakdown</h4>
              <div className="analytics-breakdown-items">
                {(data.breakdowns?.devices || []).length > 0 ? (
                  data.breakdowns.devices.map((d) => (
                    <span key={d.name} className="analytics-pill-item">
                      <span>
                        {d.name === "Mobile" ? "📱" : d.name === "Tablet" ? "📟" : "💻"}
                      </span>
                      <span>{d.name}</span>
                      <strong>{d.count}</strong>
                    </span>
                  ))
                ) : (
                  <span className="muted">No device data yet</span>
                )}
              </div>
            </div>

            {/* Top Browsers */}
            <div className="analytics-breakdown-card">
              <h4 className="analytics-breakdown-title">🌐 Browsers</h4>
              <div className="analytics-breakdown-items">
                {(data.breakdowns?.browsers || []).length > 0 ? (
                  data.breakdowns.browsers.map((b) => (
                    <span key={b.name} className="analytics-pill-item">
                      <span>🌐</span>
                      <span>{b.name}</span>
                      <strong>{b.count}</strong>
                    </span>
                  ))
                ) : (
                  <span className="muted">No browser data yet</span>
                )}
              </div>
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
                <span>🏠 Homepage Only</span>
                <span className="badge-num">{homeVisitorsCount}</span>
              </button>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="analytics-empty">
                <div className="analytics-empty-icon">👀</div>
                <strong>No visitor records found.</strong>
                <p>Visits will appear here in real time as people open your shared links.</p>
              </div>
            ) : (
              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Page / Link</th>
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
                              {r.isPaidLink && (
                                <span className="analytics-badge-paid" title="This link was purchased by a verified customer">
                                  💎 Paid
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="muted">Homepage (/)</span>
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
                            className="analytics-view-detail-btn"
                            onClick={() => setSelectedRecord(r)}
                          >
                            Inspect Details →
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

      {/* Detailed Modal Popup for Selected Visitor Record */}
      {selectedRecord && (
        <div className="analytics-modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="analytics-modal-header">
              <div className="analytics-modal-header-info">
                <h3>🔍 Complete Visitor Record</h3>
                <span className="analytics-modal-id">Record ID: {selectedRecord.id}</span>
              </div>
              <button
                type="button"
                className="analytics-modal-close"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="analytics-modal-body">
              {/* Network & Navigation Context */}
              <div className="analytics-detail-section">
                <h4 className="analytics-detail-section-title">
                  <span>🌐 Network & Visit Context</span>
                </h4>
                <div className="analytics-detail-grid">
                  <div className="analytics-detail-item">
                    <label>IP Address</label>
                    <span>{selectedRecord.ip}</span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Timezone</label>
                    <span>{selectedRecord.timezone || "N/A"}</span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Target Celebration Slug</label>
                    <span>
                      {selectedRecord.slug ? `/${selectedRecord.slug}` : "Landing Page (/)"}
                      {selectedRecord.isPaidLink ? " 💎 (Verified Paid Customer Link)" : ""}
                    </span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Full Target URL</label>
                    <span style={{ wordBreak: "break-all" }}>{selectedRecord.url || "N/A"}</span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Referrer (Where they came from)</label>
                    <span>{selectedRecord.referrer || "Direct / Bookmark"}</span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Visit Timestamp (Local / UTC)</label>
                    <span>{formatTimestamp(selectedRecord.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Device & System Section */}
              <div className="analytics-detail-section">
                <h4 className="analytics-detail-section-title">
                  <span>💻 Device, Browser & System</span>
                </h4>
                <div className="analytics-detail-grid">
                  <div className="analytics-detail-item">
                    <label>Device Type</label>
                    <span>
                      {selectedRecord.device === "Mobile"
                        ? "📱 Mobile Device"
                        : selectedRecord.device === "Tablet"
                        ? "📟 Tablet"
                        : "💻 Desktop Computer"}
                    </span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Operating System</label>
                    <span>
                      {selectedRecord.os} {selectedRecord.osVersion}
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
                  <div className="analytics-detail-item">
                    <label>Browser Language</label>
                    <span>{selectedRecord.language || "N/A"}</span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Persistent Visitor ID</label>
                    <span style={{ fontSize: "11px", fontFamily: "monospace" }}>
                      {selectedRecord.visitorId || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Raw User Agent */}
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
