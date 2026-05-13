FROM elixir:1.16-alpine AS build

WORKDIR /app

RUN apk add --no-cache build-base git

COPY mix.exs mix.lock ./
RUN mix local.hex --force && mix local.rebar --force
RUN mix deps.get --only prod
RUN MIX_ENV=prod mix deps.compile

COPY config config
COPY lib lib
COPY priv priv

RUN MIX_ENV=prod mix compile
RUN MIX_ENV=prod mix release

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM alpine:3.19 AS runtime

RUN apk add --no-cache libstdc++ openssl ncurses-libs

WORKDIR /app

COPY --from=build /app/_build/prod/rel/nexus_gifs ./

# Copy static assets (JS bundle, logo, banner)
COPY priv/static /app/lib/nexus_gifs-1.0.0/priv/static

ENV HOME=/app
ENV MIX_ENV=prod
ENV PORT=4002

EXPOSE 4002

CMD ["bin/nexus_gifs", "start"]
