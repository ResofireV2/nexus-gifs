defmodule NexusGifsWeb.Router do
  use Phoenix.Router
  import Plug.Conn
  import Phoenix.Controller

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :proxy_auth do
    plug NexusGifsWeb.Plugs.VerifyProxySecret
  end

  # Health check — no auth
  scope "/", NexusGifsWeb do
    pipe_through :api
    get "/health", HealthController, :show
  end

  # GIF API — requires proxy secret from Nexus
  scope "/api/gifs", NexusGifsWeb do
    pipe_through [:api, :proxy_auth]

    get  "/trending", GifController, :trending
    get  "/search",   GifController, :search
    post "/share",    GifController, :share
  end

  # Settings API — requires proxy secret + admin
  scope "/api/settings", NexusGifsWeb do
    pipe_through [:api, :proxy_auth]

    get   "/", SettingsController, :show
    patch "/", SettingsController, :update
  end

  # JS bundle — public, no auth
  scope "/assets", NexusGifsWeb do
    get "/*path", AssetController, :serve
  end

  # Webhook from Nexus (currently unused but required by manifest)
  scope "/webhook", NexusGifsWeb do
    pipe_through :api
    post "/", WebhookController, :handle
  end
end
