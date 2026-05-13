import Config

config :nexus_gifs,
  ecto_repos: [NexusGifs.Repo],
  asset_dir: "priv/static/assets"

config :nexus_gifs, NexusGifsWeb.Endpoint,
  render_errors: [
    formats: [json: NexusGifsWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: NexusGifs.PubSub,
  live_view: [signing_salt: "nexus_gifs"]

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

import_config "#{config_env()}.exs"
