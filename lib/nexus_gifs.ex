defmodule NexusGifs do
  @moduledoc """
  nexus-gifs — GIF and Sticker picker for Nexus.

  Adds a GIF/sticker toolbar button to the post composer.
  Powered by KLIPY. Runs inside the Nexus VM with no separate service required.
  """

  use Nexus.Extensions.Behaviour

  # ---------------------------------------------------------------------------
  # Manifest
  # ---------------------------------------------------------------------------

  @impl true
  def manifest do
    %{
      slug:        "nexus-gifs",
      name:        "GIFs",
      version:     "1.0.0",
      description: "Insert GIFs and stickers from KLIPY into your posts.",
      author:      "ResofireV2",
      homepage:    "https://github.com/ResofireV2/nexus-gifs",
      logo_url:    "/ext/nexus-gifs/assets/logo.webp",
      banner_url:  "/ext/nexus-gifs/assets/banner.webp",
      categories:  ["media", "composer"],
    }
  end

  # ---------------------------------------------------------------------------
  # JS bundle — served at /ext/nexus-gifs/assets/nexus-gifs.js
  # ---------------------------------------------------------------------------

  @impl true
  def js_bundle_path, do: "nexus-gifs.js"

  # ---------------------------------------------------------------------------
  # Settings schema — stored in Nexus extension settings table
  # ---------------------------------------------------------------------------

  @impl true
  def settings_schema do
    %{
      "api_key" => %{
        "type"        => "string",
        "label"       => "KLIPY API Key",
        "placeholder" => "Your KLIPY API key",
        "secret"      => true,
        "required"    => true,
      },
      "content_filter" => %{
        "type"    => "select",
        "label"   => "Content Filter",
        "default" => "R",
        "options" => [
          %{"value" => "G",     "label" => "G — Family Safe"},
          %{"value" => "PG",    "label" => "PG"},
          %{"value" => "PG-13", "label" => "PG-13"},
          %{"value" => "R",     "label" => "R — Unrestricted"},
        ],
      },
      "use_webp" => %{
        "type"    => "boolean",
        "label"   => "Use WebP format",
        "default" => false,
      },
    }
  end

  @impl true
  def settings_tabs do
    [
      %{
        "key"    => "credentials",
        "label"  => "Credentials",
        "icon"   => "fa-key",
        "fields" => ["api_key"],
      },
      %{
        "key"    => "content",
        "label"  => "Content",
        "icon"   => "fa-sliders",
        "fields" => ["content_filter", "use_webp"],
      },
    ]
  end
end
