/**
 * nexus-gifs — Nexus Extension Bundle v1.0.0
 *
 * Registers with NexusExtensions:
 *   registerToolbarButton — GIF/sticker button in post composer
 *   registerAdminPanel    — GIFs admin panel (uses NexusExtensionTemplates.TabbedPanel)
 *
 * KLIPY API is called directly from the browser.
 * The API key is stored in Nexus extension settings and read via
 * GET /api/v1/admin/extensions/nexus-gifs — same pattern as Gamepedia's IGDB key.
 */

(function () {
  "use strict";

  const React = window.React;
  const NE    = window.NexusExtensions;

  if (!React || !NE) {
    console.warn("[nexus-gifs] React or NexusExtensions not available.");
    return;
  }

  const { useState, useEffect, useRef } = React;
  const e = React.createElement;

  // ---------------------------------------------------------------------------
  // KLIPY API — called directly from the browser
  // API key is loaded from Nexus extension settings on modal open.
  // ---------------------------------------------------------------------------

  const KLIPY_BASE = "https://api.klipy.com/api/v1";
  const PER_PAGE   = 24;

  // Stable anonymous customer_id — uses Nexus user ID if available via token
  function getCustomerId() {
    const key = "nexus-gifs-cid";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
      sessionStorage.setItem(key, id);
    }
    return id;
  }

  function klipyPath(type) {
    return type === "stickers" ? "stickers" : "gifs";
  }

  function toKlipyFilter(rating) {
    if (rating === "G")     return "high";
    if (rating === "PG")    return "medium";
    if (rating === "PG-13") return "low";
    return "off"; // R or default
  }

  function fetchTrending(apiKey, type, page) {
    const params = new URLSearchParams({
      per_page:    PER_PAGE,
      page,
      customer_id: getCustomerId(),
    });
    return fetch(`${KLIPY_BASE}/${apiKey}/${klipyPath(type)}/trending?${params}`)
      .then(r => r.json());
  }

  function fetchSearch(apiKey, type, query, page, contentFilter) {
    const params = new URLSearchParams({
      per_page:       PER_PAGE,
      page,
      q:              query,
      content_filter: toKlipyFilter(contentFilter || "R"),
      customer_id:    getCustomerId(),
    });
    return fetch(`${KLIPY_BASE}/${apiKey}/${klipyPath(type)}/search?${params}`)
      .then(r => r.json());
  }

  function fireShare(apiKey, type, slug, query) {
    fetch(`${KLIPY_BASE}/${apiKey}/${klipyPath(type)}/share/${slug}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ customer_id: getCustomerId(), q: query || "" }),
    }).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // Auth helpers — same as Gamepedia
  // ---------------------------------------------------------------------------

  function authHeaders() {
    const token = localStorage.getItem("nexus_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };
  }

  // Load extension settings from Nexus — returns { api_key, content_filter, use_webp }
  function loadSettings() {
    return fetch("/api/v1/admin/extensions/nexus-gifs", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => d.extension?.settings || {});
  }

  // ---------------------------------------------------------------------------
  // URL extraction from KLIPY nested file object
  // ---------------------------------------------------------------------------

  function resolvePreviewUrl(item, useWebp) {
    const f = item.file;
    if (!f) return null;
    if (useWebp) {
      return f.xs?.webp?.url || f.xs?.gif?.url  || f.xs?.png?.url ||
             f.sm?.webp?.url || f.sm?.gif?.url  || f.sm?.png?.url || null;
    }
    return f.xs?.gif?.url  || f.xs?.webp?.url || f.xs?.png?.url ||
           f.sm?.gif?.url  || f.sm?.webp?.url || f.sm?.png?.url || null;
  }

  function resolveEmbedUrl(item, useWebp) {
    const f = item.file;
    if (!f) return null;
    if (useWebp) {
      return f.hd?.webp?.url || f.hd?.gif?.url || f.hd?.png?.url ||
             f.md?.webp?.url || f.md?.gif?.url || f.md?.png?.url || null;
    }
    return f.hd?.gif?.url  || f.hd?.webp?.url || f.hd?.png?.url ||
           f.md?.gif?.url  || f.md?.webp?.url || f.md?.png?.url || null;
  }

  // ---------------------------------------------------------------------------
  // CSS
  // ---------------------------------------------------------------------------

  const style = document.createElement("style");
  style.textContent = `
.ngifs-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:10000;display:flex;align-items:flex-end;justify-content:center;padding:0;animation:ngifs-fade-in 0.15s ease;}
@media(min-width:600px){.ngifs-backdrop{align-items:center;padding:20px;}}
@keyframes ngifs-fade-in{from{opacity:0}to{opacity:1}}
.ngifs-modal{background:var(--s1,#13121e);border:0.5px solid var(--b2,rgba(255,255,255,0.10));border-radius:18px 18px 0 0;width:100%;max-width:560px;height:88vh;max-height:640px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -8px 48px rgba(0,0,0,0.6);animation:ngifs-slide-up 0.2s cubic-bezier(0.34,1.56,0.64,1);}
@media(min-width:600px){.ngifs-modal{border-radius:18px;height:80vh;box-shadow:0 24px 80px rgba(0,0,0,0.7);animation:ngifs-pop-in 0.2s cubic-bezier(0.34,1.56,0.64,1);}}
@keyframes ngifs-slide-up{from{transform:translateY(100%);opacity:0.6}to{transform:translateY(0);opacity:1}}
@keyframes ngifs-pop-in{from{transform:scale(0.94) translateY(8px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
.ngifs-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 0;flex-shrink:0;}
.ngifs-title{font-size:15px;font-weight:600;color:var(--t1,#f0eeff);letter-spacing:-0.2px;}
.ngifs-close{width:30px;height:30px;border-radius:50%;background:var(--b1,rgba(255,255,255,0.07));border:none;color:var(--t3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:background 0.1s,color 0.1s;flex-shrink:0;}
.ngifs-close:hover{background:var(--b2);color:var(--t1);}
.ngifs-tabs{display:flex;gap:4px;padding:10px 16px 0;flex-shrink:0;}
.ngifs-tab{font-size:13px;font-weight:500;padding:6px 16px;border-radius:20px;border:0.5px solid transparent;background:transparent;color:var(--t4);cursor:pointer;transition:all 0.12s;font-family:inherit;}
.ngifs-tab:hover{color:var(--t2);background:var(--b1);}
.ngifs-tab.active{background:var(--ac-bg);border-color:var(--ac-border);color:var(--ac-text);}
.ngifs-search{padding:10px 16px;flex-shrink:0;}
.ngifs-search-inner{display:flex;align-items:center;gap:8px;background:var(--s3,#1e1c2e);border:0.5px solid var(--b2);border-radius:24px;padding:8px 14px;transition:border-color 0.15s;}
.ngifs-search-inner:focus-within{border-color:var(--ac-border);}
.ngifs-search-inner i{font-size:13px;color:var(--t5);flex-shrink:0;}
.ngifs-search-inner input{background:transparent;border:none;outline:none;font-size:13px;color:var(--t2);font-family:inherit;flex:1;min-width:0;}
.ngifs-search-inner input::placeholder{color:var(--t5);}
.ngifs-clear-btn{background:none;border:none;color:var(--t4);cursor:pointer;font-size:12px;padding:2px 4px;border-radius:4px;font-family:inherit;transition:color 0.1s;flex-shrink:0;white-space:nowrap;}
.ngifs-clear-btn:hover{color:var(--t2);}
.ngifs-grid-wrap{flex:1;overflow-y:auto;padding:4px 8px 8px;min-height:0;}
.ngifs-grid-wrap::-webkit-scrollbar{width:3px;}
.ngifs-grid-wrap::-webkit-scrollbar-track{background:transparent;}
.ngifs-grid-wrap::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px;}
.ngifs-grid{columns:2;column-gap:6px;}
@media(min-width:400px){.ngifs-grid{columns:3;}}
.ngifs-item{display:block;width:100%;break-inside:avoid;margin-bottom:6px;border-radius:10px;overflow:hidden;cursor:pointer;border:none;padding:0;background:var(--s3);position:relative;transition:transform 0.12s,opacity 0.12s;}
.ngifs-item:hover{transform:scale(1.03);z-index:1;}
.ngifs-item:active{transform:scale(0.98);opacity:0.85;}
.ngifs-item img{display:block;width:100%;height:auto;border-radius:10px;background:transparent;transition:opacity 0.2s;}
.ngifs-item img.loading{opacity:0;}
.ngifs-item img.loaded{opacity:1;}
.ngifs-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--t5);font-size:13px;padding:40px 20px;}
.ngifs-state i{font-size:28px;opacity:0.4;}
.ngifs-spinner{width:20px;height:20px;border:2px solid var(--b2);border-top-color:var(--ac);border-radius:50%;animation:ngifs-spin 0.7s linear infinite;}
@keyframes ngifs-spin{to{transform:rotate(360deg)}}
.ngifs-load-more{display:flex;justify-content:center;padding:12px 0 4px;}
.ngifs-footer{display:flex;align-items:center;justify-content:center;padding:8px 16px 10px;flex-shrink:0;border-top:0.5px solid var(--b1);}
.ngifs-attribution{font-size:11px;color:var(--t5);text-decoration:none;letter-spacing:0.2px;transition:color 0.1s;}
.ngifs-attribution:hover{color:var(--t3);}
.ngifs-attribution span{color:var(--ac-text);font-weight:500;}
.ngifs-no-key{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:32px 24px;text-align:center;}
.ngifs-no-key-icon{width:48px;height:48px;border-radius:14px;background:var(--ac-bg);border:0.5px solid var(--ac-border);display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--ac-text);}
  `;
  document.head.appendChild(style);

  // ---------------------------------------------------------------------------
  // GIF Grid Item
  // ---------------------------------------------------------------------------

  function GifItem({ item, onSelect, useWebp }) {
    const [loaded, setLoaded] = useState(false);
    const previewUrl = resolvePreviewUrl(item, useWebp);
    const embedUrl   = resolveEmbedUrl(item, useWebp);
    if (!previewUrl || !embedUrl) return null;
    const blurStyle = item.blur_preview
      ? { backgroundImage: `url('${item.blur_preview}')`, backgroundSize: "cover", backgroundPosition: "center" }
      : {};
    return e("button", {
      className: "ngifs-item",
      style:     blurStyle,
      title:     item.title || "",
      onClick:   () => onSelect(item, embedUrl),
    },
      e("img", {
        src:       previewUrl,
        alt:       item.title || "",
        className: loaded ? "loaded" : "loading",
        onLoad:    () => setLoaded(true),
        onError:   () => setLoaded(true),
      })
    );
  }

  // ---------------------------------------------------------------------------
  // GIF Picker Modal — receives resolved settings so it can call KLIPY directly
  // ---------------------------------------------------------------------------

  function GifPickerModal({ onClose, onInsert, settings }) {
    const apiKey        = settings.api_key        || null;
    const contentFilter = settings.content_filter || "R";
    const useWebp       = settings.use_webp       || false;

    const [tab,         setTab]         = useState("gifs");
    const [query,       setQuery]       = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [items,       setItems]       = useState([]);
    const [page,        setPage]        = useState(1);
    const [hasNext,     setHasNext]     = useState(true);
    const [loadingInit, setLoadingInit] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error,       setError]       = useState(null);

    const inputRef   = useRef(null);
    const queryRef   = useRef(query);
    const tabRef     = useRef(tab);
    queryRef.current = query;
    tabRef.current   = tab;

    useEffect(() => {
      if (!apiKey) { setLoadingInit(false); return; }
      setItems([]); setPage(1); setHasNext(true);
      setLoadingInit(true); setError(null);
      setIsSearching(false); setQuery("");
      fetchTrending(apiKey, tab, 1)
        .then(d => {
          if (!d.result) { setError("KLIPY returned an error. Check your API key."); return; }
          setItems(d.data?.data || []);
          setHasNext(d.data?.has_next || false);
          setPage(2);
        })
        .catch(() => setError("Could not reach KLIPY. Check your API key."))
        .finally(() => setLoadingInit(false));
    }, [tab, apiKey]);

    useEffect(() => {
      setTimeout(() => inputRef.current?.focus(), 120);
    }, []);

    useEffect(() => {
      const fn = ev => { if (ev.key === "Escape") onClose(); };
      document.addEventListener("keydown", fn);
      return () => document.removeEventListener("keydown", fn);
    }, [onClose]);

    function doSearch(q) {
      if (!q.trim()) { clearSearch(); return; }
      setIsSearching(true);
      setItems([]); setPage(1); setHasNext(true);
      setLoadingInit(true); setError(null);
      fetchSearch(apiKey, tabRef.current, q.trim(), 1, contentFilter)
        .then(d => {
          if (!d.result) { setError("Search failed. Check your API key."); return; }
          setItems(d.data?.data || []);
          setHasNext(d.data?.has_next || false);
          setPage(2);
        })
        .catch(() => setError("Search failed."))
        .finally(() => setLoadingInit(false));
    }

    function clearSearch() {
      setQuery(""); setIsSearching(false);
      setItems([]); setPage(1); setHasNext(true);
      setLoadingInit(true); setError(null);
      fetchTrending(apiKey, tabRef.current, 1)
        .then(d => {
          if (!d.result) { setError("Could not load content."); return; }
          setItems(d.data?.data || []);
          setHasNext(d.data?.has_next || false);
          setPage(2);
        })
        .catch(() => setError("Could not load content."))
        .finally(() => setLoadingInit(false));
    }

    function loadMore() {
      if (loadingMore || !hasNext || !apiKey) return;
      setLoadingMore(true);
      const currentPage = page;
      const fetcher = isSearching
        ? fetchSearch(apiKey, tabRef.current, queryRef.current.trim(), currentPage, contentFilter)
        : fetchTrending(apiKey, tabRef.current, currentPage);
      fetcher
        .then(d => {
          if (!d.result) return;
          setItems(prev => [...prev, ...(d.data?.data || [])]);
          setHasNext(d.data?.has_next || false);
          setPage(p => p + 1);
        })
        .catch(() => {})
        .finally(() => setLoadingMore(false));
    }

    function handleSelect(item, embedUrl) {
      const title = item.title || (tabRef.current === "stickers" ? "sticker" : "GIF");
      onInsert(`![${title}](${embedUrl})`);
      if (apiKey) fireShare(apiKey, tabRef.current, item.slug, isSearching ? queryRef.current.trim() : "");
      onClose();
    }

    function renderContent() {
      if (!apiKey) {
        return e("div", { className: "ngifs-no-key" },
          e("div", { className: "ngifs-no-key-icon" }, e("i", { className: "fa-solid fa-key" })),
          e("div", { style: { fontSize: 15, fontWeight: 600, color: "var(--t1)" } }, "KLIPY API Key Required"),
          e("div", { style: { fontSize: 13, color: "var(--t4)", lineHeight: 1.6, maxWidth: 280 } },
            "Add your KLIPY API key in Admin Panel \u2192 GIFs \u2192 Credentials."
          )
        );
      }
      if (error)       return e("div", { className: "ngifs-state" }, e("i", { className: "fa-solid fa-circle-exclamation" }), e("span", null, error));
      if (loadingInit) return e("div", { className: "ngifs-state" }, e("div", { className: "ngifs-spinner" }));
      if (!items.length) return e("div", { className: "ngifs-state" }, e("i", { className: "fa-solid fa-face-sad-tear" }), e("span", null, "No results found."));

      return e("div", {
        className: "ngifs-grid-wrap",
        onScroll: ev => {
          const el = ev.target;
          if (el.scrollHeight - el.scrollTop - el.clientHeight < 240) loadMore();
        },
      },
        e("div", { className: "ngifs-grid" },
          items.map((item, i) => e(GifItem, { key: `${item.id || item.slug}-${i}`, item, onSelect: handleSelect, useWebp }))
        ),
        loadingMore && e("div", { className: "ngifs-load-more" }, e("div", { className: "ngifs-spinner" }))
      );
    }

    return e("div", {
      className: "ngifs-backdrop",
      onClick:   ev => { if (ev.target === ev.currentTarget) onClose(); },
    },
      e("div", { className: "ngifs-modal" },
        e("div", { className: "ngifs-header" },
          e("span", { className: "ngifs-title" }, "Insert Media"),
          e("button", { className: "ngifs-close", onClick: onClose, "aria-label": "Close" },
            e("i", { className: "fa-solid fa-xmark" })
          )
        ),
        e("div", { className: "ngifs-tabs" },
          ["gifs", "stickers"].map(t =>
            e("button", {
              key:       t,
              className: `ngifs-tab${tab === t ? " active" : ""}`,
              onClick:   () => { if (tab !== t) setTab(t); },
            }, t.charAt(0).toUpperCase() + t.slice(1))
          )
        ),
        e("div", { className: "ngifs-search" },
          e("div", { className: "ngifs-search-inner" },
            e("i", { className: "fa-solid fa-magnifying-glass" }),
            e("input", {
              ref:          inputRef,
              type:         "text",
              placeholder:  "Search KLIPY",
              value:        query,
              onChange:     ev => setQuery(ev.target.value),
              onKeyDown:    ev => { if (ev.key === "Enter") { ev.preventDefault(); doSearch(query); } },
              autoComplete: "off",
              spellCheck:   false,
            }),
            isSearching && e("button", { className: "ngifs-clear-btn", onClick: clearSearch }, "Trending")
          )
        ),
        renderContent(),
        e("div", { className: "ngifs-footer" },
          e("a", { href: "https://klipy.com", target: "_blank", rel: "noopener noreferrer", className: "ngifs-attribution" },
            "Powered by ", e("span", null, "KLIPY")
          )
        )
      )
    );
  }

  // ---------------------------------------------------------------------------
  // Modal portal
  // ---------------------------------------------------------------------------

  let _modalRoot = null;

  function openGifPicker(onInsert) {
    if (_modalRoot) return;

    const container = document.createElement("div");
    container.id = "nexus-gifs-modal-root";
    document.body.appendChild(container);
    const root = window.ReactDOM.createRoot(container);
    _modalRoot = root;

    function close() { root.unmount(); container.remove(); _modalRoot = null; }

    // Render loading state immediately
    root.render(e(GifPickerModal, { onClose: close, onInsert, settings: {} }));

    // Load settings then re-render with real values — same pattern as Gamepedia
    loadSettings()
      .then(settings => root.render(e(GifPickerModal, { onClose: close, onInsert, settings })))
      .catch(() => root.render(e(GifPickerModal, { onClose: close, onInsert, settings: {} })));
  }

  // ---------------------------------------------------------------------------
  // Cursor insertion
  // ---------------------------------------------------------------------------

  function makeInserter() {
    const active = document.activeElement;
    const ta     = (active && active.tagName === "TEXTAREA") ? active : null;
    const start  = ta ? ta.selectionStart : null;
    const end    = ta ? ta.selectionEnd   : null;

    return function insert(markdown) {
      if (!ta || !document.body.contains(ta)) {
        window.dispatchEvent(new CustomEvent("nexus-gifs:insert", { detail: { markdown } }));
        return;
      }
      const before   = ta.value.slice(0, start);
      const after    = ta.value.slice(end);
      const prefix   = (before.length > 0 && !before.endsWith("\n")) ? "\n" : "";
      const toInsert = prefix + markdown + "\n";
      ta.focus();
      ta.setSelectionRange(start, end);
      if (!document.execCommand("insertText", false, toInsert)) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        setter.call(ta, before + toInsert + after);
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
      ta.setSelectionRange(before.length + toInsert.length, before.length + toInsert.length);
    };
  }

  // ---------------------------------------------------------------------------
  // Admin Panel — uses NexusExtensionTemplates.TabbedPanel
  // Nexus renders it natively; settings saved via PATCH /api/v1/admin/extensions/nexus-gifs/settings
  // ---------------------------------------------------------------------------

  function GifsAdminPanel() {
    // NexusExtensionTemplates is set by AdminExtensions.jsx before any extension
    // admin panel is rendered, so it is always available here at render time.
    const { TabbedPanel } = window.NexusExtensionTemplates;

    return e(TabbedPanel, {
      slug: "nexus-gifs",
      tabs: [
        {
          key:    "credentials",
          label:  "Credentials",
          icon:   "fa-key",
          fields: [
            {
              key:         "api_key",
              label:       "KLIPY API Key",
              type:        "string",
              secret:      true,
              required:    true,
              placeholder: "Your KLIPY API key",
              hint:        "Get a free key at klipy.com. Required to load and search GIFs.",
            },
          ],
        },
        {
          key:    "content",
          label:  "Content",
          icon:   "fa-sliders",
          fields: [
            {
              key:     "content_filter",
              label:   "Content Filter",
              type:    "select",
              options: [
                { value: "G",     label: "G \u2014 Family Safe" },
                { value: "PG",    label: "PG" },
                { value: "PG-13", label: "PG-13" },
                { value: "R",     label: "R \u2014 Unrestricted" },
              ],
              hint: "Controls the maturity of content returned by KLIPY search.",
            },
            {
              key:  "use_webp",
              label: "Use WebP format",
              type:  "boolean",
              hint:  "Smaller files, better performance. Disable if GIFs don\u2019t display correctly.",
            },
          ],
        },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // Registrations
  // ---------------------------------------------------------------------------

  NE.registerToolbarButton({
    icon:  "fa-solid fa-photo-film",
    tip:   "Insert GIF or Sticker",
    onClick(linkedItems, setLinkedItems) {
      const inserter = makeInserter();
      openGifPicker(inserter);
    },
  }, 60);

  NE.registerAdminPanel("nexus-gifs", {
    label:     "GIFs",
    icon:      "fa-photo-film",
    component: GifsAdminPanel,
  });

})();
