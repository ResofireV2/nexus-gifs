defmodule NexusGifs.Settings do
  @moduledoc """
  Holds extension settings in memory (ETS-backed GenServer).
  Persists to a single `settings` table row via Repo on writes.
  Loaded from DB on startup so config survives restarts.

  Settings keys:
    - "api_key"        — KLIPY API key (string)
    - "content_filter" — "G" | "PG" | "PG-13" | "R"  (default "R")
    - "use_webp"       — boolean (default false)
  """

  use GenServer
  require Logger

  alias NexusGifs.Repo
  alias NexusGifs.Setting

  # Client API

  def start_link(_opts), do: GenServer.start_link(__MODULE__, %{}, name: __MODULE__)

  def get(key), do: GenServer.call(__MODULE__, {:get, key})

  def put(key, value), do: GenServer.call(__MODULE__, {:put, key, value})

  def all, do: GenServer.call(__MODULE__, :all)

  def update(map) when is_map(map), do: GenServer.call(__MODULE__, {:update, map})

  # GenServer

  @impl true
  def init(_) do
    state = load_from_db()
    {:ok, state}
  end

  @impl true
  def handle_call({:get, key}, _from, state) do
    {:reply, Map.get(state, key), state}
  end

  def handle_call(:all, _from, state) do
    {:reply, state, state}
  end

  def handle_call({:put, key, value}, _from, state) do
    new_state = Map.put(state, key, value)
    persist(new_state)
    {:reply, :ok, new_state}
  end

  def handle_call({:update, map}, _from, state) do
    new_state = Map.merge(state, map)
    persist(new_state)
    {:reply, :ok, new_state}
  end

  # Private

  defp load_from_db do
    defaults = %{
      "api_key"        => nil,
      "content_filter" => "R",
      "use_webp"       => false
    }

    try do
      case Repo.one(Setting) do
        nil      -> defaults
        %Setting{data: data} -> Map.merge(defaults, data || %{})
      end
    rescue
      e ->
        Logger.warning("Settings: could not load from DB: #{inspect(e)}")
        defaults
    end
  end

  defp persist(state) do
    try do
      case Repo.one(Setting) do
        nil ->
          %Setting{} |> Setting.changeset(%{data: state}) |> Repo.insert!()
        existing ->
          existing |> Setting.changeset(%{data: state}) |> Repo.update!()
      end
    rescue
      e -> Logger.warning("Settings: could not persist: #{inspect(e)}")
    end
  end
end
