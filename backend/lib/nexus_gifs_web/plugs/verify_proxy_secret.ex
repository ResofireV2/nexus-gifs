defmodule NexusGifsWeb.Plugs.VerifyProxySecret do
  @moduledoc """
  Verifies the X-Nexus-Proxy-Secret header on all proxied requests.
  The secret is set once in config and must match what Nexus sends.
  """

  import Plug.Conn
  import Phoenix.Controller

  def init(opts), do: opts

  def call(conn, _opts) do
    expected = Application.get_env(:nexus_gifs, :proxy_secret)
    received = get_req_header(conn, "x-nexus-proxy-secret") |> List.first()

    cond do
      is_nil(expected) or expected == "" ->
        # No secret configured — allow through (dev/initial setup)
        conn

      received == expected ->
        conn

      true ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "Unauthorized"})
        |> halt()
    end
  end
end
