# nexus-gifs

A Nexus extension that adds a GIF and Sticker picker to the post composer, powered by [KLIPY](https://klipy.com).

## Features

- GIF and Sticker tabs with trending content on open
- Search powered by KLIPY with content filtering (G / PG / PG-13 / R)
- Infinite scroll — loads more as you scroll
- Inserts as standard Markdown `![title](url)` — renders inline in posts
- API key stored server-side — never exposed to the browser
- WebP format toggle for better performance

## Architecture

The extension is two pieces:

- **Backend** (`backend/`) — a minimal Elixir/Phoenix service that proxies KLIPY API calls with the API key attached. Runs on port 4002.
- **Frontend** (`frontend/nexus-gifs.js`) — a self-contained IIFE loaded by Nexus. Registers a toolbar button and admin panel.

## Setup

### 1. Get a KLIPY API key

Sign up free at [klipy.com](https://klipy.com) to get your API key.

### 2. Deploy the backend

```bash
cp .env.example .env
# Edit .env with your values

# Generate a secret key base
docker run --rm elixir:1.16-alpine mix phx.gen.secret

# Start
docker compose up -d

# Run migrations
docker compose exec nexus_gifs bin/nexus_gifs eval "NexusGifs.Release.migrate()"
```

### 3. Install in Nexus

In the Nexus admin panel go to **Extensions → Install from URL** and paste:

```
https://github.com/billyrayfoss/nexus-gifs
```

Or point directly at the manifest:

```
https://gifs.billyrayfoss.com/assets/manifest.json
```

### 4. Configure

In the Nexus admin panel under **Extensions → GIFs**, enter your KLIPY API key and set your content filter preference.

### 5. Wire up the Caddyfile

Add to your server's Caddyfile:

```
import /opt/nexus-gifs/Caddyfile
```

## KLIPY Attribution Requirements

Per KLIPY API guidelines (automatically satisfied by this extension):

- Search input placeholder: **"Search KLIPY"** ✓
- Share trigger fired on item selection ✓
- "Powered by KLIPY" shown in the picker footer ✓

## Development

```bash
cd backend
mix deps.get
mix ecto.create && mix ecto.migrate
mix phx.server
```

The frontend bundle at `frontend/nexus-gifs.js` is plain JavaScript — no build step required. Edit it and reload Nexus.
