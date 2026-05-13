defmodule NexusGifs.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      NexusGifs.Repo,
      NexusGifs.Settings,
      {Phoenix.PubSub, name: NexusGifs.PubSub},
      NexusGifsWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: NexusGifs.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    NexusGifsWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
