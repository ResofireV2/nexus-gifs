defmodule NexusGifs.Repo do
  use Ecto.Repo,
    otp_app: :nexus_gifs,
    adapter: Ecto.Adapters.Postgres
end
