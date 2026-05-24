defmodule NexusGifs.ApiRouter do
  @moduledoc """
  Plug.Router handling all GIF API requests for the nexus-gifs extension.

  Mounted by NexusGifs.routes/0 at "/api", so these routes are reached at:
    GET  /ext/nexus-gifs/api/gifs/trending
    GET  /ext/nexus-gifs/api/gifs/search
    POST /ext/nexus-gifs/api/gifs/share

  conn.assigns.current_user is set by Nexus's LoadUser plug (which runs on
  all :extension_api pipeline requests) before this router is called.

  Settings are read fresh per request from Nexus.Extensions so they always
  reflect what the admin has configured — no caching, no GenServer needed.
  """

  use Plug.Router

  plug :match
  plug :dispatch

  # GET /settings — returns whether the API key is configured.
  # Called by the JS bundle before opening the GIF picker so it can show
  # a "key required" prompt rather than a failed fetch if unconfigured.
  get "/settings" do
    api_key = NexusGifs.settings()["api_key"]
    send_json(conn, 200, %{api_key_set: not (is_nil(api_key) or api_key == "")})
  end

  # GET /gifs/trending?type=gifs&page=1
  get "/gifs/trending" do
    type        = validated_type(conn.params["type"])
    page        = parse_page(conn.params["page"])
    customer_id = customer_id(conn)
    settings    = NexusGifs.settings()
    api_key     = settings["api_key"]

    if is_nil(api_key) or api_key == "" do
      send_json(conn, 422, %{error: "KLIPY API key not configured"})
    else
      case NexusGifs.Klipy.trending(api_key, type, page, customer_id) do
        {:ok, result}    -> send_json(conn, 200, result)
        {:error, reason} -> send_json(conn, 502, %{error: reason})
      end
    end
  end

  # GET /gifs/search?type=gifs&q=cats&page=1
  get "/gifs/search" do
    type        = validated_type(conn.params["type"])
    query       = String.trim(conn.params["q"] || "")
    page        = parse_page(conn.params["page"])
    settings    = NexusGifs.settings()
    api_key     = settings["api_key"]
    filter      = settings["content_filter"] || "R"
    customer_id = customer_id(conn)

    cond do
      is_nil(api_key) or api_key == "" ->
        send_json(conn, 422, %{error: "KLIPY API key not configured"})

      query == "" ->
        send_json(conn, 422, %{error: "Search query required"})

      true ->
        case NexusGifs.Klipy.search(api_key, type, query, page, filter, customer_id) do
          {:ok, result}    -> send_json(conn, 200, result)
          {:error, reason} -> send_json(conn, 502, %{error: reason})
        end
    end
  end

  # POST /gifs/share  body: { type, slug, query }
  post "/gifs/share" do
    type        = validated_type(conn.params["type"])
    slug        = conn.params["slug"] || ""
    query       = conn.params["query"] || ""
    customer_id = customer_id(conn)
    settings    = NexusGifs.settings()
    api_key     = settings["api_key"]

    # Share is non-critical — always return ok; fire-and-forget if valid
    if slug != "" and not (is_nil(api_key) or api_key == "") do
      Task.start(fn -> NexusGifs.Klipy.share(api_key, type, slug, customer_id, query) end)
    end

    send_json(conn, 200, %{ok: true})
  end

  match _ do
    send_json(conn, 404, %{error: "Not found"})
  end

  # ── Private ────────────────────────────────────────────────────────────────

  defp send_json(conn, status, body) do
    conn
    |> Plug.Conn.put_resp_content_type("application/json")
    |> Plug.Conn.send_resp(status, Jason.encode!(body))
  end

  defp validated_type(t) when t in ["gifs", "stickers"], do: t
  defp validated_type(_), do: "gifs"

  defp parse_page(nil), do: 1
  defp parse_page(p) when is_binary(p) do
    case Integer.parse(p) do
      {n, _} when n > 0 -> n
      _                  -> 1
    end
  end
  defp parse_page(p) when is_integer(p) and p > 0, do: p
  defp parse_page(_), do: 1

  # Derive a stable customer_id: prefer the Nexus user id from current_user
  # (set by Nexus's LoadUser plug), fall back to a query param for guests.
  defp customer_id(conn) do
    case conn.assigns[:current_user] do
      nil  -> conn.params["customer_id"] || "guest"
      user -> "nexus_#{user.id}"
    end
  end
end
