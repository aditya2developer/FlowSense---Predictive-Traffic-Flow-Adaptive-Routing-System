import { useState, useEffect } from "react";
import {
  Database,
  Layers,
  Server,
  RefreshCw,
  Search,
  Table,
  Code2,
  Copy,
  Check,
  Download,
  Eye,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Zap,
  Info,
  FileText
} from "lucide-react";
import {
  fetchDatabaseOverview,
  fetchCollectionDocuments,
  downloadCollectionExport
} from "../api";

export default function DatabasePlatform() {
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [activeCollection, setActiveCollection] = useState("roadsegments");
  const [collectionData, setCollectionData] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [viewMode, setViewMode] = useState("table"); // "table" | "json" | "schema"
  const [showcaseMode, setShowcaseMode] = useState(true); // Presentation / showcase mode enabled by default

  // Selected document modal / inspector
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Database Overview on mount
  useEffect(() => {
    let active = true;
    fetchDatabaseOverview()
      .then((res) => {
        if (!active) return;
        if (res && res.success) {
          setOverview(res);
          if (res.collections && res.collections.length > 0) {
            setActiveCollection((prev) =>
              res.collections.some((c) => c.name === prev) ? prev : res.collections[0].name
            );
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load DB overview:", err);
      })
      .finally(() => {
        if (active) setLoadingOverview(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Load documents when active collection, page, limit, or debounced search changes
  useEffect(() => {
    if (activeCollection) {
      loadDocuments(activeCollection, page, limit, debouncedSearch);
    }
  }, [activeCollection, page, limit, debouncedSearch]);

  async function loadOverview() {
    setLoadingOverview(true);
    try {
      const res = await fetchDatabaseOverview();
      if (res && res.success) {
        setOverview(res);
        if (res.collections && res.collections.length > 0) {
          setActiveCollection((prev) =>
            res.collections.some((c) => c.name === prev) ? prev : res.collections[0].name
          );
        }
      }
    } catch (err) {
      console.error("Failed to load DB overview:", err);
    } finally {
      setLoadingOverview(false);
    }
  }

  async function loadDocuments(colName, curPage, curLimit, curSearch) {
    setLoadingDocs(true);
    try {
      const res = await fetchCollectionDocuments(colName, {
        page: curPage,
        limit: curLimit,
        search: curSearch
      });
      if (res && res.success) {
        setCollectionData(res);
      }
    } catch (err) {
      console.error(`Failed to load ${colName} docs:`, err);
    } finally {
      setLoadingDocs(false);
    }
  }

  function handleCopy(text, key) {
    navigator.clipboard.writeText(text);
    if (key === "modal-json") {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } else {
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1500);
    }
  }

  function renderCollectionIcon(name) {
    switch (name) {
      case "roadsegments":
        return "🛣️";
      case "trafficrecords":
        return "📊";
      case "incidents":
        return "🚨";
      case "weathers":
        return "🌧️";
      case "advisories":
        return "📢";
      case "users":
        return "👥";
      case "contactmessages":
        return "📬";
      default:
        return "📁";
    }
  }

  function getBadgeClass(val) {
    if (!val) return "cell-badge-default";
    const s = String(val).toUpperCase();
    if (s === "ACTIVE" || s === "OPEN" || s === "ONLINE" || s === "OPTIMAL") return "cell-badge-green";
    if (s === "RESOLVED" || s === "EXPIRED" || s === "CLOSED") return "cell-badge-gray";
    if (s === "HIGH" || s === "CRITICAL" || s === "ADMIN") return "cell-badge-red";
    if (s === "MEDIUM" || s === "AUTHORITY" || s === "MODERATE") return "cell-badge-amber";
    if (s === "LOW" || s === "PUBLIC" || s === "CITIZEN") return "cell-badge-blue";
    return "cell-badge-default";
  }

  const clusterHost = overview?.cluster?.host || "Encrypted Smart City Cloud";
  const dbName = overview?.cluster?.dbName || "flowsense";
  const clusterRegion = overview?.cluster?.region || "Asia South (India)";
  const totalDocs = overview?.stats?.totalDocuments || 0;
  const totalCols = overview?.stats?.totalCollections || 0;
  const latency = overview?.cluster?.pingLatencyMs || 0;

  return (
    <div className="db-platform-page">
      {/* TOP SHOWCASE / PRESENTATION BANNER */}
      <div className="db-showcase-bar">
        <div className="db-showcase-left">
          <div className="db-leaf-badge">
            <span className="db-leaf-icon">🍃</span>
            <strong>MongoDB Atlas Cloud Platform</strong>
          </div>
          <span className="db-divider-dot">•</span>
          <span className="db-live-indicator">
            <span className="live-ping-dot" />
            LIVE CLUSTER ({latency}ms)
          </span>
          <span className="db-divider-dot">•</span>
          <span className="db-region-text">{clusterRegion}</span>
        </div>

        <div className="db-showcase-right">
          <label className="showcase-toggle-label" title="Format IDs, mask credentials, and present clean UI for stakeholders">
            <input
              type="checkbox"
              checked={showcaseMode}
              onChange={(e) => setShowcaseMode(e.target.checked)}
            />
            <span className="showcase-toggle-custom" />
            <Sparkles size={14} className="showcase-sparkle" />
            <span>Showcase / Presentation Mode</span>
          </label>

          <button
            type="button"
            className="db-action-btn"
            onClick={() => {
              loadOverview();
              loadDocuments(activeCollection, page, limit, debouncedSearch);
            }}
            title="Refresh database live from Atlas"
          >
            <RefreshCw size={14} className={loadingOverview || loadingDocs ? "spin-icon" : ""} />
            <span>Refresh Atlas</span>
          </button>
        </div>
      </div>

      {/* CLUSTER TELEMETRY CARDS */}
      <div className="db-metrics-grid">
        <div className="db-metric-card">
          <div className="metric-icon-wrap icon-cyan">
            <Server size={20} />
          </div>
          <div>
            <div className="metric-card-label">Atlas Shard Host</div>
            <div className="metric-card-val host-val" title={clusterHost}>
              {clusterHost}
            </div>
            <div className="metric-card-sub">AWS ap-south-1 • M0 Shared</div>
          </div>
        </div>

        <div className="db-metric-card">
          <div className="metric-icon-wrap icon-emerald">
            <Database size={20} />
          </div>
          <div>
            <div className="metric-card-label">Active Database</div>
            <div className="metric-card-val text-emerald">{dbName}</div>
            <div className="metric-card-sub">Production Smart City DB</div>
          </div>
        </div>

        <div className="db-metric-card">
          <div className="metric-icon-wrap icon-purple">
            <Layers size={20} />
          </div>
          <div>
            <div className="metric-card-label">Total Collections</div>
            <div className="metric-card-val text-purple">{totalCols} Collections</div>
            <div className="metric-card-sub">Fully Indexed Schemas</div>
          </div>
        </div>

        <div className="db-metric-card">
          <div className="metric-icon-wrap icon-amber">
            <Zap size={20} />
          </div>
          <div>
            <div className="metric-card-label">Total Cloud Documents</div>
            <div className="metric-card-val text-amber">{totalDocs.toLocaleString()}</div>
            <div className="metric-card-sub">Time-Series &amp; GIS Records</div>
          </div>
        </div>
      </div>

      {/* MAIN EXPLORER WORKSPACE (Sidebar + Content) */}
      <div className="db-workspace-layout">
        {/* LEFT SIDEBAR: COLLECTIONS LIST */}
        <aside className="db-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title">
              <Database size={16} />
              <span>Collections ({overview?.collections?.length || 0})</span>
            </div>
            <span className="sidebar-db-tag">{dbName}</span>
          </div>

          <div className="collections-nav-list">
            {overview?.collections?.map((col) => {
              const isActive = activeCollection === col.name;
              return (
                <button
                  key={col.name}
                  type="button"
                  className={`collection-nav-item ${isActive ? "active-collection" : ""}`}
                  onClick={() => {
                    setActiveCollection(col.name);
                    setPage(1);
                    setSearchQuery("");
                  }}
                >
                  <div className="col-nav-left">
                    <span className="col-emoji">{renderCollectionIcon(col.name)}</span>
                    <div className="col-name-wrap">
                      <span className="col-nav-name">{col.name}</span>
                      <span className="col-nav-idx">{col.indexCount} {col.indexCount === 1 ? "index" : "indexes"}</span>
                    </div>
                  </div>
                  <span className={`col-nav-count ${isActive ? "count-active" : ""}`}>
                    {col.count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* PROTECTED DATA NOTICE WIDGET */}
          <div className="sidebar-connection-widget">
            <div className="conn-widget-header">
              <ShieldCheck size={14} className="text-emerald" />
              <span>Privacy &amp; Access Control</span>
            </div>
            <p className="conn-widget-hint">
              Confidential records, personal emails, phone numbers, and credentials are hidden and restricted strictly to authorized Administrators.
            </p>
          </div>
        </aside>

        {/* RIGHT CONTENT AREA: DOCUMENT VIEWER */}
        <main className="db-content-area">
          {/* COLLECTION TOP TOOLBAR */}
          <div className="db-content-header">
            <div className="col-header-info">
              <div className="col-header-title-row">
                <span className="col-big-emoji">{renderCollectionIcon(activeCollection)}</span>
                <h2>{activeCollection}</h2>
                <span className="col-badge-count">
                  {collectionData?.pagination?.totalDocuments !== undefined
                    ? `${collectionData.pagination.totalDocuments.toLocaleString()} total documents`
                    : "Querying..."}
                </span>
                {debouncedSearch && (
                  <span className="col-badge-filtered">
                    ({collectionData?.pagination?.filteredCount} matching)
                  </span>
                )}
              </div>
              <p className="col-schema-sub">
                MongoDB Namespace: <strong>{dbName}.{activeCollection}</strong>
              </p>
            </div>

            {/* ACTION CONTROLS */}
            <div className="col-header-actions">
              {/* VIEW SWITCHER */}
              <div className="db-view-mode-tabs">
                <button
                  type="button"
                  className={`view-mode-tab ${viewMode === "table" ? "active-tab" : ""}`}
                  onClick={() => setViewMode("table")}
                  title="Spreadsheet Table View"
                >
                  <Table size={14} />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  className={`view-mode-tab ${viewMode === "json" ? "active-tab" : ""}`}
                  onClick={() => setViewMode("json")}
                  title="Interactive JSON View"
                >
                  <Code2 size={14} />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  className={`view-mode-tab ${viewMode === "schema" ? "active-tab" : ""}`}
                  onClick={() => setViewMode("schema")}
                  title="Schema Structure Inspector"
                >
                  <SlidersHorizontal size={14} />
                  <span>Schema</span>
                </button>
              </div>

              {/* EXPORT JSON BUTTON */}
              <button
                type="button"
                onClick={() => downloadCollectionExport(activeCollection)}
                className="db-export-btn"
                title="Download entire collection as JSON"
              >
                <Download size={14} />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* SEARCH & FILTER BAR */}
          <div className="db-filter-bar">
            <div className="db-search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder={`Search ${activeCollection} across fields (city, road, status, email, name)...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="db-filter-right">
              <span className="items-per-page-label">Show</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="db-limit-select"
              >
                <option value={10}>10 rows</option>
                <option value={15}>15 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>
          </div>

          {/* DOCUMENTS DISPLAY AREA */}
          <div className="db-documents-container">
            {loadingDocs ? (
              <div className="db-loading-state">
                <div className="db-loading-spinner" />
                <p>Querying MongoDB Atlas collection <code>{activeCollection}</code>...</p>
              </div>
            ) : !collectionData?.documents || collectionData.documents.length === 0 ? (
              <div className="db-empty-state">
                <Database size={40} className="empty-icon" />
                <h3>No documents found</h3>
                <p>
                  {debouncedSearch
                    ? `No records in ${activeCollection} matched "${debouncedSearch}". Try clearing your search.`
                    : `The collection "${activeCollection}" is currently empty.`}
                </p>
                {debouncedSearch && (
                  <button
                    type="button"
                    className="db-action-btn"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : viewMode === "table" ? (
              /* TABLE VIEW */
              <div className="db-table-responsive">
                <table className="db-documents-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px" }}>#</th>
                      <th style={{ width: "220px" }}>_id</th>
                      {collectionData.schema
                        ?.filter((s) => s.field !== "_id" && s.field !== "__v")
                        .slice(0, 7)
                        .map((s) => (
                          <th key={s.field}>
                            <div className="th-field-wrap">
                              <span>{s.field}</span>
                              <span className="th-field-type">{s.type}</span>
                            </div>
                          </th>
                        ))}
                      <th style={{ width: "90px", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectionData.documents.map((doc, idx) => {
                      const docIdStr = String(doc._id);
                      const rowNum = (page - 1) * limit + idx + 1;
                      const otherFields = collectionData.schema
                        ?.filter((s) => s.field !== "_id" && s.field !== "__v")
                        .slice(0, 7);

                      return (
                        <tr key={docIdStr} className="db-table-row">
                          <td className="row-num-cell">{rowNum}</td>
                          <td className="id-cell">
                            <div className="id-chip">
                              <span className="id-text">
                                {showcaseMode ? docIdStr.slice(-8) : docIdStr}
                              </span>
                              <button
                                type="button"
                                className="copy-cell-btn"
                                onClick={() => handleCopy(docIdStr, docIdStr)}
                                title="Copy ObjectId"
                              >
                                {copiedId === docIdStr ? (
                                  <Check size={12} className="text-emerald" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          </td>

                          {otherFields.map((f) => {
                            const val = doc[f.field];
                            let rendered = "-";

                            if (val !== undefined && val !== null) {
                              if (typeof val === "boolean") {
                                rendered = val ? "true" : "false";
                              } else if (Array.isArray(val)) {
                                rendered = `[${val.length} items]`;
                              } else if (typeof val === "object") {
                                rendered = JSON.stringify(val).slice(0, 35) + "...";
                              } else {
                                rendered = String(val);
                              }
                            }

                            const isStatusOrRole =
                              f.field === "status" ||
                              f.field === "role" ||
                              f.field === "severity" ||
                              f.field === "roadType";

                            return (
                              <td key={f.field} className="data-cell">
                                {isStatusOrRole ? (
                                  <span className={`cell-badge ${getBadgeClass(rendered)}`}>
                                    {rendered}
                                  </span>
                                ) : (
                                  <span className="cell-text" title={String(val)}>
                                    {rendered}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="inspect-doc-btn"
                              onClick={() => setSelectedDoc(doc)}
                              title="Inspect full JSON document"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : viewMode === "json" ? (
              /* JSON VIEW */
              <div className="db-json-cards-list">
                {collectionData.documents.map((doc, idx) => {
                  const docIdStr = String(doc._id);
                  const docJson = JSON.stringify(doc, null, 2);

                  return (
                    <div key={docIdStr} className="db-json-card">
                      <div className="json-card-header">
                        <div className="json-card-title">
                          <span className="json-doc-num">#{(page - 1) * limit + idx + 1}</span>
                          <span className="json-id-badge">_id: {docIdStr}</span>
                          {doc.roadName && <span className="json-tag">{doc.roadName}</span>}
                          {doc.name && <span className="json-tag">{doc.name}</span>}
                          {doc.title && <span className="json-tag">{doc.title}</span>}
                        </div>
                        <button
                          type="button"
                          className="json-copy-btn"
                          onClick={() => handleCopy(docJson, `json-${docIdStr}`)}
                          title="Copy Document JSON"
                        >
                          {copiedId === `json-${docIdStr}` ? (
                            <>
                              <Check size={13} className="text-emerald" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="json-pre-code">
                        <code>{docJson}</code>
                      </pre>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* SCHEMA VIEW */
              <div className="db-schema-view-panel">
                <div className="schema-intro-box">
                  <Info size={16} className="text-cyan" />
                  <div>
                    <h4>Inferred Schema Structure for <code>{activeCollection}</code></h4>
                    <p>
                      Field names and BSON data types dynamically extracted across active Atlas documents.
                    </p>
                  </div>
                </div>

                <div className="schema-table-wrap">
                  <table className="db-schema-table">
                    <thead>
                      <tr>
                        <th>Field Name</th>
                        <th>BSON / JSON Data Type</th>
                        <th>Sample Occurrence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collectionData.schema?.map((item) => (
                        <tr key={item.field}>
                          <td className="field-name-cell">
                            <code>{item.field}</code>
                          </td>
                          <td className="field-type-cell">
                            <span className="type-pill">{item.type}</span>
                          </td>
                          <td className="field-desc-cell">
                            {item.field === "_id" && "Unique MongoDB ObjectId primary key"}
                            {item.field === "roadId" && "Highway corridor identifier (e.g. RD001, RD002)"}
                            {item.field === "coordinates" && "GeoJSON GIS latitude/longitude waypoints"}
                            {item.field === "speed" && "Speed in km/h recorded by induction loop or radar"}
                            {item.field === "congestionIndex" && "Normalized traffic density factor (0.00 to 1.00)"}
                            {item.field === "timestamp" && "UTC ISO timestamp of telemetry event"}
                            {item.field === "password" && "Hashed bcrypt credential (protected)"}
                            {item.field === "role" && "RBAC Permission Tier: ADMIN, AUTHORITY, or PUBLIC"}
                            {item.field === "severity" && "Hazard level: LOW, MEDIUM, HIGH, or CRITICAL"}
                            {item.field === "coordinates" && "Multi-point polyline coordinates for map routing"}
                            {![
                              "_id",
                              "roadId",
                              "coordinates",
                              "speed",
                              "congestionIndex",
                              "timestamp",
                              "password",
                              "role",
                              "severity"
                            ].includes(item.field) && "Present in document collection"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* PAGINATION CONTROLS */}
          {collectionData?.pagination && collectionData.pagination.totalPages > 1 && (
            <div className="db-pagination-bar">
              <span className="pagination-info">
                Page <strong>{page}</strong> of{" "}
                <strong>{collectionData.pagination.totalPages}</strong> (
                {collectionData.pagination.filteredCount.toLocaleString()} items)
              </span>

              <div className="pagination-buttons">
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <div className="page-pills">
                  {Array.from(
                    { length: Math.min(5, collectionData.pagination.totalPages) },
                    (_, i) => {
                      let pNum = i + 1;
                      if (collectionData.pagination.totalPages > 5 && page > 3) {
                        pNum = page - 3 + i + 1;
                        if (pNum > collectionData.pagination.totalPages) {
                          pNum = collectionData.pagination.totalPages - (4 - i);
                        }
                      }
                      return (
                        <button
                          key={pNum}
                          type="button"
                          className={`page-num-pill ${page === pNum ? "active-page" : ""}`}
                          onClick={() => setPage(pNum)}
                        >
                          {pNum}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  type="button"
                  className="page-btn"
                  onClick={() =>
                    setPage((p) => Math.min(collectionData.pagination.totalPages, p + 1))
                  }
                  disabled={page >= collectionData.pagination.totalPages}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* DOCUMENT INSPECTION MODAL */}
      {selectedDoc && (
        <div className="db-modal-overlay" onClick={() => setSelectedDoc(null)}>
          <div className="db-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="db-modal-header">
              <div className="modal-title-wrap">
                <FileText size={18} className="text-cyan" />
                <h3>MongoDB Document Inspector</h3>
                <span className="modal-col-tag">{activeCollection}</span>
              </div>
              <div className="modal-header-actions">
                <button
                  type="button"
                  className="db-action-btn"
                  onClick={() => handleCopy(JSON.stringify(selectedDoc, null, 2), "modal-json")}
                >
                  {copiedJson ? (
                    <>
                      <Check size={14} className="text-emerald" />
                      <span>Copied JSON</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Document</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setSelectedDoc(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="db-modal-body">
              <div className="modal-id-row">
                <span className="modal-label">ObjectId (_id):</span>
                <code className="modal-val">{String(selectedDoc._id)}</code>
              </div>

              <div className="modal-code-container">
                <pre className="modal-json-pre">
                  <code>{JSON.stringify(selectedDoc, null, 2)}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
