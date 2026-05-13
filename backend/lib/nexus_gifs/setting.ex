defmodule NexusGifs.Setting do
  use Ecto.Schema
  import Ecto.Changeset

  schema "settings" do
    field :data, :map, default: %{}
    timestamps(type: :utc_datetime)
  end

  def changeset(setting, attrs) do
    setting
    |> cast(attrs, [:data])
    |> validate_required([:data])
  end
end
