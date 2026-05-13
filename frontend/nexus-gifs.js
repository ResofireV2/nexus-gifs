(function () {
  "use strict";

  const React = window.React;
  const { useState, useEffect, useRef, useCallback } = React;
  const NE = window.NexusExtensions;

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
  function authHeaders() {
    const token = localStorage.getItem("nexus_token");
    return {
      "Content-Type":  "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    };
  }

  function apiGet(path) {
    return fetch(path, { headers: authHeaders() }).then(r => r.json());
  }

  function apiPatch(path, body) {
    return fetch(path, {
      method: "PATCH",
      headers: authHeaders(),
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
    return apiGet(`${BASE_API}/search?type=${type}&q=${encodeURIComponent(query)}&page=${page}&customer_id=${cid}`);
  }

  function fireShare(type, slug, query) {
    fetch(`${BASE_API}/share`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ type, slug, query: query || "", customer_id: getCustomerId() }),
    }).catch(() => {});
  }

  // ── CSS injected once ─────────────────────────────────────────────────────────
  (function injectCSS() {
    if (document.getElementById("nexus-gifs-styles")) return;
    const style = document.createElement("style");
    style.id = "nexus-gifs-styles";
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
  })();

  // ── URL extraction ────────────────────────────────────────────────────────────
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
           f.md?.gif?.url  || f.md?.webp?.url || f.md?.png?.url || null;
  }

  // ── GIF Grid Item ─────────────────────────────────────────────────────────────
  function GifItem({ item, onSelect }) {
    const [loaded, setLoaded] = useState(false);
    const previewUrl = resolvePreviewUrl(item);
    const embedUrl   = resolveEmbedUrl(item);
    if (!previewUrl || !embedUrl) return null;
    const blurStyle = item.blur_preview
      ? { backgroundImage: `url('${item.blur_preview}')`, backgroundSize: "cover", backgroundPosition: "center" }
      : {};
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
        onLoad:  () => setLoaded(true),
        onError: () => setLoaded(true),
      })
    );
  }

  // ── GIF Picker Modal ──────────────────────────────────────────────────────────
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
      const fn = e => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", fn);
      return () => document.removeEventListener("keydown", fn);
    }, [onClose]);

    const doSearch = useCallback((q) => {
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
    }, []);

    const clearSearch = useCallback(() => {
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
    }, []);

    const loadMore = useCallback(() => {
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
    }, [loadingMore, hasNext, page, isSearching]);

    const onScroll = useCallback((e) => {
      const el = e.target;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 240) loadMore();
    }, [loadMore]);

    const handleSelect = useCallback((item, embedUrl) => {
      const title = item.title || (tabRef.current === "stickers" ? "sticker" : "GIF");
      onInsert(`![${title}](${embedUrl})`);
      fireShare(tabRef.current, item.slug, isSearching ? queryRef.current.trim() : "");
      onClose();
    }, [isSearching, onInsert, onClose]);

    const renderContent = () => {
      if (!apiKeySet) {
        return React.createElement("div", { className: "ngifs-no-key" },
          React.createElement("div", { className: "ngifs-no-key-icon" },
            React.createElement("i", { className: "fa-solid fa-key" })
          ),
          React.createElement("div", { style: { fontSize: 15, fontWeight: 600, color: "var(--t1)" } }, "KLIPY API Key Required"),
          React.createElement("div", { style: { fontSize: 13, color: "var(--t4)", lineHeight: 1.6, maxWidth: 280 } },
            "Add your KLIPY API key in Admin Panel \u2192 GIFs to enable this feature."
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
      return React.createElement("div", { className: "ngifs-grid-wrap", onScroll },
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
        React.createElement("div", { className: "ngifs-header" },
          React.createElement("span", { className: "ngifs-title" }, "Insert Media"),
          React.createElement("button", { className: "ngifs-close", onClick: onClose, "aria-label": "Close" },
            React.createElement("i", { className: "fa-solid fa-xmark" })
          )
        ),
        React.createElement("div", { className: "ngifs-tabs" },
          ["gifs", "stickers"].map(t =>
            React.createElement("button", {
              key: t,
              className: `ngifs-tab${tab === t ? " active" : ""}`,
              onClick: () => { if (tab !== t) setTab(t); },
            }, t.charAt(0).toUpperCase() + t.slice(1))
          )
        ),
        React.createElement("div", { className: "ngifs-search" },
          React.createElement("div", { className: "ngifs-search-inner" },
            React.createElement("i", { className: "fa-solid fa-magnifying-glass" }),
            React.createElement("input", {
              ref: inputRef,
              type: "text",
              placeholder: "Search KLIPY",
              value: query,
              onChange: e => setQuery(e.target.value),
              onKeyDown: e => { if (e.key === "Enter") { e.preventDefault(); doSearch(query); } },
              autoComplete: "off",
              spellCheck: false,
            }),
            isSearching && React.createElement("button", { className: "ngifs-clear-btn", onClick: clearSearch }, "Trending")
          )
        ),
        renderContent(),
        React.createElement("div", { className: "ngifs-footer" },
          React.createElement("a", {
            href: "https://klipy.com",
            target: "_blank",
            rel: "noopener noreferrer",
            className: "ngifs-attribution",
          }, "Powered by ", React.createElement("span", null, "KLIPY"))
        )
      )
    );
  }

  // ── Modal portal ──────────────────────────────────────────────────────────────
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

    // Optimistically render with apiKeySet=true, then verify
    root.render(React.createElement(GifPickerModal, { onClose: close, onInsert, apiKeySet: true }));

    // Check if the api_key is actually set in our backend
    apiGet(`/api/v1/extensions/${SLUG}/api/settings`)
      .then(d => {
        if (!d.api_key_set) {
          root.render(React.createElement(GifPickerModal, { onClose: close, onInsert, apiKeySet: false }));
        }
      })
      .catch(() => {}); // if check fails, optimistic render stands
  }

  // ── Cursor insertion ──────────────────────────────────────────────────────────
  // Called from toolbar onMouseDown — textarea still has focus at this point
  // because onMouseDown + e.preventDefault() on the toolbar button prevents blur.
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

  // ── Admin panel ───────────────────────────────────────────────────────────────
  // The API key is stored in our own backend (so it never leaves server-side).
  // Content filter and WebP toggle are stored in Nexus extension settings via
  // TabbedPanel, which also integrates with the admin top-bar Save Changes button.
  function GifsAdminPanel() {
    // NexusExtensionTemplates is guaranteed present when this component renders
    const { TabbedPanel } = window.NexusExtensionTemplates;

    const [apiKey,     setApiKey]     = useState("");
    const [apiKeySet,  setApiKeySet]  = useState(false);
    const [apiKeyMask, setApiKeyMask] = useState(null);
    const [keySaving,  setKeySaving]  = useState(false);
    const [keyLoading, setKeyLoading] = useState(true);
    const [keyMsg,     setKeyMsg]     = useState(null);

    useEffect(() => {
      apiGet(`/api/v1/extensions/${SLUG}/api/settings`)
        .then(d => {
          setApiKeySet(d.api_key_set || false);
          setApiKeyMask(d.api_key_masked || null);
        })
        .catch(() => {})
        .finally(() => setKeyLoading(false));
    }, []);

    const saveApiKey = async () => {
      if (!apiKey.trim()) return;
      setKeySaving(true); setKeyMsg(null);
      try {
        const d = await apiPatch(`/api/v1/extensions/${SLUG}/api/settings`, { api_key: apiKey.trim() });
        if (d.error) {
          setKeyMsg({ type: "err", text: d.error });
        } else {
          setApiKeySet(d.api_key_set || false);
          setApiKeyMask(d.api_key_masked || null);
          setApiKey("");
          setKeyMsg({ type: "ok", text: "API key saved." });
        }
      } catch {
        setKeyMsg({ type: "err", text: "Save failed." });
      } finally {
        setKeySaving(false);
      }
    };

    const fi = {
      width: "100%", padding: "11px 15px",
      background: "rgba(255,255,255,0.05)",
      border: "0.5px solid rgba(255,255,255,0.1)",
      borderRadius: 12, color: "var(--t1)",
      fontSize: 14, outline: "none",
      fontFamily: "inherit", boxSizing: "border-box",
    };

    return React.createElement("div", { style: { maxWidth: 520 } },

      // API Key section — writes to our backend
      React.createElement("div", {
        style: {
          background: "rgba(255,255,255,0.02)",
          border: "0.5px solid var(--b1)",
          borderRadius: 14, padding: "20px 22px", marginBottom: 24,
        }
      },
        React.createElement("div", {
          style: { fontSize: 12, fontWeight: 500, color: "var(--t5)", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 16, paddingBottom: 8, borderBottom: "0.5px solid var(--b1)" }
        }, "KLIPY Credentials"),

        keyLoading
          ? React.createElement("div", { style: { color: "var(--t5)", fontSize: 13 } },
              React.createElement("i", { className: "fa-solid fa-spinner fa-spin", style: { marginRight: 6 } }), "Loading…"
            )
          : React.createElement("div", null,
              React.createElement("label", {
                style: { fontSize: 14, color: "var(--t3)", marginBottom: 7, display: "block" }
              }, "KLIPY API Key"),
              React.createElement("input", {
                type: "password", style: fi,
                value: apiKey,
                onChange: e => setApiKey(e.target.value),
                onKeyDown: e => { if (e.key === "Enter") saveApiKey(); },
                placeholder: apiKeySet
                  ? `Current: ${apiKeyMask || "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"} \u2014 type to replace`
                  : "Enter your KLIPY API key",
                autoComplete: "new-password",
              }),
              React.createElement("div", { style: { fontSize: 12, color: "var(--t5)", marginTop: 5 } },
                "Get a free key at ",
                React.createElement("a", {
                  href: "https://klipy.com", target: "_blank", rel: "noopener",
                  style: { color: "var(--ac-text)" }
                }, "klipy.com")
              ),
              apiKeySet && React.createElement("div", {
                style: { marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--green)" }
              },
                React.createElement("i", { className: "fa-solid fa-circle-check" }),
                " API key is configured"
              ),
              keyMsg && React.createElement("div", {
                style: {
                  marginTop: 10, padding: "8px 12px", borderRadius: 8,
                  fontSize: 12, fontWeight: 500,
                  background: keyMsg.type === "ok" ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)",
                  color: keyMsg.type === "ok" ? "var(--green)" : "var(--red)",
                  border: `0.5px solid ${keyMsg.type === "ok" ? "rgba(52,211,153,.2)" : "rgba(248,113,113,.2)"}`,
                }
              }, keyMsg.text),
              React.createElement("button", {
                className: "btn-primary",
                style: { marginTop: 14, fontSize: 13, padding: "7px 18px", opacity: keySaving || !apiKey.trim() ? 0.5 : 1 },
                onClick: saveApiKey,
                disabled: keySaving || !apiKey.trim(),
              }, keySaving ? "Saving\u2026" : "Save API Key")
            )
      ),

      // Content settings via TabbedPanel — integrates with Nexus Save Changes button
      React.createElement(TabbedPanel, {
        slug: SLUG,
        tabs: [{
          key:    "content",
          label:  "Content Settings",
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
              key:   "use_webp",
              label: "Use WebP format",
              type:  "boolean",
              hint:  "Smaller files, better performance. Disable if images don't display correctly.",
            },
          ],
        }],
      })
    );
  }

  // ── Register ──────────────────────────────────────────────────────────────────

  // Toolbar button — icon must be the full FA class string
  NE.registerToolbarButton({
    icon:  "fa-solid fa-photo-film",
    tip:   "Insert GIF or Sticker",
    color: "var(--ac)",
    onClick(_linkedItems, _setLinkedItems) {
      const inserter = makeInserter();
      openGifPicker(inserter);
    },
  }, 60);

  // Admin panel — appears under "installed extensions" in the admin sidebar
  NE.registerAdminPanel(SLUG, {
    label:     "GIFs",
    icon:      "fa-photo-film",
    component: GifsAdminPanel,
  });

})();
