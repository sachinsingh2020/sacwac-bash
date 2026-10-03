"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import "./VisitorAnalyticsView.css";

export default function VisitorAnalyticsView({ adminToken }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: { today: 0, uniqueToday: 0, thisWeek: 0, thisMonth: 0, thisYear: 0, total: 0, uniqueTotal: 0 },
    customDate: null,
    breakdowns: { devices: [], browsers: [], countries: [] },
    availableSlugs: [],
    records: [],
  });
  const [selectedSlug, setSelectedSlug] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [copiedUa, setCopiedUa] = useState(false);

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

  // Filter records by search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return data.records || [];
    const q = searchQuery.toLowerCase();
    return (data.records || []).filter((r) =>
      (r.ip && r.ip.toLowerCase().includes(q)) ||
      (r.city && r.city.toLowerCase().includes(q)) ||
      (r.country && r.country.toLowerCase().includes(q)) ||
      (r.slug && r.slug.toLowerCase().includes(q)) ||
      (r.browser && r.browser.toLowerCase().includes(q)) ||
      (r.os && r.os.toLowerCase().includes(q)) ||
      (r.referrer && r.referrer.toLowerCase().includes(q))
    );
  }, [data.records, searchQuery]);

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

  const getCountryFlag = (code) => {
    if (!code || code.length !== 2 || code === "LOC") return "🌐";
    try {
      const codePoints = code
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return "🌐";
    }
  };

  return (
    <div className="analytics-container">
      {/* Header & Controls */}
      <div className="analytics-header-row">
        <div>
          <h2>📊 Real-Time Visitor Analytics</h2>
          <p>Comprehensive tracking of all incoming visits, geolocation, devices, and link traffic.</p>
        </div>

        <div className="analytics-controls">
          {/* Slug Filter */}
          <select
            className="analytics-select"
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            aria-label="Filter by link"
          >
            <option value="all">All Pages & Links</option>
            {(data.availableSlugs || []).map((s) => (
              <option key={s} value={s}>
                /{s}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            <span>{loading ? "🔄" : "⚡"}</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Multiple Counts Grid (Today, This Week, This Month, This Year, All-time, Unique) */}
      <div className="analytics-stat-grid">
        <div className="analytics-stat-card highlight-card">
          <span className="analytics-stat-icon">📅</span>
          <span className="analytics-stat-label">Today's Visits</span>
          <span className="analytics-stat-val">{data.summary?.today || 0}</span>
          <span className="analytics-stat-sub">
            {data.summary?.uniqueToday || 0} unique visitors
          </span>
        </div>

        <div className="analytics-stat-card">
          <span className="analytics-stat-icon">📈</span>
          <span className="analytics-stat-label">This Week</span>
          <span className="analytics-stat-val">{data.summary?.thisWeek || 0}</span>
          <span className="analytics-stat-sub">Past 7 days</span>
        </div>

        <div className="analytics-stat-card">
          <span className="analytics-stat-icon">📆</span>
          <span className="analytics-stat-label">This Month</span>
          <span className="analytics-stat-val">{data.summary?.thisMonth || 0}</span>
          <span className="analytics-stat-sub">Current month</span>
        </div>

        <div className="analytics-stat-card">
          <span className="analytics-stat-icon">🗓️</span>
          <span className="analytics-stat-label">This Year</span>
          <span className="analytics-stat-val">{data.summary?.thisYear || 0}</span>
          <span className="analytics-stat-sub">Current calendar year</span>
        </div>

        <div className="analytics-stat-card">
          <span className="analytics-stat-icon">🌐</span>
          <span className="analytics-stat-label">All-Time Total</span>
          <span className="analytics-stat-val">{data.summary?.total || 0}</span>
          <span className="analytics-stat-sub">Total pageviews</span>
        </div>

        <div className="analytics-stat-card">
          <span className="analytics-stat-icon">👤</span>
          <span className="analytics-stat-label">Unique Visitors</span>
          <span className="analytics-stat-val">{data.summary?.uniqueTotal || 0}</span>
          <span className="analytics-stat-sub">Distinct devices</span>
        </div>
      </div>

      {/* Custom Date Inspection Tool */}
      <div className="analytics-custom-date-box">
        <div className="analytics-custom-left">
          <div className="analytics-custom-icon">🔍</div>
          <div>
            <h3 className="analytics-custom-title">Check Custom Date Visits</h3>
            <p className="analytics-custom-desc">
              Select any specific day to see how many people opened links on that exact date.
            </p>
          </div>
        </div>

        <div className="analytics-custom-right">
          <input
            type="date"
            className="analytics-date-input"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            aria-label="Pick custom date"
          />

          {data.customDate && (
            <div className="analytics-custom-result-badge">
              <span>{data.customDate.formatted}:</span>
              <strong>{data.customDate.count} visits</strong>
              <small>({data.customDate.uniqueVisitors} unique)</small>
            </div>
          )}

          {customDate && (
            <button
              type="button"
              className="analytics-clear-filter-btn"
              onClick={() => setCustomDate("")}
            >
              Clear Date Filter
            </button>
          )}
        </div>
      </div>

      {/* Breakdowns Row (Devices, Browsers, Countries) */}
      <div className="analytics-breakdown-row">
        {/* Top Devices */}
        <div className="analytics-breakdown-card">
          <h4 className="analytics-breakdown-title">📱 Visitor Devices</h4>
          <div className="analytics-breakdown-items">
            {(data.breakdowns?.devices || []).length > 0 ? (
              data.breakdowns.devices.map((d) => (
                <span key={d.name} className="analytics-pill-item">
                  <span>{d.name === "Mobile" ? "📱" : d.name === "Tablet" ? "📟" : "💻"}</span>
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
          <h4 className="analytics-breakdown-title">🌐 Top Browsers</h4>
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

        {/* Top Countries */}
        <div className="analytics-breakdown-card">
          <h4 className="analytics-breakdown-title">📍 Top Locations</h4>
          <div className="analytics-breakdown-items">
            {(data.breakdowns?.countries || []).length > 0 ? (
              data.breakdowns.countries.map((c) => (
                <span key={c.name} className="analytics-pill-item">
                  <span>{getCountryFlag(c.countryCode)}</span>
                  <span>{c.name}</span>
                  <strong>{c.count}</strong>
                </span>
              ))
            ) : (
              <span className="muted">No location data yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Visitor Records Table */}
      <div className="analytics-table-card">
        <div className="analytics-table-head-row">
          <h3 className="analytics-table-title">
            <span>📋 Detailed Visitor Records</span>
            <span className="count">({filteredRecords.length} records)</span>
          </h3>

          <input
            type="text"
            className="analytics-search-input"
            placeholder="Search IP, City, Link, OS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
                  <th>Location</th>
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
                        <a
                          href={`/${r.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="analytics-slug-chip"
                        >
                          /{r.slug}
                        </a>
                      ) : (
                        <span className="muted">Homepage (/)</span>
                      )}
                    </td>

                    <td>
                      <span className="analytics-ip-code">{r.ip}</span>
                    </td>

                    <td>
                      <div className="analytics-geo-badge">
                        <span>{getCountryFlag(r.countryCode)}</span>
                        <span>
                          {r.city && r.city !== "Unknown" && r.city !== "Localhost"
                            ? `${r.city}, ${r.country}`
                            : r.country && r.country !== "Unknown" && r.country !== "Local Network"
                            ? r.country
                            : "Location not captured"}
                        </span>
                      </div>
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
                          maxWidth: "130px",
                          display: "inline-block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={r.referrer}
                      >
                        {r.referrer.replace(/^https?:\/\/(www\.)?/, "")}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="analytics-view-btn"
                        onClick={() => setSelectedRecord(r)}
                      >
                        View Full Info 🔍
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Visitor Record Inspection Modal */}
      {selectedRecord && (
        <div
          className="analytics-modal-backdrop"
          onClick={() => setSelectedRecord(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="analytics-modal-header">
              <div>
                <h3>🔍 Full Visitor Record Information</h3>
                <p>Recorded at {formatTimestamp(selectedRecord.createdAt)}</p>
              </div>
              <button
                type="button"
                className="analytics-modal-close-btn"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="analytics-modal-body">
              {/* Geolocation Section */}
              <div className="analytics-detail-section">
                <h4 className="analytics-detail-section-title">
                  <span>📍 Geolocation & Network</span>
                </h4>
                <div className="analytics-detail-grid">
                  <div className="analytics-detail-item">
                    <label>IP Address</label>
                    <span>{selectedRecord.ip}</span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>City & Region</label>
                    <span>
                      {selectedRecord.city && selectedRecord.city !== "Unknown" && selectedRecord.city !== "Localhost"
                        ? `${selectedRecord.city}, ${selectedRecord.region}`
                        : "Location not captured"}
                    </span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Country</label>
                    <span>
                      {selectedRecord.country && selectedRecord.country !== "Unknown" && selectedRecord.country !== "Local Network"
                        ? `${getCountryFlag(selectedRecord.countryCode)} ${selectedRecord.country} (${selectedRecord.countryCode || "N/A"})`
                        : "Location not captured"}
                    </span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Postal / Zip Code</label>
                    <span>
                      {selectedRecord.postalCode && selectedRecord.postalCode !== "000000"
                        ? selectedRecord.postalCode
                        : "Not captured"}
                    </span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Coordinates (Lat / Long)</label>
                    <span>
                      {selectedRecord.isExactGps && selectedRecord.latitude && selectedRecord.longitude ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "#2ea76b", fontWeight: 600 }}>
                            📍 {selectedRecord.latitude.toFixed(5)}, {selectedRecord.longitude.toFixed(5)}
                          </span>
                          <a
                            href={`https://maps.google.com/?q=${selectedRecord.latitude},${selectedRecord.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#d95775", textDecoration: "underline", marginLeft: "4px" }}
                          >
                            Open Maps ↗
                          </a>
                        </span>
                      ) : (
                        <span style={{ color: "#8a757e", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          <span>⚠️</span> Location not captured
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>ISP / Network Provider</label>
                    <span>{selectedRecord.isp || "N/A"}</span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Timezone</label>
                    <span>{selectedRecord.timezone || "N/A"}</span>
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

              {/* Navigation & Link Details */}
              <div className="analytics-detail-section">
                <h4 className="analytics-detail-section-title">
                  <span>🧭 Navigation & Link Context</span>
                </h4>
                <div className="analytics-detail-grid">
                  <div className="analytics-detail-item">
                    <label>Target Celebration Slug</label>
                    <span>{selectedRecord.slug ? `/${selectedRecord.slug}` : "Landing Page (/)"}</span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Full Target URL</label>
                    <span style={{ wordBreak: "break-all" }}>{selectedRecord.url}</span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Referrer (Where they came from)</label>
                    <span>{selectedRecord.referrer || "Direct / Bookmark"}</span>
                  </div>
                  <div className="analytics-detail-item">
                    <label>Visit Timestamp (UTC / Local)</label>
                    <span>{formatTimestamp(selectedRecord.createdAt)}</span>
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
