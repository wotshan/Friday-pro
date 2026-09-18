<div align="center">
  <img src="https://raw.githubusercontent.com/wotshan/Friday-pro/main/assets/friday-pro-banner.svg" alt="Friday Pro animated banner" width="900" />
</div>

<div align="center">

# Friday Pro

### A premium Lavalink-powered Discord music experience

<p>
  <a href="#features">Features</a> •
  <a href="#premium-system">Premium</a> •
  <a href="#commands">Commands</a> •
  <a href="#setup">Setup</a>
</p>

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Lavalink](https://img.shields.io/badge/Audio-Lavalink-8B0000?style=for-the-badge)
![Express](https://img.shields.io/badge/Keep--Alive-Express-000000?style=for-the-badge&logo=express&logoColor=white)

</div>

## About

Friday Pro is a Discord music bot built for reliable voice playback, premium controls, interactive player UI, server utilities, and lightweight local persistence. It uses Lavalink for audio and Express for hosting platforms that require an HTTP process binding.

## Features

- YouTube search and URL playback through Lavalink.
- Queue management with skip, pause, resume, stop, shuffle, repeat, and volume controls.
- Interactive now-playing embeds with generated visual cards and track thumbnails.
- Autocomplete suggestions for `/play` and `/p`.
- Autoplay mix search after a queue finishes.
- Lyrics lookup with Lavalink/plugin lyrics and an external fallback.
- Favorites: save, list, queue, and clear liked tracks.
- 24/7 voice mode with restart recovery.
- English and Hindi server language settings.
- Server statistics, latency checks, avatars, banners, and server information.
- Owner/admin role management tools.
- Safe JSON persistence with graceful handling for missing or invalid files.
- Express health route at `/` for hosting keep-alive checks.

## Premium System

Premium access is available to users listed in `premium-users.json` or in the `DEVELOPER_IDS` environment variable.

Premium features include:

- Play and control music.
- Pause, resume, skip, and stop.
- Autoplay.
- Play liked songs.
- Interactive player buttons.
- Bassboost/effects control.

Developers can manage premium users with:

```text
/premium status
/premium add <user>
/premium remove <user>
```

## Commands

### Music

```text
/play <query>       /p <query>
/skip               /s
/pause              /resume
/stop               /queue
/q                  /nowplaying
/np                 /lyrics
/autoplay
```

Prefix shortcuts use the prefix configured in `config.json`. For example, with `?`:

```text
?play song name
?p song name
?queue
?np
?skip
```

### Favorites

```text
/like
/likeall
/showliked
/playliked
/unlike
```

### Server and administration

```text
/247
/language <en|hi>
/role add|remove|create|delete|edit|icon
/roles
/stats
/ping
/avatar
/banner
/serverinfo
/help
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 18+ |
| Discord API | discord.js v14 |
| Audio engine | Lavalink + lavalink-client |
| Search | YouTube search through Lavalink |
| Player visuals | `@napi-rs/canvas` |
| Hosting health server | Express |
| Voice support | `@discordjs/voice`, Opus, sodium |
| Persistence | Local JSON files |

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure `config.json` with your Discord token and Lavalink node.

3. Start the bot:

   ```bash
   node index.js
   ```

Environment variables can override the configuration:

```text
DISCORD_TOKEN=your-token
PORT=3000
DEVELOPER_IDS=discord-id-1,discord-id-2
```

You can also put developer user IDs directly in `config.json`:

```json
{
  "developerIds": ["your-discord-user-id"]
}
```

The bot's health endpoint is:

```text
GET /
```

Response:

```text
Friday Pro Bot is Online!
```

## Data Files

```text
config.json
guild-247.json
guild-languages.json
guild-prefixes.json
user-favorites.json
premium-users.json
```

Missing optional data files are handled safely and recreated when the bot needs to save data.

## Security

- Never commit a real Discord token.
- Prefer `DISCORD_TOKEN` or your hosting provider's secret/environment settings.
- Keep Lavalink credentials private.
- Rotate the Discord token immediately if it has ever been exposed publicly.

<div align="center">

Built for communities that want more than a basic music command.

</div>