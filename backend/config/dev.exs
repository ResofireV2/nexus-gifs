import Config

config :nexus_gifs, NexusGifs.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "nexus_gifs_dev",
  stacktrace: true,
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

config :nexus_gifs, NexusGifsWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: "local_dev_secret_key_base_change_in_production_xxxxxxxxxxxxx",
  watchers: []

config :nexus_gifs,
  proxy_secret: ""  # empty = no auth check in dev
