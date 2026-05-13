/**
 * nexus-gifs — Nexus Extension Bundle v1.0.0
 *
 * Registers with NexusExtensions:
 *   registerToolbarButton — GIF/sticker button in post composer
 *   registerAdminPanel    — GIFs admin panel (API key + content settings)
 */

(function () {
  "use strict";

  const React = window.React;
  const NE    = window.NexusExtensions;

  // Guard — same pattern as Gamepedia
  if (!React || !NE) {
    console.warn("[nexus-gifs] React or NexusExtensions not available.");
    return;
  }

  const { useState, useEffect, useRef, useCallback } = React;
  const e = React.createElement;

  // ---------------------------------------------------------------------------
  // API base — mirrors Gamepedia's /ext/gamepedia/api pattern
  // ---------------------------------------------------------------------------

  const BASE = "/ext/nexus-gifs/api";

  // ---------------------------------------------------------------------------
  // Auth token helper — reads from localStorage exactly as Nexus does
  // ---------------------------------------------------------------------------

  function authHeaders() {
    const token = localStorage.getItem("nexus_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };
  }

  function apiFetch(path, opts = {}) {
    return fetch(BASE + path, {
      ...opts,
      headers: { ...authHeaders(), ...(opts.headers || {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(r => r.json());
  }

  // ---------------------------------------------------------------------------
  // Stable customer_id for KLIPY (uses Nexus user id if available)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // KLIPY fetchers — via our backend proxy at BASE/gifs/*
  // ---------------------------------------------------------------------------

  function fetchTrending(type, page) {
    const cid = getCustomerId();
    return apiFetch(`/gifs/trending?type=${type}&page=${page}&customer_id=${cid}`);
  }

  function fetchSearch(type, query, page) {
    const cid = getCustomerId();
    return apiFetch(`/gifs/search?type=${type}&q=${encodeURIComponent(query)}&page=${page}&customer_id=${cid}`);
  }

  function fireShare(type, slug, query) {
    apiFetch("/gifs/share", {
      method: "POST",
      body: { type, slug, query: query || "", customer_id: getCustomerId() },
    }).catch(() => {});
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
.ngifs-admin{padding:16px 0;}
.ngifs-admin-section{background:var(--s1);border:0.5px solid var(--b1);border-radius:10px;padding:16px 20px;margin-bottom:14px;}
.ngifs-admin-section-title{font-size:12px;font-weight:500;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;}
.ngifs-fi{width:100%;padding:11px 15px;background:rgba(255,255,255,.05);border:0.5px solid rgba(255,255,255,.1);border-radius:12px;color:var(--t1);font-size:14px;outline:none;font-family:inherit;box-sizing:border-box;}
.ngifs-fi::placeholder{color:var(--t4);}
.ngifs-fi:focus{border-color:var(--ac-border);}
.ngifs-fi-select{width:100%;padding:11px 15px;background:rgba(255,255,255,.05);border:0.5px solid rgba(255,255,255,.1);border-radius:12px;color:var(--t1);font-size:14px;outline:none;font-family:inherit;box-sizing:border-box;cursor:pointer;}
.ngifs-label{font-size:12px;color:var(--t4);display:block;margin-bottom:6px;font-weight:500;}
.ngifs-hint{font-size:11px;color:var(--t5);margin-top:5px;}
.ngifs-msg-ok{padding:8px 12px;border-radius:8px;font-size:12px;font-weight:500;background:rgba(52,211,153,.1);color:var(--green);border:0.5px solid rgba(52,211,153,.2);margin-top:10px;}
.ngifs-msg-err{padding:8px 12px;border-radius:8px;font-size:12px;font-weight:500;background:rgba(248,113,113,.1);color:var(--red);border:0.5px solid rgba(248,113,113,.2);margin-top:10px;}
.ngifs-admin-tabs{display:flex;gap:4px;margin-bottom:16px;border-bottom:0.5px solid var(--b1);padding-bottom:0;}
.ngifs-admin-tab{background:none;border:none;border-bottom:2px solid transparent;color:var(--t3);cursor:pointer;font-size:13px;padding:8px 14px 10px;font-family:inherit;transition:color .12s,border-color .12s;margin-bottom:-1px;}
.ngifs-admin-tab:hover{color:var(--t1);}
.ngifs-admin-tab.active{color:var(--ac);border-bottom-color:var(--ac);}
.ngifs-tgl-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:0.5px solid rgba(255,255,255,.04);}
.ngifs-tgl-row:last-child{border-bottom:none;}
  `;
  document.head.appendChild(style);

  // ---------------------------------------------------------------------------
  // URL extraction from KLIPY nested file object
  // ---------------------------------------------------------------------------

  function resolvePreviewUrl(item) {
    const f = item.file;
    if (!f) return null;
    return f.xs?.webp?.url || f.xs?.gif?.url || f.xs?.png?.url ||
           f.sm?.webp?.url || f.sm?.gif?.url || f.sm?.png?.url || null;
  }

  function resolveEmbedUrl(item) {
    const f = item.file;
    if (!f) return null;
    return f.hd?.gif?.url  || f.hd?.webp?.url || f.hd?.png?.url ||
           f.md?.gif?.url  || f.md?.webp?.url  || f.md?.png?.url || null;
  }

  // ---------------------------------------------------------------------------
  // GIF Grid Item — lazy loaded image with blur preview
  // ---------------------------------------------------------------------------

  function GifItem({ item, onSelect }) {
    const [loaded, setLoaded] = useState(false);
    const previewUrl = resolvePreviewUrl(item);
    const embedUrl   = resolveEmbedUrl(item);
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
  // GIF Picker Modal
  // ---------------------------------------------------------------------------

  function GifPickerModal({ onClose, onInsert, apiKeySet }) {
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
      if (!apiKeySet) { setLoadingInit(false); return; }
      setItems([]); setPage(1); setHasNext(true);
      setLoadingInit(true); setError(null);
      setIsSearching(false); setQuery("");

      fetchTrending(tab, 1)
        .then(d => {
          if (d.error) { setError(d.error); return; }
          setItems(d.items || []);
          setHasNext(d.has_next || false);
          setPage(2);
        })
        .catch(() => setError("Could not load content. Check your KLIPY API key."))
        .finally(() => setLoadingInit(false));
    }, [tab, apiKeySet]);

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
      fetchSearch(tabRef.current, q.trim(), 1)
        .then(d => {
          if (d.error) { setError(d.error); return; }
          setItems(d.items || []);
          setHasNext(d.has_next || false);
          setPage(2);
        })
        .catch(() => setError("Search failed."))
        .finally(() => setLoadingInit(false));
    }

    function clearSearch() {
      setQuery(""); setIsSearching(false);
      setItems([]); setPage(1); setHasNext(true);
      setLoadingInit(true); setError(null);
      fetchTrending(tabRef.current, 1)
        .then(d => {
          if (d.error) { setError(d.error); return; }
          setItems(d.items || []);
          setHasNext(d.has_next || false);
          setPage(2);
        })
        .catch(() => setError("Could not load content."))
        .finally(() => setLoadingInit(false));
    }

    function loadMore() {
      if (loadingMore || !hasNext) return;
      setLoadingMore(true);
      const currentPage = page;
      const fetcher = isSearching
        ? fetchSearch(tabRef.current, queryRef.current.trim(), currentPage)
        : fetchTrending(tabRef.current, currentPage);
      fetcher
        .then(d => {
          if (d.error) return;
          setItems(prev => [...prev, ...(d.items || [])]);
          setHasNext(d.has_next || false);
          setPage(p => p + 1);
        })
        .catch(() => {})
        .finally(() => setLoadingMore(false));
    }

    function onScroll(ev) {
      const el = ev.target;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 240) loadMore();
    }

    function handleSelect(item, embedUrl) {
      const title = item.title || (tabRef.current === "stickers" ? "sticker" : "GIF");
      onInsert(`![${title}](${embedUrl})`);
      fireShare(tabRef.current, item.slug, isSearching ? queryRef.current.trim() : "");
      onClose();
    }

    function renderContent() {
      if (!apiKeySet) {
        return e("div", { className: "ngifs-no-key" },
          e("div", { className: "ngifs-no-key-icon" },
            e("i", { className: "fa-solid fa-key" })
          ),
          e("div", { style: { fontSize: 15, fontWeight: 600, color: "var(--t1)" } },
            "KLIPY API Key Required"
          ),
          e("div", { style: { fontSize: 13, color: "var(--t4)", lineHeight: 1.6, maxWidth: 280 } },
            "Add your KLIPY API key in Admin Panel \u2192 GIFs to enable this feature."
          )
        );
      }
      if (error) {
        return e("div", { className: "ngifs-state" },
          e("i", { className: "fa-solid fa-circle-exclamation" }),
          e("span", null, error)
        );
      }
      if (loadingInit) {
        return e("div", { className: "ngifs-state" },
          e("div", { className: "ngifs-spinner" })
        );
      }
      if (!items.length) {
        return e("div", { className: "ngifs-state" },
          e("i", { className: "fa-solid fa-face-sad-tear" }),
          e("span", null, "No results found.")
        );
      }
      return e("div", { className: "ngifs-grid-wrap", onScroll },
        e("div", { className: "ngifs-grid" },
          items.map((item, i) =>
            e(GifItem, {
              key:      `${item.id || item.slug}-${i}`,
              item,
              onSelect: handleSelect,
            })
          )
        ),
        loadingMore && e("div", { className: "ngifs-load-more" },
          e("div", { className: "ngifs-spinner" })
        )
      );
    }

    return e("div", {
      className: "ngifs-backdrop",
      onClick:   ev => { if (ev.target === ev.currentTarget) onClose(); },
    },
      e("div", { className: "ngifs-modal" },
        e("div", { className: "ngifs-header" },
          e("span", { className: "ngifs-title" }, "Insert Media"),
          e("button", {
            className: "ngifs-close",
            onClick:   onClose,
            "aria-label": "Close",
          }, e("i", { className: "fa-solid fa-xmark" }))
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
            isSearching && e("button", {
              className: "ngifs-clear-btn",
              onClick:   clearSearch,
            }, "Trending")
          )
        ),
        renderContent(),
        e("div", { className: "ngifs-footer" },
          e("a", {
            href:      "https://klipy.com",
            target:    "_blank",
            rel:       "noopener noreferrer",
            className: "ngifs-attribution",
          }, "Powered by ", e("span", null, "KLIPY"))
        )
      )
    );
  }

  // ---------------------------------------------------------------------------
  // Modal portal — opens/closes the GIF picker
  // ---------------------------------------------------------------------------

  let _modalRoot = null;

  function openGifPicker(onInsert) {
    if (_modalRoot) return;

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

    // Render immediately — optimistic (assumes key is set)
    root.render(e(GifPickerModal, { onClose: close, onInsert, apiKeySet: true }));

    // Verify API key is actually configured on our backend
    apiFetch("/settings")
      .then(d => {
        if (!d.api_key_set) {
          root.render(e(GifPickerModal, { onClose: close, onInsert, apiKeySet: false }));
        }
      })
      .catch(() => {}); // optimistic render stands on network error
  }

  // ---------------------------------------------------------------------------
  // Cursor insertion — captures textarea reference before modal opens.
  // The toolbar button uses onMouseDown + e.preventDefault() (Nexus pattern)
  // so the textarea retains focus when onClick fires.
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
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, "value"
        ).set;
        setter.call(ta, before + toInsert + after);
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const newCursor = before.length + toInsert.length;
      ta.setSelectionRange(newCursor, newCursor);
    };
  }

  // ---------------------------------------------------------------------------
  // Admin Panel — follows Gamepedia's pattern:
  //   - Loads settings from /api/v1/admin/extensions/nexus-gifs on mount
  //   - Wires window._nexusAdminSaveFn for the top-bar Save Changes button
  //   - Calls window._nexusAdminSetDirty() when values change
  // Two tabs: Credentials (API key → our backend) | Content (filter, webp → Nexus settings)
  // ---------------------------------------------------------------------------

  function GifsAdminPanel() {
    const [tab, setTab] = useState("credentials");

    // Credentials state — writes to our backend via /ext/nexus-gifs/api/settings
    const [apiKey,     setApiKey]     = useState("");
    const [apiKeySet,  setApiKeySet]  = useState(false);
    const [apiKeyMask, setApiKeyMask] = useState(null);
    const [keySaving,  setKeySaving]  = useState(false);
    const [keyLoading, setKeyLoading] = useState(true);
    const [keyMsg,     setKeyMsg]     = useState(null);

    // Content settings state — writes to Nexus extension settings
    const [contentFilter, setContentFilter] = useState("R");
    const [useWebp,       setUseWebp]       = useState(false);
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    useEffect(() => {
      // Load API key status from our backend
      apiFetch("/settings")
        .then(d => {
          setApiKeySet(d.api_key_set || false);
          setApiKeyMask(d.api_key_masked || null);
        })
        .catch(() => {})
        .finally(() => setKeyLoading(false));

      // Load content settings from Nexus extension settings — same pattern as Gamepedia
      fetch("/api/v1/admin/extensions/nexus-gifs", { headers: authHeaders() })
        .then(r => r.json())
        .then(d => {
          const s = d.extension?.settings || {};
          setContentFilter(s.content_filter || "R");
          setUseWebp(s.use_webp || false);
          setSettingsLoaded(true);
        })
        .catch(() => setSettingsLoaded(true));
    }, []);

    // Wire the top-bar Save Changes button — same pattern as Gamepedia
    function wireAdminSave() {
      window._nexusAdminSaveFn = async () => {
        // Save content settings to Nexus
        await fetch("/api/v1/admin/extensions/nexus-gifs/settings", {
          method:  "PATCH",
          headers: authHeaders(),
          body:    JSON.stringify({ settings: {
            content_filter: contentFilter,
            use_webp:       useWebp,
          }}),
        });
      };
    }

    function saveApiKey() {
      if (!apiKey.trim()) return;
      setKeySaving(true); setKeyMsg(null);
      apiFetch("/settings", {
        method: "PATCH",
        body:   { api_key: apiKey.trim() },
      })
        .then(d => {
          if (d.error) {
            setKeyMsg({ type: "err", text: d.error });
          } else {
            setApiKeySet(d.api_key_set || false);
            setApiKeyMask(d.api_key_masked || null);
            setApiKey("");
            setKeyMsg({ type: "ok", text: "API key saved." });
          }
        })
        .catch(() => setKeyMsg({ type: "err", text: "Save failed." }))
        .finally(() => setKeySaving(false));
    }

    return e("div", { className: "ngifs-admin" },

      // Tabs — same structure as Gamepedia admin tabs
      e("div", { className: "ngifs-admin-tabs" },
        [
          { key: "credentials", icon: "fa-key",     label: "Credentials" },
          { key: "content",     icon: "fa-sliders",  label: "Content Settings" },
        ].map(t =>
          e("button", {
            key:       t.key,
            className: "ngifs-admin-tab" + (tab === t.key ? " active" : ""),
            onClick:   () => {
              setTab(t.key);
              // Wire Save Changes button when switching to content tab
              if (t.key === "content") {
                wireAdminSave();
                window._nexusAdminSetDirty && window._nexusAdminSetDirty();
              } else {
                // Credentials tab has its own save button — unwire top-bar save
                window._nexusAdminSaveFn = null;
              }
            },
          },
            e("span", { style: { display: "flex", alignItems: "center", gap: 6 } },
              e("i", { className: `fa-solid ${t.icon}`, style: { fontSize: 12 } }),
              t.label
            )
          )
        )
      ),

      // ── Credentials Tab ──────────────────────────────────────────────────────
      tab === "credentials" && e("div", null,
        e("div", { className: "ngifs-admin-section" },
          e("div", { className: "ngifs-admin-section-title" }, "KLIPY API Key"),
          e("p", { style: { fontSize: 12, color: "var(--t4)", marginBottom: 16 } },
            "Required to load and search GIFs. Get a free key at ",
            e("a", { href: "https://klipy.com", target: "_blank", style: { color: "var(--ac)" } }, "klipy.com"),
            ". The key is stored server-side and never exposed to the browser."
          ),
          keyLoading
            ? e("div", { style: { color: "var(--t5)", fontSize: 13 } },
                e("i", { className: "fa-solid fa-spinner fa-spin", style: { marginRight: 6 } }),
                "Loading\u2026"
              )
            : e("div", null,
                apiKeySet && e("div", {
                  style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--green)", marginBottom: 12 }
                },
                  e("i", { className: "fa-solid fa-circle-check" }),
                  `API key configured: ${apiKeyMask || "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}`
                ),
                e("label", { className: "ngifs-label" },
                  apiKeySet ? "Replace API Key" : "API Key"
                ),
                e("input", {
                  type:         "password",
                  className:    "ngifs-fi",
                  value:        apiKey,
                  onChange:     ev => setApiKey(ev.target.value),
                  onKeyDown:    ev => { if (ev.key === "Enter") saveApiKey(); },
                  placeholder:  apiKeySet ? "Enter new key to replace" : "Paste your KLIPY API key",
                  autoComplete: "new-password",
                }),
                keyMsg && e("div", {
                  className: keyMsg.type === "ok" ? "ngifs-msg-ok" : "ngifs-msg-err"
                }, keyMsg.text),
                e("div", { style: { marginTop: 14 } },
                  e("button", {
                    className: "btn-primary",
                    style:     { fontSize: 13, padding: "7px 20px", opacity: keySaving || !apiKey.trim() ? 0.5 : 1 },
                    onClick:   saveApiKey,
                    disabled:  keySaving || !apiKey.trim(),
                  }, keySaving ? "Saving\u2026" : "Save API Key")
                )
              )
        )
      ),

      // ── Content Settings Tab ─────────────────────────────────────────────────
      tab === "content" && e("div", null,
        !settingsLoaded
          ? e("div", { style: { color: "var(--t5)", fontSize: 13, padding: "24px 0" } },
              e("i", { className: "fa-solid fa-spinner fa-spin", style: { marginRight: 6 } }),
              "Loading\u2026"
            )
          : e("div", null,
              e("div", { className: "ngifs-admin-section" },
                e("div", { className: "ngifs-admin-section-title" }, "Content Filter"),
                e("label", { className: "ngifs-label" }, "Maturity rating"),
                e("select", {
                  className: "ngifs-fi-select",
                  value:     contentFilter,
                  onChange:  ev => {
                    setContentFilter(ev.target.value);
                    wireAdminSave();
                    window._nexusAdminSetDirty && window._nexusAdminSetDirty();
                  },
                },
                  e("option", { value: "G" },     "G \u2014 Family Safe"),
                  e("option", { value: "PG" },    "PG"),
                  e("option", { value: "PG-13" }, "PG-13"),
                  e("option", { value: "R" },     "R \u2014 Unrestricted")
                ),
                e("div", { className: "ngifs-hint" },
                  "Controls the maturity of content returned by KLIPY search."
                )
              ),
              e("div", { className: "ngifs-admin-section" },
                e("div", { className: "ngifs-admin-section-title" }, "Format"),
                e("div", { className: "ngifs-tgl-row" },
                  e("div", null,
                    e("div", { style: { fontSize: 14, color: "var(--t2)", marginBottom: 2 } }, "Use WebP format"),
                    e("div", { className: "ngifs-hint" },
                      "Smaller files, better performance. Disable if GIFs don\u2019t display correctly."
                    )
                  ),
                  e("div", {
                    className: "tgl",
                    style:     { background: useWebp ? "var(--ac)" : "var(--tgl-off)", cursor: "pointer", flexShrink: 0 },
                    onClick:   () => {
                      setUseWebp(p => !p);
                      wireAdminSave();
                      window._nexusAdminSetDirty && window._nexusAdminSetDirty();
                    },
                  },
                    e("div", {
                      className: "tgl-knob",
                      style:     { left: useWebp ? 23 : 3, background: useWebp ? "var(--ac-on)" : "var(--tgl-knob-off)" },
                    })
                  )
                )
              ),
              e("p", { style: { fontSize: 12, color: "var(--t4)", marginTop: 4 } },
                e("i", { className: "fa-solid fa-info-circle", style: { marginRight: 5 } }),
                "Use the Save Changes button above to save content settings."
              )
            )
      )
    );
  }

  // ---------------------------------------------------------------------------
  // Registrations
  // ---------------------------------------------------------------------------

  // Composer toolbar button
  NE.registerToolbarButton({
    icon:  "fa-solid fa-photo-film",
    tip:   "Insert GIF or Sticker",
    color: "var(--ac)",
    onClick(linkedItems, setLinkedItems) {
      const inserter = makeInserter();
      openGifPicker(inserter);
    },
  }, 60);

  // Admin panel — appears under "installed extensions" in the admin sidebar
  NE.registerAdminPanel("nexus-gifs", {
    label:     "GIFs",
    icon:      "fa-photo-film",
    component: GifsAdminPanel,
  });

})();
