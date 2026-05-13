defmodule NexusGifsWeb.ErrorJSON do
  def render("404.json", _), do: %{error: "Not found"}
  def render("500.json", _), do: %{error: "Internal server error"}
  def render(template, _),   do: %{error: Phoenix.Controller.status_message_from_template(template)}
end
