defmodule NexusGifs.Klipy do
  @moduledoc """
  KLIPY API proxy.

  Endpoints:
    GET /api/v1/{key}/gifs/trending?per_page=24&page=1&customer_id=...
    GET /api/v1/{key}/gifs/search?q=cats&per_page=24&page=1&customer_id=...&content_filter=off
    GET /api/v1/{key}/stickers/trending?...
    GET /api/v1/{key}/stickers/search?...
    POST /api/v1/{key}/{type}/share/{slug}   body: { customer_id, q }

  Response envelope:
    { "result": true, "data": { "data": [...], "current_page": 1, "per_page": 24, "has_next": true } }

  Content filter mapping (MPA → KLIPY):
    G     → "high"
    PG    → "medium"
    PG-13 → "low"
    R     → "off"
  """

  require Logger

  @base_url "https://api.klipy.com/api/v1"
  @per_page 24
  @timeout 10_000

  @type content_type   :: String.t()  # "gifs" | "stickers"
  @type content_filter :: String.t()  # "G" | "PG" | "PG-13" | "R"

  # ── Public API ───────────────────────────────────────────────────────────────

  def trending(api_key, type, page, customer_id) when type in ["gifs", "stickers"] do
    url =
      "#{@base_url}/#{api_key}/#{type}/trending?" <>
      URI.encode_query(%{
        per_page:    @per_page,
        page:        page,
        customer_id: customer_id
      })

    fetch(url)
  end

  def search(api_key, type, query, page, content_filter, customer_id)
      when type in ["gifs", "stickers"] do
    url =
      "#{@base_url}/#{api_key}/#{type}/search?" <>
      URI.encode_query(%{
        per_page:       @per_page,
        page:           page,
        q:              query,
        content_filter: to_klipy_filter(content_filter),
        customer_id:    customer_id
      })

    fetch(url)
  end

  def share(api_key, type, slug, customer_id, query \\ "") when type in ["gifs", "stickers"] do
    url = "#{@base_url}/#{api_key}/#{type}/share/#{slug}"

    body = Jason.encode!(%{
      customer_id: customer_id,
      q: query
    })

    case Req.post(url, body: body, headers: [{"content-type", "application/json"}], receive_timeout: @timeout) do
      {:ok, %{status: status}} when status in 200..299 ->
        :ok
      {:ok, %{status: status}} ->
        Logger.warning("Klipy share returned #{status} for #{type}/#{slug}")
        :ok  # share failures are non-fatal
      {:error, reason} ->
        Logger.warning("Klipy share failed: #{inspect(reason)}")
        :ok  # share failures are non-fatal
    end
  end

  # ── Private ──────────────────────────────────────────────────────────────────

  defp fetch(url) do
    case Req.get(url, receive_timeout: @timeout) do
      {:ok, %{status: 200, body: body}} ->
        parse_response(body)

      {:ok, %{status: 401}} ->
        {:error, "Invalid KLIPY API key"}

      {:ok, %{status: status}} ->
        {:error, "KLIPY API returned #{status}"}

      {:error, reason} ->
        Logger.warning("KLIPY fetch failed: #{inspect(reason)}")
        {:error, "Could not reach KLIPY API"}
    end
  end

  defp parse_response(body) when is_map(body) do
    case body do
      %{"result" => true, "data" => %{"data" => items, "has_next" => has_next}} ->
        {:ok, %{items: items, has_next: has_next}}

      %{"result" => false} ->
        {:error, "KLIPY API returned result: false"}

      _ ->
        {:error, "Unexpected KLIPY response shape"}
    end
  end

  defp parse_response(body) when is_binary(body) do
    case Jason.decode(body) do
      {:ok, map}      -> parse_response(map)
      {:error, _}     -> {:error, "KLIPY returned non-JSON response"}
    end
  end

  defp parse_response(_), do: {:error, "Unexpected response format"}

  # MPA rating → KLIPY content_filter param
  defp to_klipy_filter("G"),     do: "high"
  defp to_klipy_filter("PG"),    do: "medium"
  defp to_klipy_filter("PG-13"), do: "low"
  defp to_klipy_filter(_),       do: "off"   # "R" or anything else → unrestricted
end
