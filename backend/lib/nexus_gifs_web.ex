defmodule NexusGifsWeb do
  @moduledoc """
  Entrypoint for defining web interface modules.
  """

  def controller do
    quote do
      use Phoenix.Controller,
        formats: [:json],
        layouts: false

      import Plug.Conn

      unquote(verified_routes())
    end
  end

  def router do
    quote do
      use Phoenix.Router, helpers: false
      import Plug.Conn
      import Phoenix.Controller
    end
  end

  defp verified_routes do
    quote do
      use Phoenix.VerifiedRoutes,
        endpoint: NexusGifsWeb.Endpoint,
        router: NexusGifsWeb.Router,
        statics: NexusGifsWeb.static_paths()
    end
  end

  def static_paths, do: ~w(assets fonts images favicon.ico robots.txt)

  defmacro __using__(which) when is_atom(which) do
    apply(__MODULE__, which, [])
  end
end
