defmodule NexusGifsWeb.HealthController do
  use Phoenix.Controller, formats: [:json]

  def show(conn, _params) do
    json(conn, %{status: "ok", service: "nexus-gifs"})
  end
end

defmodule NexusGifsWeb.AssetController do
  use Phoenix.Controller

  @asset_dir Application.compile_env(:nexus_gifs, :asset_dir, "priv/static/assets")

  def serve(conn, %{"path" => path_parts}) do
    filename   = Path.join(path_parts)
    asset_path = Path.join(@asset_dir, filename)

    if File.exists?(asset_path) do
      conn
      |> Plug.Conn.put_resp_header("access-control-allow-origin", "*")
      |> Plug.Conn.put_resp_header("cache-control", "public, max-age=86400")
      |> Plug.Conn.send_file(200, asset_path)
    else
      conn
      |> put_status(:not_found)
      |> Phoenix.Controller.json(%{error: "Asset not found"})
    end
  end
end

defmodule NexusGifsWeb.WebhookController do
  use Phoenix.Controller, formats: [:json]
  require Logger

  def handle(conn, params) do
    event = params["event"]
    Logger.info("nexus-gifs webhook: #{event}")
    json(conn, %{ok: true})
  end
end
