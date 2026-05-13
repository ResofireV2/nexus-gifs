import Config

# Database
database_url =
  System.get_env("DATABASE_URL") ||
    raise "DATABASE_URL environment variable is not set"

config :nexus_gifs, NexusGifs.Repo,
  url: database_url,
  pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
  ssl: System.get_env("DB_SSL") == "true"

# Endpoint
port = String.to_integer(System.get_env("PORT") || "4002")

config :nexus_gifs, NexusGifsWeb.Endpoint,
  http: [ip: {0, 0, 0, 0}, port: port],
  secret_key_base:
    System.get_env("SECRET_KEY_BASE") ||
      raise("SECRET_KEY_BASE environment variable is not set"),
  server: true

# Proxy secret — must match what Nexus sends as X-Nexus-Proxy-Secret
config :nexus_gifs,
  proxy_secret: System.get_env("NEXUS_PROXY_SECRET") || ""
