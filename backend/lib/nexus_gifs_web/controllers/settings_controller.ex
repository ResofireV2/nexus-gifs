defmodule NexusGifsWeb.SettingsController do
  use Phoenix.Controller, formats: [:json]

  alias NexusGifs.Settings

  # GET /api/settings
  def show(conn, _params) do
    settings = Settings.all()

    # Never expose the raw API key — send a masked version
    masked = case settings["api_key"] do
      nil -> nil
      ""  -> nil
      key -> String.slice(key, 0, 4) <> String.duplicate("•", max(0, String.length(key) - 4))
    end

    json(conn, %{
      api_key_set:     not is_nil(settings["api_key"]) and settings["api_key"] != "",
      api_key_masked:  masked,
      content_filter:  settings["content_filter"] || "R",
      use_webp:        settings["use_webp"] || false
    })
  end

  # PATCH /api/settings  body: { api_key?, content_filter?, use_webp? }
  def update(conn, params) do
    updates =
      %{}
      |> maybe_put("api_key",        params["api_key"])
      |> maybe_put("content_filter", validated_filter(params["content_filter"]))
      |> maybe_put_bool("use_webp",  params["use_webp"])

    if map_size(updates) == 0 do
      conn |> put_status(:unprocessable_entity) |> json(%{error: "No valid fields provided"})
    else
      Settings.update(updates)
      show(conn, %{})
    end
  end

  defp maybe_put(map, _key, nil),   do: map
  defp maybe_put(map, _key, ""),    do: map
  defp maybe_put(map, key, value),  do: Map.put(map, key, value)

  defp maybe_put_bool(map, _key, nil), do: map
  defp maybe_put_bool(map, key, v) when is_boolean(v), do: Map.put(map, key, v)
  defp maybe_put_bool(map, key, "true"),  do: Map.put(map, key, true)
  defp maybe_put_bool(map, key, "false"), do: Map.put(map, key, false)
  defp maybe_put_bool(map, _key, _),     do: map

  defp validated_filter(f) when f in ["G", "PG", "PG-13", "R"], do: f
  defp validated_filter(_), do: nil
end
