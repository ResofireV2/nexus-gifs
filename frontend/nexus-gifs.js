(function () {
  "use strict";

  const React = window.React;
  const { useState, useEffect, useRef, useCallback } = React;
  const NE  = window.NexusExtensions;
  const NET = window.NexusExtensionTemplates;

  const SLUG     = "nexus-gifs";
  const BASE_API = "/api/v1/extensions/nexus-gifs/api/gifs";

  // ── Stable customer_id for guest users ───────────────────────────────────────
  function getCustomerId() {
    const key = "nexus-gifs-cid";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
      sessionStorage.setItem(key, id);
    }
    return id;
  }

  // ── API helpers ───────────────────────────────────────────────────────────────
  function apiGet(path) {
    const token = localStorage.getItem("nexus_token");
    return fetch(path, {
      headers: {
        "Content-Type":  "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      },
    }).then(r => r.json());
  }

  function apiPost(path, body) {
    const token = localStorage.getItem("nexus_token");
    return fetch(path, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(body),
    }).then(r => r.json());
  }

  function apiPatch(path, body) {
    const token = localStorage.getItem("nexus_token");
    return fetch(path, {
      method: "PATCH",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(body),
    }).then(r => r.json());
  }

  // ── KLIPY fetchers (via our backend proxy) ────────────────────────────────────
  function fetchTrending(type, page) {
    const cid = getCustomerId();
    return apiGet(`${BASE_API}/trending?type=${type}&page=${page}&customer_id=${cid}`);
  }

  function fetchSearch(type, query, page) {
    const cid = getCustomerId();
    const q   = encodeURIComponent(query);
    return apiGet(`${BASE_API}/search?type=${type}&q=${q}&page=${page}&customer_id=${cid}`);
  }

  function fireShare(type, slug, query) {
    apiPost(`${BASE_API}/share`, {
      type,
      slug,
      query: query || "",
      customer_id: getCustomerId(),
    }).catch(() => {});
  }

  // ── CSS injected once ─────────────────────────────────────────────────────────
  (function injectCSS() {
    if (document.getElementById("nexus-gifs-styles")) return;
    const style = document.createElement("style");
    style.id = "nexus-gifs-styles";
    style.textContent = `
/* Modal backdrop */
.ngifs-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.72);
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  animation: ngifs-fade-in 0.15s ease;
}
@media (min-width: 600px) {
  .ngifs-backdrop {
    align-items: center;
    padding: 20px;
  }
}
@keyframes ngifs-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Modal shell */
.ngifs-modal {
  background: var(--s1, #13121e);
  border: 0.5px solid var(--b2, rgba(255,255,255,0.10));
  border-radius: 18px 18px 0 0;
  width: 100%;
  max-width: 560px;
  height: 88vh;
  max-height: 640px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -8px 48px rgba(0,0,0,0.6);
  animation: ngifs-slide-up 0.2s cubic-bezier(0.34,1.56,0.64,1);
}
@media (min-width: 600px) {
  .ngifs-modal {
    border-radius: 18px;
    height: 80vh;
    box-shadow: 0 24px 80px rgba(0,0,0,0.7);
    animation: ngifs-pop-in 0.2s cubic-bezier(0.34,1.56,0.64,1);
  }
}
@keyframes ngifs-slide-up {
  from { transform: translateY(100%); opacity: 0.6; }
  to   { transform: translateY(0);    opacity: 1;   }
}
@keyframes ngifs-pop-in {
  from { transform: scale(0.94) translateY(8px); opacity: 0; }
  to   { transform: scale(1)    translateY(0);   opacity: 1; }
}

/* Header */
.ngifs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 0;
  flex-shrink: 0;
}
.ngifs-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--t1, #f0eeff);
  letter-spacing: -0.2px;
}
.ngifs-close {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--b1, rgba(255,255,255,0.07));
  border: none;
  color: var(--t3, rgba(255,255,255,0.55));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: background 0.1s, color 0.1s;
  flex-shrink: 0;
}
.ngifs-close:hover {
  background: var(--b2, rgba(255,255,255,0.10));
  color: var(--t1, #f0eeff);
}

/* Tabs */
.ngifs-tabs {
  display: flex;
  gap: 4px;
  padding: 10px 16px 0;
  flex-shrink: 0;
}
.ngifs-tab {
  font-size: 13px;
  font-weight: 500;
  padding: 6px 16px;
  border-radius: 20px;
  border: 0.5px solid transparent;
  background: transparent;
  color: var(--t4, rgba(255,255,255,0.38));
  cursor: pointer;
  transition: all 0.12s;
  font-family: inherit;
}
.ngifs-tab:hover {
  color: var(--t2, rgba(255,255,255,0.75));
  background: var(--b1, rgba(255,255,255,0.07));
}
.ngifs-tab.active {
  background: var(--ac-bg, rgba(167,139,250,0.09));
  border-color: var(--ac-border, rgba(167,139,250,0.25));
  color: var(--ac-text, #c4b5fd);
}

/* Search */
.ngifs-search {
  padding: 10px 16px;
  flex-shrink: 0;
}
.ngifs-search-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--s3, #1e1c2e);
  border: 0.5px solid var(--b2, rgba(255,255,255,0.10));
  border-radius: 24px;
  padding: 8px 14px;
  transition: border-color 0.15s;
}
.ngifs-search-inner:focus-within {
  border-color: var(--ac-border, rgba(167,139,250,0.25));
}
.ngifs-search-inner i {
  font-size: 13px;
  color: var(--t5, rgba(255,255,255,0.28));
  flex-shrink: 0;
}
.ngifs-search-inner input {
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--t2, rgba(255,255,255,0.75));
  font-family: inherit;
  flex: 1;
  min-width: 0;
}
.ngifs-search-inner input::placeholder {
  color: var(--t5, rgba(255,255,255,0.28));
}
.ngifs-clear-btn {
  background: none;
  border: none;
  color: var(--t4, rgba(255,255,255,0.38));
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: inherit;
  transition: color 0.1s;
  flex-shrink: 0;
  white-space: nowrap;
}
.ngifs-clear-btn:hover {
  color: var(--t2, rgba(255,255,255,0.75));
}

/* Grid */
.ngifs-grid-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 8px;
  min-height: 0;
}
.ngifs-grid-wrap::-webkit-scrollbar { width: 3px; }
.ngifs-grid-wrap::-webkit-scrollbar-track { background: transparent; }
.ngifs-grid-wrap::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

.ngifs-grid {
  columns: 2;
  column-gap: 6px;
}
@media (min-width: 400px) {
  .ngifs-grid { columns: 3; }
}

/* Grid item */
.ngifs-item {
  display: block;
  width: 100%;
  break-inside: avoid;
  margin-bottom: 6px;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: none;
  padding: 0;
  background: var(--s3, #1e1c2e);
  position: relative;
  transition: transform 0.12s, opacity 0.12s;
}
.ngifs-item:hover {
  transform: scale(1.03);
  z-index: 1;
}
.ngifs-item:active {
  transform: scale(0.98);
  opacity: 0.85;
}
.ngifs-item img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 10px;
  background: transparent;
  transition: opacity 0.2s;
}
.ngifs-item img.loading {
  opacity: 0;
}
.ngifs-item img.loaded {
  opacity: 1;
}

/* States */
.ngifs-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--t5, rgba(255,255,255,0.28));
  font-size: 13px;
  padding: 40px 20px;
}
.ngifs-state i {
  font-size: 28px;
  opacity: 0.4;
}
.ngifs-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--b2, rgba(255,255,255,0.10));
  border-top-color: var(--ac, #a78bfa);
  border-radius: 50%;
  animation: ngifs-spin 0.7s linear infinite;
}
@keyframes ngifs-spin {
  to { transform: rotate(360deg); }
}
.ngifs-load-more {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}

/* Footer */
.ngifs-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px 10px;
  flex-shrink: 0;
  border-top: 0.5px solid var(--b1, rgba(255,255,255,0.07));
}
.ngifs-attribution {
  font-size: 11px;
  color: var(--t5, rgba(255,255,255,0.28));
  text-decoration: none;
  letter-spacing: 0.2px;
  transition: color 0.1s;
}
.ngifs-attribution:hover {
  color: var(--t3, rgba(255,255,255,0.55));
}
.ngifs-attribution span {
  color: var(--ac-text, #c4b5fd);
  font-weight: 500;
}

/* No API key notice */
.ngifs-setup-notice {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 24px;
  text-align: center;
}
.ngifs-setup-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--ac-bg, rgba(167,139,250,0.09));
  border: 0.5px solid var(--ac-border, rgba(167,139,250,0.25));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--ac-text, #c4b5fd);
}
.ngifs-setup-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--t1, #f0eeff);
  letter-spacing: -0.2px;
}
.ngifs-setup-body {
  font-size: 13px;
  color: var(--t4, rgba(255,255,255,0.38));
  line-height: 1.6;
  max-width: 280px;
}
    `;
    document.head.appendChild(style);
  })();

  // ── GIF Grid Item (lazy img) ──────────────────────────────────────────────────
  function GifItem({ item, onSelect }) {
    const [loaded, setLoaded] = useState(false);

    const blurStyle = item.blur_preview
      ? { backgroundImage: `url('${item.blur_preview}')`, backgroundSize: "cover", backgroundPosition: "center" }
      : {};

    // Pick the best preview URL from the KLIPY nested file structure
    const previewUrl = resolvePreviewUrl(item);
    const embedUrl   = resolveEmbedUrl(item);

    if (!previewUrl || !embedUrl) return null;

    return React.createElement("button", {
      className: "ngifs-item",
      style: blurStyle,
      title: item.title || "",
      onClick: () => onSelect(item, embedUrl),
    },
      React.createElement("img", {
        src: previewUrl,
        alt: item.title || "",
        className: loaded ? "loaded" : "loading",
        onLoad: () => setLoaded(true),
        onError: () => setLoaded(true),
      })
    );
  }

  // ── URL extraction from KLIPY's nested file object ───────────────────────────
  function resolvePreviewUrl(item) {
    const f = item.file;
    if (!f) return null;
    // xs first, then sm — prefer webp for smaller payload, fall back to gif/png
    return (
      f.xs?.webp?.url || f.xs?.gif?.url || f.xs?.png?.url ||
      f.sm?.webp?.url || f.sm?.gif?.url || f.sm?.png?.url || null
    );
  }

  function resolveEmbedUrl(item) {
    const f = item.file;
    if (!f) return null;
    // hd for the embed (what gets inserted into the post)
    return (
      f.hd?.gif?.url  || f.hd?.webp?.url || f.hd?.png?.url ||
      f.md?.gif?.url  || f.md?.webp?.url || f.md?.png?.url || null
    );
  }

  // ── Main GIF Picker Modal ─────────────────────────────────────────────────────
  function GifPickerModal({ onClose, onInsert }) {
    const [tab,          setTab]          = useState("gifs");
    const [query,        setQuery]        = useState("");
    const [isSearching,  setIsSearching]  = useState(false);
    const [items,        setItems]        = useState([]);
    const [page,         setPage]         = useState(1);
    const [hasNext,      setHasNext]      = useState(true);
    const [loadingInit,  setLoadingInit]  = useState(true);
    const [loadingMore,  setLoadingMore]  = useState(false);
    const [error,        setError]        = useState(null);
    const [apiReady,     setApiReady]     = useState(true);

    const gridRef     = useRef(null);
    const inputRef    = useRef(null);
    const queryRef    = useRef(query);
    const tabRef      = useRef(tab);
    queryRef.current  = query;
    tabRef.current    = tab;

    // Check API health on mount
    useEffect(() => {
      apiGet(`/api/v1/extensions/${SLUG}/api/settings`)
        .then(d => {
          if (d.error && d.error.includes("not configured")) setApiReady(false);
          else if (!d.api_key_set) setApiReady(false);
        })
        .catch(() => {}); // non-fatal
    }, []);

    // Load trending on mount and tab change
    useEffect(() => {
      if (!apiReady) return;
      setItems([]);
      setPage(1);
      setHasNext(true);
      setLoadingInit(true);
      setError(null);
      setIsSearching(false);
      setQuery("");

      fetchTrending(tab, 1)
        .then(d => {
          if (d.error) { setError(d.error); return; }
          setItems(d.items || []);
          setHasNext(d.has_next || false);
          setPage(2);
        })
        .catch(() => setError("Could not load content. Check your KLIPY API key."))
        .finally(() => setLoadingInit(false));
    }, [tab, apiReady]);

    // Focus search on open
    useEffect(() => {
      setTimeout(() => inputRef.current?.focus(), 120);
    }, []);

    // Close on Escape
    useEffect(() => {
      const fn = e => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", fn);
      return () => document.removeEventListener("keydown", fn);
    }, [onClose]);

    const doSearch = useCallback((q) => {
      if (!q.trim()) { clearSearch(); return; }
      setIsSearching(true);
      setItems([]);
      setPage(1);
      setHasNext(true);
      setLoadingInit(true);
      setError(null);

      fetchSearch(tabRef.current, q.trim(), 1)
        .then(d => {
          if (d.error) { setError(d.error); return; }
          setItems(d.items || []);
          setHasNext(d.has_next || false);
          setPage(2);
        })
        .catch(() => setError("Search failed."))
        .finally(() => setLoadingInit(false));
    }, []);

    const clearSearch = useCallback(() => {
      setQuery("");
      setIsSearching(false);
      setItems([]);
      setPage(1);
      setHasNext(true);
      setLoadingInit(true);
      setError(null);

      fetchTrending(tabRef.current, 1)
        .then(d => {
          if (d.error) { setError(d.error); return; }
          setItems(d.items || []);
          setHasNext(d.has_next || false);
          setPage(2);
        })
        .catch(() => setError("Could not load content."))
        .finally(() => setLoadingInit(false));
    }, []);

    const loadMore = useCallback(() => {
      if (loadingMore || !hasNext) return;
      setLoadingMore(true);
      const currentPage = page;
      const currentQ    = queryRef.current;
      const currentTab  = tabRef.current;
      const fetcher     = isSearching
        ? fetchSearch(currentTab, currentQ.trim(), currentPage)
        : fetchTrending(currentTab, currentPage);

      fetcher
        .then(d => {
          if (d.error) return;
          setItems(prev => [...prev, ...(d.items || [])]);
          setHasNext(d.has_next || false);
          setPage(p => p + 1);
        })
        .catch(() => {})
        .finally(() => setLoadingMore(false));
    }, [loadingMore, hasNext, page, isSearching]);

    const onScroll = useCallback((e) => {
      const el = e.target;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 240) {
        loadMore();
      }
    }, [loadMore]);

    const handleSelect = useCallback((item, embedUrl) => {
      const title = item.title || (tab === "stickers" ? "sticker" : "GIF");
      onInsert(`![${title}](${embedUrl})`);
      fireShare(tab, item.slug, isSearching ? query.trim() : "");
      onClose();
    }, [tab, isSearching, query, onInsert, onClose]);

    const handleKeyDown = (e) => {
      if (e.key === "Enter") { e.preventDefault(); doSearch(query); }
    };

    // ── Render ──────────────────────────────────────────────────────────────────
    const renderContent = () => {
      if (!apiReady) {
        return React.createElement("div", { className: "ngifs-setup-notice" },
          React.createElement("div", { className: "ngifs-setup-icon" },
            React.createElement("i", { className: "fa-solid fa-key" })
          ),
          React.createElement("div", { className: "ngifs-setup-title" }, "KLIPY API Key Required"),
          React.createElement("div", { className: "ngifs-setup-body" },
            "Add your KLIPY API key in the Admin Panel under GIFs to enable this feature."
          )
        );
      }

      if (error) {
        return React.createElement("div", { className: "ngifs-state" },
          React.createElement("i", { className: "fa-solid fa-circle-exclamation" }),
          React.createElement("span", null, error)
        );
      }

      if (loadingInit) {
        return React.createElement("div", { className: "ngifs-state" },
          React.createElement("div", { className: "ngifs-spinner" })
        );
      }

      if (!items.length) {
        return React.createElement("div", { className: "ngifs-state" },
          React.createElement("i", { className: "fa-solid fa-face-sad-tear" }),
          React.createElement("span", null, "No results found.")
        );
      }

      return React.createElement("div", {
        className: "ngifs-grid-wrap",
        ref: gridRef,
        onScroll,
      },
        React.createElement("div", { className: "ngifs-grid" },
          items.map((item, i) =>
            React.createElement(GifItem, {
              key: `${item.id || item.slug}-${i}`,
              item,
              onSelect: handleSelect,
            })
          )
        ),
        loadingMore && React.createElement("div", { className: "ngifs-load-more" },
          React.createElement("div", { className: "ngifs-spinner" })
        )
      );
    };

    return React.createElement("div", {
      className: "ngifs-backdrop",
      onClick: e => { if (e.target === e.currentTarget) onClose(); },
    },
      React.createElement("div", { className: "ngifs-modal" },

        // Header
        React.createElement("div", { className: "ngifs-header" },
          React.createElement("span", { className: "ngifs-title" }, "Insert Media"),
          React.createElement("button", {
            className: "ngifs-close",
            onClick: onClose,
            "aria-label": "Close",
          },
            React.createElement("i", { className: "fa-solid fa-xmark" })
          )
        ),

        // Tabs
        React.createElement("div", { className: "ngifs-tabs" },
          ["gifs", "stickers"].map(t =>
            React.createElement("button", {
              key: t,
              className: `ngifs-tab${tab === t ? " active" : ""}`,
              onClick: () => { if (tab !== t) setTab(t); },
            }, t.charAt(0).toUpperCase() + t.slice(1))
          )
        ),

        // Search
        React.createElement("div", { className: "ngifs-search" },
          React.createElement("div", { className: "ngifs-search-inner" },
            React.createElement("i", { className: "fa-solid fa-magnifying-glass" }),
            React.createElement("input", {
              ref: inputRef,
              type: "text",
              placeholder: "Search KLIPY",
              value: query,
              onChange: e => setQuery(e.target.value),
              onKeyDown: handleKeyDown,
              autoComplete: "off",
              spellCheck: false,
            }),
            isSearching && React.createElement("button", {
              className: "ngifs-clear-btn",
              onClick: clearSearch,
            }, "Trending")
          )
        ),

        // Content area
        renderContent(),

        // Footer
        React.createElement("div", { className: "ngifs-footer" },
          React.createElement("a", {
            href: "https://klipy.com",
            target: "_blank",
            rel: "noopener noreferrer",
            className: "ngifs-attribution",
          },
            "Powered by ", React.createElement("span", null, "KLIPY")
          )
        )
      )
    );
  }

  // ── Modal portal mount/unmount ────────────────────────────────────────────────
  let _modalRoot = null;

  function openGifPicker(onInsert) {
    if (_modalRoot) return; // already open

    const container = document.createElement("div");
    container.id = "nexus-gifs-modal-root";
    document.body.appendChild(container);

    const root = window.ReactDOM.createRoot(container);
    _modalRoot = root;

    function close() {
      root.unmount();
      container.remove();
      _modalRoot = null;
    }

    root.render(
      React.createElement(GifPickerModal, { onClose: close, onInsert })
    );
  }

  // ── Cursor insertion helper ───────────────────────────────────────────────────
  // Captures the active textarea before the modal opens. On insert, splices
  // the markdown string at the cursor position and fires an input event so
  // React state picks up the change.
  function makeInserter() {
    // Walk up from the currently focused element to find the composer textarea
    const active = document.activeElement;
    const ta = active && active.tagName === "TEXTAREA" ? active : null;
    const start = ta ? ta.selectionStart : null;
    const end   = ta ? ta.selectionEnd   : null;

    return function insert(markdown) {
      if (!ta || !document.body.contains(ta)) {
        // Textarea gone — fire a custom event that the composer can catch
        window.dispatchEvent(new CustomEvent("nexus-gifs:insert", { detail: { markdown } }));
        return;
      }

      const before = ta.value.slice(0, start);
      const after  = ta.value.slice(end);
      const insert = (before.length > 0 && !before.endsWith("\n")) ? "\n" + markdown : markdown;
      const newVal = before + insert + "\n" + after;

      // Use execCommand for undo-stack support where available
      ta.focus();
      ta.setSelectionRange(start, end);
      if (document.execCommand && document.execCommand("insertText", false, insert + "\n")) {
        // execCommand handled it
      } else {
        // Fallback: set value and fire synthetic input event
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        nativeInputValueSetter.call(ta, newVal);
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }

      // Move cursor to end of inserted text
      const newCursor = before.length + insert.length + 1;
      ta.setSelectionRange(newCursor, newCursor);
    };
  }

  // ── Admin panel ───────────────────────────────────────────────────────────────
  function GifsAdminPanel() {
    const [settings, setSettings] = useState(null);
    const [apiKey,   setApiKey]   = useState("");
    const [filter,   setFilter]   = useState("R");
    const [webp,     setWebp]     = useState(false);
    const [saving,   setSaving]   = useState(false);
    const [msg,      setMsg]      = useState(null);
    const [loading,  setLoading]  = useState(true);

    useEffect(() => {
      apiGet(`/api/v1/extensions/${SLUG}/api/settings`)
        .then(d => {
          setSettings(d);
          setFilter(d.content_filter || "R");
          setWebp(d.use_webp || false);
        })
        .catch(() => setMsg({ type: "err", text: "Could not load settings." }))
        .finally(() => setLoading(false));
    }, []);

    const save = async () => {
      setSaving(true);
      setMsg(null);
      try {
        const body = { content_filter: filter, use_webp: webp };
        if (apiKey.trim()) body.api_key = apiKey.trim();

        const d = await apiPatch(`/api/v1/extensions/${SLUG}/api/settings`, body);
        if (d.error) {
          setMsg({ type: "err", text: d.error });
        } else {
          setSettings(d);
          setApiKey("");
          setMsg({ type: "ok", text: "Settings saved." });
        }
      } catch {
        setMsg({ type: "err", text: "Save failed." });
      } finally {
        setSaving(false);
      }
    };

    const panelStyle = {
      maxWidth: 520,
    };

    const sectionStyle = {
      background: "rgba(255,255,255,0.02)",
      border: "0.5px solid var(--b1)",
      borderRadius: 14,
      padding: "20px 22px",
      marginBottom: 18,
    };

    const labelStyle = {
      fontSize: 14,
      color: "var(--t3)",
      marginBottom: 7,
      display: "block",
    };

    const hintStyle = {
      fontSize: 12,
      color: "var(--t5)",
      marginTop: 4,
    };

    const inputStyle = {
      width: "100%",
      padding: "11px 15px",
      background: "rgba(255,255,255,0.05)",
      border: "0.5px solid rgba(255,255,255,0.1)",
      borderRadius: 12,
      color: "var(--t1)",
      fontSize: 15,
      outline: "none",
      fontFamily: "inherit",
      boxSizing: "border-box",
    };

    const selectStyle = {
      ...inputStyle,
      cursor: "pointer",
    };

    if (loading) {
      return React.createElement("div", { style: { padding: "40px 0", textAlign: "center", color: "var(--t5)" } },
        React.createElement("i", { className: "fa-solid fa-spinner fa-spin", style: { marginRight: 8 } }),
        "Loading…"
      );
    }

    return React.createElement("div", { style: panelStyle },

      React.createElement("div", { style: sectionStyle },
        React.createElement("div", {
          style: { fontSize: 12, fontWeight: 500, color: "var(--t5)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 16, paddingBottom: 8, borderBottom: "0.5px solid var(--b1)" }
        }, "Credentials"),

        // API Key
        React.createElement("div", { style: { marginBottom: 18 } },
          React.createElement("label", { style: labelStyle }, "KLIPY API Key"),
          React.createElement("input", {
            type: "password",
            style: inputStyle,
            value: apiKey,
            onChange: e => setApiKey(e.target.value),
            placeholder: settings?.api_key_set
              ? `Current key: ${settings.api_key_masked || "••••••••"} — enter new to replace`
              : "Enter your KLIPY API key",
            autoComplete: "off",
          }),
          React.createElement("div", { style: hintStyle },
            "Get a free key at ",
            React.createElement("a", { href: "https://klipy.com", target: "_blank", rel: "noopener", style: { color: "var(--ac-text)" } }, "klipy.com"),
          ),
          settings?.api_key_set && React.createElement("div", {
            style: { marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--green)" }
          },
            React.createElement("i", { className: "fa-solid fa-circle-check" }),
            "API key is configured"
          )
        ),
      ),

      React.createElement("div", { style: sectionStyle },
        React.createElement("div", {
          style: { fontSize: 12, fontWeight: 500, color: "var(--t5)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 16, paddingBottom: 8, borderBottom: "0.5px solid var(--b1)" }
        }, "Content Settings"),

        // Content Filter
        React.createElement("div", { style: { marginBottom: 18 } },
          React.createElement("label", { style: labelStyle }, "Content Filter"),
          React.createElement("select", {
            style: selectStyle,
            value: filter,
            onChange: e => setFilter(e.target.value),
          },
            React.createElement("option", { value: "G" },     "G — Family Safe"),
            React.createElement("option", { value: "PG" },    "PG"),
            React.createElement("option", { value: "PG-13" }, "PG-13"),
            React.createElement("option", { value: "R" },     "R — Unrestricted")
          ),
          React.createElement("div", { style: hintStyle }, "Controls the maturity of content returned by KLIPY search.")
        ),

        // WebP toggle
        React.createElement("div", {
          style: { display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }
        },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 14, color: "var(--t2)", marginBottom: 2 } }, "Use WebP format"),
            React.createElement("div", { style: hintStyle }, "Smaller files, better performance. Disable if images don't display correctly.")
          ),
          // Toggle
          React.createElement("div", {
            className: "tgl",
            style: { background: webp ? "var(--ac)" : "var(--tgl-off)", cursor: "pointer", flexShrink: 0 },
            onClick: () => setWebp(p => !p),
          },
            React.createElement("div", {
              className: "tgl-knob",
              style: { left: webp ? 23 : 3, background: webp ? "var(--ac-on)" : "var(--tgl-knob-off)" }
            })
          )
        ),
      ),

      // Message
      msg && React.createElement("div", {
        style: {
          padding: "10px 16px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 500,
          marginBottom: 18,
          background: msg.type === "ok" ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)",
          color: msg.type === "ok" ? "var(--green)" : "var(--red)",
          border: `0.5px solid ${msg.type === "ok" ? "rgba(52,211,153,.2)" : "rgba(248,113,113,.2)"}`,
        }
      }, msg.text),

      // Save button
      React.createElement("button", {
        className: "btn-primary",
        onClick: save,
        disabled: saving,
        style: { opacity: saving ? 0.5 : 1 },
      }, saving ? "Saving…" : "Save Settings")
    );
  }

  // ── Register everything ───────────────────────────────────────────────────────

  // Toolbar button — opens the GIF picker
  NE.registerToolbarButton({
    icon:  "fa-photo-film",
    tip:   "Insert GIF or Sticker",
    color: "var(--ac)",
    onClick(_linkedItems, _setLinkedItems) {
      const inserter = makeInserter();
      openGifPicker(inserter);
    },
  }, 60);

  // Admin panel
  NE.registerAdminPanel(SLUG, {
    label:     "GIFs",
    icon:      "fa-photo-film",
    component: GifsAdminPanel,
  });

})();
