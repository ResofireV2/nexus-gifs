import Config

config :nexus_gifs, NexusGifs.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "nexus_gifs_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: 10

config :nexus_gifs, NexusGifsWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4003],
  secret_key_base: "test_secret_key_base_change_in_production_xxxxxxxxxxxxxxx",
  server: false

config :nexus_gifs,
  proxy_secret: ""

config :logger, level: :warning
