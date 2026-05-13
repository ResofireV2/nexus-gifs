# nexus-gifs

A Nexus extension that adds a GIF and Sticker picker to the post composer, powered by [KLIPY](https://klipy.com).

Runs inside the Nexus VM — no separate service, no Docker, no subdomain required.

## Features

- GIF and Sticker tabs with trending content on open
- Search powered by KLIPY with content filtering (G / PG / PG-13 / R)
- Infinite scroll
- Inserts as standard Markdown `![title](url)` — renders inline in posts
- Settings stored in Nexus's own extension settings table

## Install

In the Nexus admin panel go to **Extensions → Install from URL** and paste:

```
https://github.com/ResofireV2/nexus-gifs
```

## Configure

After installing, go to **Admin → GIFs → Credentials** and enter your KLIPY API key.

Get a free key at [klipy.com](https://klipy.com).

## KLIPY Attribution

Per KLIPY API guidelines (automatically satisfied):

- Search input placeholder: **"Search KLIPY"** ✓
- Share trigger fired on item selection ✓
- "Powered by KLIPY" shown in the picker footer ✓
