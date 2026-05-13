defmodule NexusGifs.Repo.Migrations.CreateSettings do
  use Ecto.Migration

  def change do
    create table(:settings) do
      add :data, :map, default: %{}
      timestamps(type: :utc_datetime)
    end
  end
end
