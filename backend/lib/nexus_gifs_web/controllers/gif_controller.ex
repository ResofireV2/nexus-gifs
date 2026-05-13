defmodule NexusGifsWeb.GifController do
  use Phoenix.Controller, formats: [:json]

  alias NexusGifs.{Klipy, Settings}

  # GET /api/gifs/trending?type=gifs&page=1
  def trending(conn, params) do
    type        = validated_type(params["type"])
    page        = parse_page(params["page"])
    customer_id = customer_id(conn, params)
    api_key     = Settings.get("api_key")

    if is_nil(api_key) or api_key == "" do
      conn |> put_status(:unprocessable_entity) |> json(%{error: "KLIPY API key not configured"})
    else
      case Klipy.trending(api_key, type, page, customer_id) do
        {:ok, result}    -> json(conn, result)
        {:error, reason} -> conn |> put_status(:bad_gateway) |> json(%{error: reason})
      end
    end
  end

  # GET /api/gifs/search?type=gifs&q=cats&page=1&filter=R
  def search(conn, params) do
    type        = validated_type(params["type"])
    query       = String.trim(params["q"] || "")
    page        = parse_page(params["page"])
    filter      = validated_filter(params["filter"])
    customer_id = customer_id(conn, params)
    api_key     = Settings.get("api_key")

    cond do
      is_nil(api_key) or api_key == "" ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "KLIPY API key not configured"})

      query == "" ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "Search query required"})

      true ->
        case Klipy.search(api_key, type, query, page, filter, customer_id) do
          {:ok, result}    -> json(conn, result)
          {:error, reason} -> conn |> put_status(:bad_gateway) |> json(%{error: reason})
        end
    end
  end

  # POST /api/gifs/share  body: { type, slug, query }
  def share(conn, params) do
    type        = validated_type(params["type"])
    slug        = params["slug"] || ""
    query       = params["query"] || ""
    customer_id = customer_id(conn, params)
    api_key     = Settings.get("api_key")

    if slug == "" or is_nil(api_key) or api_key == "" do
      json(conn, %{ok: true})  # silently succeed — share is non-critical
    else
      Task.start(fn -> Klipy.share(api_key, type, slug, customer_id, query) end)
      json(conn, %{ok: true})
    end
  end

  # ── Private ──────────────────────────────────────────────────────────────────

  defp validated_type(t) when t in ["gifs", "stickers"], do: t
  defp validated_type(_), do: "gifs"

  defp validated_filter(f) when f in ["G", "PG", "PG-13", "R"], do: f
  defp validated_filter(_) do
    # Fall back to the configured default
    Settings.get("content_filter") || "R"
  end

  defp parse_page(nil), do: 1
  defp parse_page(p) when is_binary(p) do
    case Integer.parse(p) do
      {n, _} when n > 0 -> n
      _                  -> 1
    end
  end
  defp parse_page(p) when is_integer(p) and p > 0, do: p
  defp parse_page(_), do: 1

  # Derive a stable customer_id: prefer the Nexus user ID from the proxy header,
  # fall back to a query param sent by the frontend for guest users.
  defp customer_id(conn, params) do
    case get_req_header(conn, "x-nexus-user-id") |> List.first() do
      nil   -> params["customer_id"] || "guest"
      uid   -> "nexus_#{uid}"
    end
  end
end
