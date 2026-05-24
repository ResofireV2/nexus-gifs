defmodule NexusGifs do
  @moduledoc """
  nexus-gifs — GIF and Sticker picker for Nexus.

  Adds a GIF/sticker toolbar button to the post and reply composers.
  Powered by KLIPY. Runs inside the Nexus VM with no separate service required.

  Settings (stored in Nexus's extensions.settings column):
    - "api_key"        — KLIPY API key (string, required)
    - "content_filter" — "G" | "PG" | "PG-13" | "R"  (default "R")
    - "use_webp"       — boolean (default false)
  """

  use Nexus.Extensions.Behaviour

  @impl true
  def routes do
    [
      {"/api", NexusGifs.ApiRouter, []},
    ]
  end

  # ---------------------------------------------------------------------------
  # Settings helper — reads from the shared Nexus extensions table.
  # Used by NexusGifs.ApiRouter to fetch current settings per request.
  # ---------------------------------------------------------------------------

  def settings do
    case Nexus.Extensions.get_extension_by_slug("nexus-gifs") do
      nil -> %{}
      ext -> ext.settings || %{}
    end
  end
end
