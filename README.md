<img src="https://raw.githubusercontent.com/ResofireV2/nexus-gifs/main/priv/static/banner.webp" alt="GIFs" width="100%">

# nexus-gifs

A Nexus extension that adds a GIF and sticker picker to the post composer, powered by [KLIPY](https://klipy.com).

Runs inside the Nexus VM — no separate service, no Docker, no subdomain required.

## Features

- GIF and sticker tabs with trending content on open
- Search powered by KLIPY with content filtering (G / PG / PG-13 / R)
- Infinite scroll with lazy-loaded images
- Inserts as standard Markdown `![title](url)` — renders inline in posts
- WebP format option for smaller file sizes

## Requirements

- Nexus `manifest_version` 2
- A free [KLIPY](https://klipy.com) API key

## Install

In the Nexus admin panel go to **Extensions → Store** and click **Install** on the GIFs card, or install from URL:

```
https://raw.githubusercontent.com/ResofireV2/nexus-gifs/main/manifest.json
```

## Configure

After installing, go to **Admin → GIFs** and enter your KLIPY API key. Optionally set a content filter rating and enable WebP format.

Get a free API key at [klipy.com](https://klipy.com).

## KLIPY Attribution

Per KLIPY API guidelines (automatically satisfied by this extension):

- Search input placeholder: **"Search KLIPY"** ✓
- Share trigger fired on item selection ✓
- "Powered by KLIPY" shown in the picker footer ✓
