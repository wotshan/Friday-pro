import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import express from "express";
import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  ActivityType,
  AttachmentBuilder,
} from "discord.js";
import { LavalinkManager } from "lavalink-client";

// Global crash protection
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, "config.json");
const guildPrefixesPath = path.join(__dirname, "guild-prefixes.json");
const guildLanguagesPath = path.join(__dirname, "guild-languages.json");
const guild247Path = path.join(__dirname, "guild-247.json");
const userFavoritesPath = path.join(__dirname, "user-favorites.json");
const premiumUsersPath = path.join(__dirname, "premium-users.json");

// Keep the process bound to a web port for hosting providers that require it.
const app = express();
const port = Number.parseInt(process.env.PORT || "3000", 10) || 3000;

app.get("/", (_request, response) => {
  response.send("Friday Pro Bot is Online!");
});

app.listen(port, () => {
  console.log(`Keep-alive web server listening on port ${port}`);
}).on("error", (error) => {
  console.error("Keep-alive web server error:", error);
});

function readJsonFile(filePath, fallbackValue) {
  try {
    if (!fs.existsSync(filePath)) return fallbackValue;
    const contents = fs.readFileSync(filePath, "utf8").trim();
    return contents ? JSON.parse(contents) : fallbackValue;
  } catch (error) {
    console.warn(`Unable to read ${path.basename(filePath)}; using defaults.`, error.message);
    return fallbackValue;
  }
}

function writeJsonFile(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryPath, filePath);
    return true;
  } catch (error) {
    console.error(`Unable to save ${path.basename(filePath)}:`, error.message);
    try {
      fs.unlinkSync(temporaryPath);
    } catch {
      // The temporary file may not have been created.
    }
    return false;
  }
}

// Developer IDs can be comma-separated in DEVELOPER_IDS, for example:
// DEVELOPER_IDS=123456789012345678,987654321098765432
const configuredDeveloperIds = (process.env.DEVELOPER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const DEVELOPER_IDS = [...new Set(configuredDeveloperIds)];

// Custom Emoji IDs
const EMOJIS = {
  music: "<:music:1549745731567358043>",
  tick: "<:tick:1193913034125611089>",
  crown: "<:crown:1550048308574035988>",
  disk: "<a:disk:1549755103559422084>",
  admin: "<:admin:1549745011162087484>",
  bot: "<a:bot:1549745158986408007>",
};

const config = readJsonFile(configPath, {});

const configToken =
  typeof config.token === "string" &&
  config.token !== "YOUR_DISCORD_BOT_TOKEN_HERE"
    ? config.token
    : "";
const token = process.env.DISCORD_TOKEN || configToken;
const prefix =
  typeof config.prefix === "string" && config.prefix.length > 0
    ? config.prefix
    : "?";

if (!token) {
  throw new Error(
    "Missing Discord bot token. Set DISCORD_TOKEN or add it to config.json."
  );
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.User],
});

// --- PREMIUM USERS SYSTEM ---
function loadPremiumUsers() {
  const data = readJsonFile(premiumUsersPath, []);
  return new Set(Array.isArray(data) ? data : []);
}

const premiumUsers = loadPremiumUsers();

function savePremiumUsers() {
  writeJsonFile(premiumUsersPath, Array.from(premiumUsers));
}

function isPremium(userId) {
  return DEVELOPER_IDS.includes(userId) || premiumUsers.has(userId);
}

const i18n = {
  en: {
    nowPlaying: "Now playing",
    artist: "Artist",
    duration: "Duration",
    requestedBy: "Requested by",
    queueTitle: "Queue",
    queueEmpty: "The queue is empty.",
    noUpcoming: "No upcoming tracks.",
    skipped: "Skipped current track",
    paused: "Paused music",
    resumed: "Resumed music",
    stopped: "Stopped playback and removed player UI",
    langUpdated: "Bot language updated to **English** for this server.",
    joinVc: "Join a voice channel first.",
    alreadyPlaying: "I am already playing in another voice channel.",
    noTracks: "No matching tracks were found.",
    queued: "Track Added",
    noAdminPermission: "Only server admins with Manage Server permission can change settings.",
    lyricsNotFound: "No lyrics could be found for this track.",
    lyricsTitle: "Live Lyrics",
    mode247Enabled: "24/7 Mode has been **Enabled** for this server. I will stay in the voice channel.",
    mode247Disabled: "24/7 Mode has been **Disabled** for this server.",
    ownerOnly: "Only the server owner can execute this command.",
    autoplayEnabled: "Autoplay mode has been **Enabled**.",
    autoplayDisabled: "Autoplay mode has been **Disabled**.",
    premiumOnly: "❌ This command/feature is strictly reserved for **Friday Pro Premium** users!",
    queueFinished: "Queue finished.",
  },
  hi: {
    nowPlaying: "Abhi baj raha hai",
    artist: "Kalakar",
    duration: "Samay",
    requestedBy: "Farmaish",
    queueTitle: "Gano ki List (Queue)",
    queueEmpty: "Queue bilkul khali hai.",
    noUpcoming: "Aage koi gana nahi hai.",
    skipped: "Gana skip kar diya gaya",
    paused: "Gana ruk (pause) gaya hai",
    resumed: "Gana fir se shuru ho gaya hai",
    stopped: "Music stop kar diya gaya",
    langUpdated: "Is server ke liye bhasha **Hindi** set kar di gayi hai.",
    joinVc: "Pehle kisi voice channel me judein.",
    alreadyPlaying: "Main pehle se dusre voice channel me baj raha hoon.",
    noTracks: "Koi gana nahi mila.",
    queued: "Track Added",
    noAdminPermission: "Sirf Manage Server permission waale admins hi settings badal sakte hain.",
    lyricsNotFound: "Is gaane ke lyrics nahi mile.",
    lyricsTitle: "Live Lyrics",
    mode247Enabled: "24/7 Mode is server ke liye **Enable** kar diya gaya hai. Main voice channel se nahi jaunga.",
    mode247Disabled: "24/7 Mode is server ke liye **Disable** kar diya gaya hai.",
    ownerOnly: "Yeh command sirf server ka owner hi use kar sakta hai.",
    autoplayEnabled: "Autoplay mode **Enable** kar diya gaya hai.",
    autoplayDisabled: "Autoplay mode **Disable** kar diya gaya hai.",
    premiumOnly: "❌ Yeh feature sirf **Friday Pro Premium** members ke liye hai!",
    queueFinished: "Gano ki list khatam ho gayi hai.",
  },
};

// --- FAVORITE SONGS SYSTEM ---
function loadUserFavorites() {
  const stored = readJsonFile(userFavoritesPath, {});
  return stored && typeof stored === "object" && !Array.isArray(stored)
    ? new Map(Object.entries(stored))
    : new Map();
}

const userFavorites = loadUserFavorites();

function saveUserFavorites() {
  writeJsonFile(userFavoritesPath, Object.fromEntries(userFavorites));
}

function getUserFavs(userId) {
  return userFavorites.get(userId) || [];
}

function addTrackToFavs(userId, track) {
  const list = getUserFavs(userId);
  const exists = list.some((t) => t.uri === track.info.uri);
  if (!exists) {
    list.push({ title: track.info.title, uri: track.info.uri, author: track.info.author });
    userFavorites.set(userId, list);
    saveUserFavorites();
    return true;
  }
  return false;
}

function loadGuildLanguages() {
  const stored = readJsonFile(guildLanguagesPath, {});
  return stored && typeof stored === "object" && !Array.isArray(stored)
    ? new Map(Object.entries(stored))
    : new Map();
}

const guildLanguages = loadGuildLanguages();

function saveGuildLanguages() {
  writeJsonFile(guildLanguagesPath, Object.fromEntries(guildLanguages));
}

function getLang(guildId) {
  const langCode = guildLanguages.get(guildId) || "en";
  return i18n[langCode] || i18n.en;
}

function loadGuild247() {
  const stored = readJsonFile(guild247Path, {});
  return stored && typeof stored === "object" && !Array.isArray(stored)
    ? new Map(Object.entries(stored))
    : new Map();
}

const guild247Modes = loadGuild247();

function saveGuild247() {
  writeJsonFile(guild247Path, Object.fromEntries(guild247Modes));
}

function is247Enabled(guildId) {
  return Boolean(guild247Modes.get(guildId));
}

let currentTrackTitle = null;
let statusIndex = 0;

function startStatusRotation() {
  setInterval(() => {
    if (!client.user) return;
    const serverCount = client.guilds.cache.size;
    const totalMembers = client.guilds.cache.reduce(
      (acc, guild) => acc + (guild.memberCount || 0),
      0
    );

    const statusOptions = currentTrackTitle
      ? [`${currentTrackTitle}`, `Friday Pro Music Bot`, `Serving ${serverCount} Servers`]
      : [`Friday Pro | ?help or /help`, `${serverCount} Servers | ${totalMembers} Users`, `Premium Music Bot`];

    const nextStatus = statusOptions[statusIndex % statusOptions.length];
    statusIndex++;

    client.user.setPresence({
      activities: [{ name: "custom", type: ActivityType.Custom, state: nextStatus }],
      status: "dnd",
    });
  }, 15000);
}

const rawNodes = Array.isArray(config.lavalink?.nodes)
  ? config.lavalink.nodes
  : config.lavalink
  ? [config.lavalink]
  : [];

const lavalinkNodes = rawNodes.map((node) => ({
  id: node.id || "Default-Node",
  host: node.host,
  port: Number(node.port),
  authorization: node.password,
  secure: Boolean(node.secure),
  retryAmount: 10,
  retryDelay: 15000,
}));

const lavalink = new LavalinkManager({
  nodes: lavalinkNodes,
  sendToShard: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    guild?.shard?.send(payload);
  },
  autoSkip: true,
  client: {
    id: process.env.DISCORD_CLIENT_ID || "pending",
    username: "Friday Pro",
  },
  playerOptions: {
    defaultSearchPlatform: "ytsearch",
    onDisconnect: { autoReconnect: true, destroyPlayer: false },
    onEmptyQueue: { destroyAfterMs: 300_000 },
  },
});

lavalink.nodeManager.on("error", (node, error) => {
  console.error(`[Lavalink Node Error] ${node.id}:`, error?.message || error);
});

lavalink.nodeManager.on("connect", (node) => {
  console.log(`[Lavalink] Connected to node: ${node.id}`);
});

lavalink.nodeManager.on("disconnect", (node, reason) => {
  console.warn(`[Lavalink] Disconnected from node: ${node.id}`, reason);
});

// SLASH COMMAND DEFINITIONS
const slashCommandsData = [
  new SlashCommandBuilder().setName("help").setDescription("Show interactive command help menu"),
  new SlashCommandBuilder().setName("h").setDescription("Shortcut for /help"),
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a track or search YouTube")
    .addStringOption((opt) => 
      opt.setName("query")
         .setDescription("Song name or URL")
         .setRequired(true)
         .setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName("p")
    .setDescription("Shortcut for /play")
    .addStringOption((opt) => 
      opt.setName("query")
         .setDescription("Song name or URL")
         .setRequired(true)
         .setAutocomplete(true)
    ),
  new SlashCommandBuilder().setName("skip").setDescription("Skip track"),
  new SlashCommandBuilder().setName("s").setDescription("Shortcut for /skip"),
  new SlashCommandBuilder().setName("pause").setDescription("Pause playback"),
  new SlashCommandBuilder().setName("resume").setDescription("Resume playback"),
  new SlashCommandBuilder().setName("stop").setDescription("Stop playback"),
  new SlashCommandBuilder().setName("queue").setDescription("View track queue"),
  new SlashCommandBuilder().setName("q").setDescription("Shortcut for /queue"),
  new SlashCommandBuilder().setName("nowplaying").setDescription("Show currently playing song"),
  new SlashCommandBuilder().setName("np").setDescription("Shortcut for /nowplaying"),
  new SlashCommandBuilder().setName("ping").setDescription("Check bot and lavalink latency"),
  new SlashCommandBuilder().setName("stats").setDescription("Show live bot system metrics and servers"),
  new SlashCommandBuilder().setName("lyrics").setDescription("Show live lyrics for the current song"),
  new SlashCommandBuilder().setName("247").setDescription("Toggle 24/7 mode to keep bot in voice channel"),
  new SlashCommandBuilder().setName("autoplay").setDescription("Toggle autoplay mode for related songs"),
  
  new SlashCommandBuilder()
    .setName("premium")
    .setDescription("Friday Pro Premium status & management")
    .addSubcommand((sub) => sub.setName("status").setDescription("Check premium status & active users list"))
    .addSubcommand((sub) => 
      sub.setName("add")
         .setDescription("[Dev Only] Add user to premium")
         .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
    )
    .addSubcommand((sub) => 
      sub.setName("remove")
         .setDescription("[Dev Only] Remove user from premium")
         .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
    ),

  new SlashCommandBuilder().setName("like").setDescription("Add current song to your favorites"),
  new SlashCommandBuilder().setName("likeall").setDescription("Add all songs from current queue to your favorites"),
  new SlashCommandBuilder().setName("playliked").setDescription("Play your favorite songs"),
  new SlashCommandBuilder().setName("showliked").setDescription("Show your favorite songs"),
  new SlashCommandBuilder().setName("unlike").setDescription("Remove songs from your favorites"),

  new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage server roles")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Give a role to a user")
        .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
        .addRoleOption((opt) => opt.setName("role").setDescription("Target role").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Take a role away from a user")
        .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(true))
        .addRoleOption((opt) => opt.setName("role").setDescription("Target role").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a new role [Owner Only]")
        .addStringOption((opt) => opt.setName("name").setDescription("Role name").setRequired(true))
        .addStringOption((opt) => opt.setName("color").setDescription("Hex color e.g. #FF0000").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Delete an existing role [Owner Only]")
        .addRoleOption((opt) => opt.setName("role").setDescription("Role to delete").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Edit a role's name or color [Owner Only]")
        .addRoleOption((opt) => opt.setName("role").setDescription("Role to edit").setRequired(true))
        .addStringOption((opt) => opt.setName("name").setDescription("New role name").setRequired(false))
        .addStringOption((opt) => opt.setName("color").setDescription("New hex color e.g. #00FF00").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("icon")
        .setDescription("Set a role icon (emoji/image URL) [Owner Only]")
        .addRoleOption((opt) => opt.setName("role").setDescription("Target role").setRequired(true))
        .addStringOption((opt) => opt.setName("icon").setDescription("Emoji or image URL").setRequired(true))
    ),
  new SlashCommandBuilder().setName("roles").setDescription("Show list of server roles"),

  new SlashCommandBuilder()
    .setName("language")
    .setDescription("Change bot language")
    .addStringOption((opt) =>
      opt
        .setName("lang")
        .setDescription("Language selection")
        .setRequired(true)
        .addChoices({ name: "English", value: "en" }, { name: "Hindi", value: "hi" })
    ),
  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show user avatar")
    .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(false)),
  new SlashCommandBuilder()
    .setName("banner")
    .setDescription("Show user banner")
    .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(false)),
  new SlashCommandBuilder().setName("serverinfo").setDescription("Show server information"),
];

function loadGuildPrefixes() {
  const stored = readJsonFile(guildPrefixesPath, {});
  return stored && typeof stored === "object" && !Array.isArray(stored)
    ? new Map(Object.entries(stored))
    : new Map();
}

const guildPrefixes = loadGuildPrefixes();

function getGuildPrefix(message) {
  return guildPrefixes.get(message.guildId) || prefix;
}

function commandPrefix(message) {
  if (message.author.bot) return null;
  const guildPrefix = getGuildPrefix(message);
  if (message.content.startsWith(guildPrefix)) return guildPrefix;
  const mention = `<@${client.user?.id}>`;
  if (message.content.startsWith(mention)) return mention;
  return null;
}

function parseCommand(message) {
  if (message.author.bot) return null;

  const usedPrefix = commandPrefix(message);
  if (usedPrefix) {
    const body = message.content.slice(usedPrefix.length).trim();
    if (!body) return { name: "help", args: [] };
    const [name, ...args] = body.split(/\s+/);
    return { name: name.toLowerCase(), args };
  }

  const content = message.content.trim();
  const lower = content.toLowerCase();
  if (lower.startsWith("play ") || lower.startsWith("p ")) {
    const [name, ...args] = content.split(/\s+/);
    return { name: name.toLowerCase(), args };
  }

  return null;
}

function compactDuration(ms) {
  const num = Number(ms);
  if (!num || isNaN(num) || num <= 0) return "Live / Unknown";
  const sec = Math.floor(num / 1000);
  const min = Math.floor(sec / 60);
  return `${min}:${String(sec % 60).padStart(2, "0")}`;
}

function trackThumbnail(track) {
  try {
    const url = new URL(track?.info?.uri || "");
    let videoId = url.searchParams.get("v");
    if (url.hostname === "youtu.be") videoId = url.pathname.slice(1);
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}

async function generateNowPlayingCard(track) {
  try {
    const canvas = createCanvas(800, 250);
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 800, 250);
    gradient.addColorStop(0, "#1a0000");
    gradient.addColorStop(0.5, "#2d0a0a");
    gradient.addColorStop(1, "#0d0d0d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 250);

    ctx.strokeStyle = "#8B0000";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 796, 246);

    const thumbUrl = trackThumbnail(track);
    let imageLoaded = false;
    if (thumbUrl) {
      try {
        const img = await loadImage(thumbUrl);
        ctx.drawImage(img, 25, 25, 200, 200);
        imageLoaded = true;
      } catch {}
    }

    if (!imageLoaded) {
      ctx.fillStyle = "#330000";
      ctx.fillRect(25, 25, 200, 200);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("MUSIC", 85, 130);
    }

    const textStartX = 250;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    const rawTitle = track?.info?.title || "Unknown Track";
    const truncatedTitle = rawTitle.length > 28 ? rawTitle.slice(0, 26) + "..." : rawTitle;
    ctx.fillText(truncatedTitle, textStartX, 75);

    ctx.fillStyle = "#b3b3b3";
    ctx.font = "20px sans-serif";
    const rawAuthor = track?.info?.author || "Unknown Artist";
    const truncatedAuthor = rawAuthor.length > 35 ? rawAuthor.slice(0, 33) + "..." : rawAuthor;
    ctx.fillText(truncatedAuthor, textStartX, 115);

    ctx.fillStyle = "#444444";
    ctx.beginPath();
    ctx.roundRect(textStartX, 160, 500, 10, 5);
    ctx.fill();

    ctx.fillStyle = "#8B0000";
    ctx.beginPath();
    ctx.roundRect(textStartX, 160, 200, 10, 5);
    ctx.fill();

    ctx.fillStyle = "#dddddd";
    ctx.font = "16px sans-serif";
    ctx.fillText(compactDuration(track?.info?.length), textStartX, 195);

    const buffer = await canvas.encode("png");
    return new AttachmentBuilder(buffer, { name: "nowplaying.png" });
  } catch (err) {
    console.error("Canvas Generation Error:", err);
    return null;
  }
}

async function fetchLyrics(track) {
  try {
    if (track?.pluginInfo?.lyrics) {
      return track.pluginInfo.lyrics;
    }
    const query = encodeURIComponent(`${track.info.author} -${track.info.title}`);
    const res = await fetch(`https://some-random-api.com/v2/lyrics?title=${query}`).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data && data.lyrics) {
        return data.lyrics.length > 350 ? data.lyrics.slice(0, 350) + "..." : data.lyrics;
      }
    }
  } catch {}
  return null;
}

async function createTrackEmbeds(track, guildId, memberUser) {
  const lang = getLang(guildId);
  const info = track.info;
  
  const mainEmbed = new EmbedBuilder()
    .setColor(0x1a0000)
    .setTitle(`${EMOJIS.music}${lang.nowPlaying} - Friday Pro`)
    .setDescription(`[${info.title}](${info.uri})`)
    .addFields(
      { name: lang.artist, value: info.author || "Unknown", inline: true },
      { name: lang.duration, value: compactDuration(info.length), inline: true }
    )
    .setTimestamp();

  if (memberUser) {
    mainEmbed.setFooter({
      text: `${lang.requestedBy}:${memberUser.tag || memberUser.username}`,
      iconURL: memberUser.displayAvatarURL?.() || undefined,
    });
  }

  const cardAttachment = await generateNowPlayingCard(track);
  if (cardAttachment) {
    mainEmbed.setImage("attachment://nowplaying.png");
  } else {
    const thumb = trackThumbnail(track);
    if (thumb) mainEmbed.setThumbnail(thumb);
  }

  return { mainEmbed, cardAttachment };
}

function createTrackAddedEmbed(track, guildId, player, memberUser) {
  const info = track.info;
  const positionIndex = player ? player.queue.tracks.length : 0;

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle(`${EMOJIS.tick} Track Added - Friday Pro`)
    .setDescription(`[${info.title}](${info.uri})`)
    .addFields(
      { name: "Artist", value: info.author || "Unknown", inline: true },
      { name: "Position", value: `#${positionIndex}`, inline: true },
      { name: "Duration", value: compactDuration(info.length), inline: true }
    )
    .setTimestamp();

  const thumb = trackThumbnail(track);
  if (thumb) embed.setThumbnail(thumb);

  if (memberUser) {
    embed.setFooter({
      text: `Requested by: ${memberUser.tag || memberUser.username}`,
      iconURL: memberUser.displayAvatarURL?.() || undefined,
    });
  }

  return embed;
}

function createTrackAddedRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("skip").setLabel("Next").setEmoji("⏭️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("stop").setLabel("Stop").setEmoji("⏹️").setStyle(ButtonStyle.Danger)
  );
}

function getHelpMenuData(category = "overview") {
  const selectMenu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help_menu_select")
      .setPlaceholder("Select Command Category...")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Overview")
          .setValue("overview")
          .setDescription("General bot help & overview"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Favourite")
          .setValue("favourite")
          .setDescription("Liked songs & playlists"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Music Commands")
          .setValue("music")
          .setDescription("Player control & music commands"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Settings & Admin")
          .setValue("settings")
          .setDescription("24/7 Mode, Roles, and Language settings"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Server Utility")
          .setValue("utility")
          .setDescription("Stats, Ping, Avatars, Banner & Server info")
      )
  );

  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setTimestamp();

  if (category === "favourite") {
    embed
      .setTitle(`${EMOJIS.crown} Favourite Commands`)
      .setDescription("Liked songs & playlists • 5 commands\n\n" +
        "• `like` — Add current song to your favorites\n" +
        "• `likeall` — Add all songs from the current queue to your favorites\n" +
        "• `playliked` — Play your favorite songs\n" +
        "• `showliked` — Show your favorite songs\n" +
        "• `unlike` — Remove songs from your favorites"
      )
      .setFooter({ text: "Friday Pro - Premium Edition" });
  } else if (category === "overview") {
    embed
      .setAuthor({
        name: "Friday Pro | Command Help Center",
      })
      .setTitle(`${EMOJIS.disk} Command Dashboard`)
      .setDescription(
        "Welcome to **Friday Pro**! Default Prefix is `?`.\nUse slash commands (`/`) or prefix shortcuts (`?h`, `?p`, `?s`, `?q`)."
      )
      .addFields(
        { name: `${EMOJIS.crown} **Premium & Favorites**`, value: "`?premium status`, `like`, `playliked`, `showliked`", inline: false },
        { name: `${EMOJIS.music} **Music Engine**`, value: "`play` / `p`, `skip` / `s`, `pause`, `resume`, `stop`, `queue` / `q`, `lyrics`, `autoplay`", inline: false },
        { name: `${EMOJIS.admin} **Settings & Admin**`, value: "`247`, `language`, `role`", inline: false },
        { name: `${EMOJIS.bot} **Utility & Info**`, value: "`ping`, `stats`, `avatar`, `banner`, `serverinfo`", inline: false }
      )
      .setFooter({ text: "Friday Pro • Premium Music Experience" });
  } else if (category === "music") {
    embed
      .setTitle(`${EMOJIS.music} Music Commands`)
      .setDescription("Commands to play and control audio in voice channels.")
      .addFields(
        { name: "`/play <song/url>` or `?play` / `?p`", value: "Play a song (Supports noprefix: `play <song>`)" },
        { name: "`/pause` & `/resume`", value: "Pause or resume current playing track." },
        { name: "`/skip` or `?s`", value: "Skip the currently playing track." },
        { name: "`/stop`", value: "Stop playback and leave the voice channel." },
        { name: "`/queue` or `?q`", value: "View upcoming tracks in the music queue." },
        { name: "`/nowplaying` or `?np`", value: "Show current playing song visual card." },
        { name: "`/lyrics`", value: "Search and fetch live lyrics." },
        { name: "`/autoplay`", value: "Toggle continuous autoplay based on recent tracks." }
      )
      .setFooter({ text: "Friday Pro Music Engine" });
  } else if (category === "settings") {
    embed
      .setTitle(`${EMOJIS.admin} Settings & Admin Commands`)
      .setDescription("Server administration and bot configuration options.")
      .addFields(
        { name: "`/247`", value: "Toggle 24/7 mode to keep the bot connected in voice." },
        { name: "`/language <en/hi>`", value: "Switch bot language between English and Hindi." },
        { name: "`/role add/remove`", value: "Assign or revoke roles from server members." },
        { name: "`/role create/delete`", value: "Create or delete custom roles [Owner Only]." }
      )
      .setFooter({ text: "Friday Pro System Config" });
  } else if (category === "utility") {
    embed
      .setTitle(`${EMOJIS.bot} Server Utility Commands`)
      .setDescription("Information and latency tools.")
      .addFields(
        { name: "`/ping`", value: "Check WebSocket & Lavalink Node ping latency." },
        { name: "`/stats`", value: "Display active memory usage, servers, and Lavalink status." },
        { name: "`/avatar [user]`", value: "Fetch high-resolution avatar image for a user." },
        { name: "`/banner [user]`", value: "Fetch user profile banner image." },
        { name: "`/serverinfo`", value: "Show detailed overview of current Discord server." }
      )
      .setFooter({ text: "Friday Pro Utilities" });
  }

  return { embeds: [embed], components: [selectMenu] };
}

function getStatsEmbed() {
  const totalMembers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
  const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  const uptimeSec = process.uptime();
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);

  const nodesCount = lavalink.nodes instanceof Map ? lavalink.nodes.size : (lavalink.nodes?.size || rawNodes.length || 1);

  const serverList = client.guilds.cache
    .map((guild, index) => `${index + 1}. **${guild.name}** (${guild.memberCount || 0} members) [ID:${guild.id}]`)
    .join("\n");

  const formattedServerList = serverList.length > 1000 
    ? serverList.slice(0, 990) + "\n...and more servers" 
    : (serverList || "No servers joined");

  return new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle(`${EMOJIS.bot} Friday Pro Statistics`)
    .addFields(
      { name: "Servers Count", value: `${client.guilds.cache.size}`, inline: true },
      { name: "Users", value: `${totalMembers}`, inline: true },
      { name: "Memory Usage", value: `${memoryUsage} MB`, inline: true },
      { name: "Uptime", value: `${hours}h${minutes}m`, inline: true },
      { name: "Lavalink Nodes", value: `${nodesCount}`, inline: true },
      { name: "Premium Users", value: `${premiumUsers.size}`, inline: true },
      { name: "Joined Servers List", value: formattedServerList, inline: false }
    )
    .setTimestamp();
}

async function getAvatarEmbed(targetUser, guild) {
  const member = await guild?.members?.fetch(targetUser.id).catch(() => null);
  const user = member ? member.user : targetUser;
  const avatarURL = user.displayAvatarURL({ size: 4096, dynamic: true });
  return new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle(`${user.username}'s Avatar`)
    .setImage(avatarURL)
    .setTimestamp();
}

async function getBannerEmbed(targetUser) {
  const fetchedUser = await client.users.fetch(targetUser.id, { force: true });
  const bannerURL = fetchedUser.bannerURL({ size: 4096, dynamic: true });
  const embed = new EmbedBuilder().setColor(0x8B0000).setTimestamp();
  if (bannerURL) {
    embed.setTitle(`${fetchedUser.username}'s Banner`).setImage(bannerURL);
  } else {
    embed.setTitle(`${fetchedUser.username}'s Banner`).setDescription("This user has no banner or it could not be fetched.");
  }
  return embed;
}

async function getServerInfoEmbed(guild) {
  await guild.fetchOwner().catch(() => {});
  return new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle(`${guild.name} Server Information`)
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .addFields(
      { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
      { name: "Members", value: `${guild.memberCount}`, inline: true },
      { name: "Server ID", value: `${guild.id}`, inline: true },
      { name: "Created On", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      { name: "Channels", value: `${guild.channels.cache.size}`, inline: true },
      { name: "Verification Level", value: `${guild.verificationLevel}`, inline: true }
    )
    .setTimestamp();
}

async function getMemberVoiceChannel(guild, memberId) {
  const member = await guild.members.fetch(memberId).catch(() => null);
  const channel = member?.voice?.channel;
  if (!channel) throw new Error(getLang(guild.id).joinVc);
  return channel;
}

function getPlayer(guildId, vcId, tcId) {
  return (
    lavalink.getPlayer(guildId) ||
    lavalink.createPlayer({ guildId, voiceChannelId: vcId, textChannelId: tcId, selfDeaf: true })
  );
}

async function clearPlayerUI(player) {
  const msgId = player.get("currentMessageId");
  if (msgId) {
    const channel = client.channels.cache.get(player.textChannelId);
    if (channel?.isTextBased()) {
      const msg = await channel.messages.fetch(msgId).catch(() => null);
      if (msg) await msg.delete().catch(() => {});
    }
    player.set("currentMessageId", null);
  }
}

client.on("raw", (packet) => lavalink.sendRawData(packet));

client.on("guildCreate", async (guild) => {
  try {
    const owner = await guild.fetchOwner().catch(() => null);
    if (!owner) return;

    const supportServerUrl = "https://discord.gg/QUMNx7vg4k";

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle(`${EMOJIS.tick} Thank you for choosing Friday Pro!`)
      .setDescription(
        `**Friday Pro** has been successfully integrated into **${guild.name}**.\n\n` +
        `If you need assistance or want to report any issues, join our [Support Server](${supportServerUrl}). ` +
        `Feel free to reach out to our **Developers** for further queries or feature requests.`
      )
      .setTimestamp();

    const supportButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Support Server")
        .setStyle(ButtonStyle.Link)
        .setURL(supportServerUrl)
    );

    await owner.send({
      embeds: [welcomeEmbed],
      components: [supportButton],
    }).catch(async () => {
      const defaultChannel = guild.systemChannel || guild.channels.cache.find(
        (ch) => ch.isTextBased() && ch.permissionsFor(guild.members.me).has("SendMessages")
      );
      if (defaultChannel) {
        await defaultChannel.send({
          content: `<@${owner.id}>`,
          embeds: [welcomeEmbed],
          components: [supportButton],
        }).catch(() => {});
      }
    });
  } catch (err) {
    console.error("Error in guildCreate event:", err);
  }
});

client.once("clientReady", async () => {
  await client.guilds.fetch();
  try {
    await lavalink.init({ id: client.user.id, username: "Friday Pro" });
  } catch (e) {
    console.error("[Lavalink Init Error]", e);
  }

  startStatusRotation();

  for (const [guildId, isEnabled] of guild247Modes.entries()) {
    if (isEnabled) {
      const guild = client.guilds.cache.get(guildId);
      const me = guild?.members?.me;
      if (me?.voice?.channelId) {
        const player = getPlayer(guildId, me.voice.channelId, null);
        await player.connect().catch(() => {});
      }
    }
  }

  console.log(`Logged in as ${client.user.tag} (Friday Pro)`);

  try {
    const rest = new REST({ version: "10" }).setToken(token);
    await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommandsData });
    console.log("Slash Commands registered!");
  } catch (err) {
    console.error(err);
  }
});

lavalink.on("trackStart", async (player, track) => {
  await clearPlayerUI(player);
  currentTrackTitle = track?.info?.title;
  const channel = client.channels.cache.get(player.textChannelId);

  if (channel?.isTextBased()) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("previous").setEmoji("⏮️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("pause_resume").setEmoji("⏸️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("skip").setEmoji("⏭️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("shuffle").setEmoji("🔀").setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("loop").setEmoji("🔁").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("voldown").setEmoji("🔉").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("volup").setEmoji("🔊").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("queue").setEmoji("📋").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("effects").setEmoji("✨").setStyle(ButtonStyle.Success)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("stop").setEmoji("⏹️").setStyle(ButtonStyle.Danger)
    );

    const requestedUser = track.requester;
    const { mainEmbed, cardAttachment } = await createTrackEmbeds(track, player.guildId, requestedUser);
    
    const sendPayload = { embeds: [mainEmbed], components: [row1, row2, row3] };
    if (cardAttachment) sendPayload.files = [cardAttachment];

    const sentMessage = await channel.send(sendPayload).catch(() => {});
    if (sentMessage) {
      player.set("currentMessageId", sentMessage.id);
    }
  }
});

lavalink.on("trackEnd", async (player) => {
  await clearPlayerUI(player);
});

lavalink.on("queueEnd", async (player, track) => {
  currentTrackTitle = null;
  await clearPlayerUI(player);

  if (player.get("autoplay")) {
    try {
      const lastTrack = track || player.queue.previous[0];
      if (lastTrack) {
        const searchResult = await player.search(
          { query: `${lastTrack.info.author} mix`, source: "ytsearch" },
          lastTrack.requester || client.user
        );

        if (searchResult && searchResult.tracks.length > 0) {
          const nextTrack = searchResult.tracks.find(t => t.info.identifier !== lastTrack.info.identifier) || searchResult.tracks[0];
          
          if (nextTrack) {
            player.queue.add(nextTrack);
            await player.play();
            return;
          }
        }
      }
    } catch (err) {
      console.error("[Autoplay Error]", err);
    }
  }

  const channel = client.channels.cache.get(player.textChannelId);
  if (channel?.isTextBased()) {
    channel.send(getLang(player.guildId).queueFinished || "Queue finished.").catch(() => {});
  }
  
  if (!is247Enabled(player.guildId)) {
    setTimeout(() => {
      const activePlayer = lavalink.getPlayer(player.guildId);
      if (activePlayer && !activePlayer.playing && activePlayer.queue.tracks.length === 0) {
        activePlayer.destroy();
      }
    }, 5000);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === "play" || interaction.commandName === "p") {
      const focusedValue = interaction.options.getFocused();
      if (!focusedValue) return interaction.respond([]);

      try {
        const player = lavalink.getPlayer(interaction.guildId) || 
          lavalink.createPlayer({ guildId: interaction.guildId });

        const res = await player.search({ query: focusedValue, source: "ytsearch" }, interaction.user);
        const choices = res.tracks.slice(0, 5).map((track) => ({
          name: `${track.info.title.slice(0, 70)} (${compactDuration(track.info.length)})`,
          value: track.info.uri || track.info.title,
        }));

        await interaction.respond(choices).catch(() => {});
      } catch {
        await interaction.respond([]).catch(() => {});
      }
      return;
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "help_menu_select") {
    const selectedCategory = interaction.values[0];
    const helpData = getHelpMenuData(selectedCategory);
    await interaction.update(helpData).catch(() => {});
    return;
  }

  if (interaction.isButton()) {
    const player = lavalink.getPlayer(interaction.guildId);
    const lang = getLang(interaction.guildId);

    if (!isPremium(interaction.user.id)) {
      return interaction.reply({ content: lang.premiumOnly, ephemeral: true });
    }

    try {
      if (interaction.customId === "pause_resume") {
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });
        const paused = player.paused;
        await player.pause(!paused);
        await interaction.reply({ content: paused ? lang.resumed : lang.paused, ephemeral: true });
      } else if (interaction.customId === "skip") {
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });
        await player.skip();
        await interaction.reply({ content: lang.skipped, ephemeral: true });
      } else if (interaction.customId === "previous") {
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });
        if (player.queue.previous && player.queue.previous.length > 0) {
          await player.play(player.queue.previous[0]);
          await interaction.reply({ content: "Playing previous track.", ephemeral: true });
        } else {
          await interaction.reply({ content: "No previous track available.", ephemeral: true });
        }
      } else if (interaction.customId === "shuffle") {
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });
        player.queue.shuffle();
        await interaction.reply({ content: "Queue shuffled successfully.", ephemeral: true });
      } else if (interaction.customId === "loop") {
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });
        const currentMode = player.repeatMode;
        let nextMode = "off";
        if (currentMode === "off") nextMode = "track";
        else if (currentMode === "track") nextMode = "queue";
        else nextMode = "off";
        player.setRepeatMode(nextMode);
        await interaction.reply({ content: `Repeat mode set to: **${nextMode}**`, ephemeral: true });
      } else if (interaction.customId === "voldown") {
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });
        const newVol = Math.max(0, (player.volume || 100) - 10);
        await player.setVolume(newVol);
        await interaction.reply({ content: `Volume decreased to **${newVol}%**`, ephemeral: true });
      } else if (interaction.customId === "volup") {
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });
        const newVol = Math.min(150, (player.volume || 100) + 10);
        await player.setVolume(newVol);
        await interaction.reply({ content: `Volume increased to **${newVol}%**`, ephemeral: true });
      } else if (interaction.customId === "queue") {
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });
        const queueTracks = player.queue.tracks;
        if (!queueTracks.length) {
          return interaction.reply({ content: lang.queueEmpty, ephemeral: true });
        }
        const desc = queueTracks.slice(0, 10).map((t, i) => `${i + 1}. [${t.info.title}](${t.info.uri})`).join("\n");
        const queueEmbed = new EmbedBuilder().setColor(0x8B0000).setTitle(lang.queueTitle).setDescription(desc);
        await interaction.reply({ embeds: [queueEmbed], ephemeral: true });
      } else if (interaction.customId === "effects") {
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });
        
        const filters = player.filters || player;
        const currentStatus = player.data?.get("bassboost") || false;
        const newStatus = !currentStatus;
        
        if (filters && typeof filters.setEqualizer === "function") {
          const bands = newStatus
            ? Array.from({ length: 3 }, (_, i) => ({ band: i, gain: 0.25 }))
            : Array.from({ length: 3 }, (_, i) => ({ band: i, gain: 0 }));
          await filters.setEqualizer(bands);
        }
        
        if (player.data) {
          player.data.set("bassboost", newStatus);
        }

        await interaction.reply({ content: `Audio effects updated (Bassboost: ${newStatus ? "Enabled" : "Disabled"})`, ephemeral: true });
      } else if (interaction.customId === "stop") {
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });
        await clearPlayerUI(player);
        await player.destroy();
        await interaction.reply({ content: lang.stopped, ephemeral: true });
      }
    } catch (e) {
      await interaction.reply({ content: `Error: ${e.message}`, ephemeral: true }).catch(() => {});
    }
  } else if (interaction.isChatInputCommand()) {
    const lang = getLang(interaction.guildId);
    try {
      if (interaction.commandName === "help" || interaction.commandName === "h") {
        const helpData = getHelpMenuData("overview");
        await interaction.reply(helpData);
      } else if (interaction.commandName === "ping") {
        const wsPing = client.ws.ping;
        const node = lavalink.nodeManager.nodes.first();
        const nodePing = node ? await node.ping() : "N/A";
        const embed = new EmbedBuilder()
          .setColor(0x8B0000)
          .setTitle(`${EMOJIS.bot} Friday Pro Ping Status`)
          .addFields(
            { name: "WebSocket Ping", value: `${wsPing}ms`, inline: true },
            { name: "Lavalink Node Ping", value: `${nodePing}ms`, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      } else if (interaction.commandName === "premium") {
        const sub = interaction.options.getSubcommand();
        if (sub === "status") {
          const memberList = Array.from(premiumUsers);
          let usernames = [];
          for (const uId of memberList) {
            const fetched = await client.users.fetch(uId).catch(() => null);
            if (fetched) usernames.push(`• **${fetched.username}** (\`${uId}\`)`);
            else usernames.push(`• \`${uId}\``);
          }

          const isUserPrem = isPremium(interaction.user.id);
          const embed = new EmbedBuilder()
            .setColor(0x8B0000)
            .setTitle(`${EMOJIS.crown} Friday Pro Premium Status`)
            .setDescription(
              `**Your Status:** ${isUserPrem ? "✅ Premium Active" : "❌ Non-Premium User"}\n` +
              `**Total Premium Members:** ${premiumUsers.size}\n\n` +
              `**Premium Members List:**\n` + (usernames.join("\n") || "No premium users registered yet.")
            )
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        if (!DEVELOPER_IDS.includes(interaction.user.id)) {
          return interaction.reply({ content: "❌ Only Friday Pro Bot Developers can manage premium users!", ephemeral: true });
        }

        const targetUser = interaction.options.getUser("user");
        if (sub === "add") {
          premiumUsers.add(targetUser.id);
          savePremiumUsers();
          return interaction.reply({ content: `✅ Added **${targetUser.tag}** to Friday Pro Premium members!` });
        } else if (sub === "remove") {
          premiumUsers.delete(targetUser.id);
          savePremiumUsers();
          return interaction.reply({ content: `🗑️ Removed **${targetUser.tag}** from Friday Pro Premium members.` });
        }
      } else if (interaction.commandName === "like") {
        const player = lavalink.getPlayer(interaction.guildId);
        if (!player || !player.queue.current) return interaction.reply({ content: "No song is currently playing.", ephemeral: true });
        const added = addTrackToFavs(interaction.user.id, player.queue.current);
        return interaction.reply({ content: added ? `${EMOJIS.crown} Added current song to your favorites!` : "This song is already in your favorites!", ephemeral: true });
      } else if (interaction.commandName === "likeall") {
        const player = lavalink.getPlayer(interaction.guildId);
        if (!player || (!player.queue.current && player.queue.tracks.length === 0)) return interaction.reply({ content: "No songs in queue to add.", ephemeral: true });
        let count = 0;
        if (player.queue.current) if (addTrackToFavs(interaction.user.id, player.queue.current)) count++;
        for (const tr of player.queue.tracks) {
          if (addTrackToFavs(interaction.user.id, tr)) count++;
        }
        return interaction.reply({ content: `${EMOJIS.crown} Added **${count}** songs from current queue to your favorites!`, ephemeral: true });
      } else if (interaction.commandName === "showliked") {
        const favs = getUserFavs(interaction.user.id);
        if (!favs.length) return interaction.reply({ content: "You have no favorite songs saved.", ephemeral: true });
        const desc = favs.slice(0, 15).map((t, i) => `${i + 1}. [${t.title}](${t.uri})`).join("\n");
        const embed = new EmbedBuilder().setColor(0x2B2D31).setTitle(`${EMOJIS.crown} Your Favorite Songs`).setDescription(desc);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (interaction.commandName === "playliked") {
        if (!isPremium(interaction.user.id)) return interaction.reply({ content: lang.premiumOnly, ephemeral: true });
        const favs = getUserFavs(interaction.user.id);
        if (!favs.length) return interaction.reply({ content: "You have no favorite songs saved.", ephemeral: true });
        await interaction.deferReply();
        const vc = await getMemberVoiceChannel(interaction.guild, interaction.user.id);
        const p = getPlayer(interaction.guildId, vc.id, interaction.channelId);
        await p.connect();
        let addedCount = 0;
        for (const item of favs) {
          const res = await p.search({ query: item.uri, source: "ytsearch" }, interaction.user, true);
          if (res.tracks.length) {
            p.queue.add(res.tracks[0]);
            addedCount++;
          }
        }
        if (!p.playing && p.queue.tracks.length > 0) await p.play();
        return interaction.editReply({ content: `▶️ Queueing **${addedCount}** songs from your favorites!` });
      } else if (interaction.commandName === "unlike") {
        userFavorites.delete(interaction.user.id);
        saveUserFavorites();
        return interaction.reply({ content: "🗑️ Cleared all songs from your favorites!", ephemeral: true });
      } else if (interaction.commandName === "stats") {
        await interaction.reply({ embeds: [getStatsEmbed()], ephemeral: true });
      } else if (interaction.commandName === "pause") {
        if (!isPremium(interaction.user.id)) return interaction.reply({ content: lang.premiumOnly, ephemeral: true });
        const player = lavalink.getPlayer(interaction.guildId);
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });
        await player.pause(true);
        await interaction.reply({ content: lang.paused, ephemeral: true });
      } else if (interaction.commandName === "resume") {
        if (!isPremium(interaction.user.id)) return interaction.reply({ content: lang.premiumOnly, ephemeral: true });
        const player = lavalink.getPlayer(interaction.guildId);
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });
        await player.pause(false);
        await interaction.reply({ content: lang.resumed, ephemeral: true });
      } else if (interaction.commandName === "queue" || interaction.commandName === "q") {
        const player = lavalink.getPlayer(interaction.guildId);
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });
        const queueTracks = player.queue.tracks;
        if (!queueTracks.length) {
          return interaction.reply({ content: lang.queueEmpty, ephemeral: true });
        }
        const desc = queueTracks.slice(0, 10).map((t, i) => `${i + 1}. [${t.info.title}](${t.info.uri})`).join("\n");
        const queueEmbed = new EmbedBuilder().setColor(0x8B0000).setTitle(lang.queueTitle).setDescription(desc);
        await interaction.reply({ embeds: [queueEmbed], ephemeral: true });
      } else if (interaction.commandName === "nowplaying" || interaction.commandName === "np") {
        const player = lavalink.getPlayer(interaction.guildId);
        if (!player || !player.queue.current) {
          return interaction.reply({ content: lang.noUpcoming, ephemeral: true });
        }
        const { mainEmbed, cardAttachment } = await createTrackEmbeds(player.queue.current, interaction.guildId, player.queue.current.requester);
        const replyPayload = { embeds: [mainEmbed] };
        if (cardAttachment) replyPayload.files = [cardAttachment];
        await interaction.reply(replyPayload);
      } else if (interaction.commandName === "lyrics") {
        const player = lavalink.getPlayer(interaction.guildId);
        if (!player || !player.queue.current) {
          return interaction.reply({ content: lang.noUpcoming, ephemeral: true });
        }
        await interaction.deferReply();
        const lyricsText = await fetchLyrics(player.queue.current);
        const lyricsEmbed = new EmbedBuilder()
          .setColor(0x8B0000)
          .setTitle(lang.lyricsTitle)
          .setDescription(lyricsText || lang.lyricsNotFound)
          .setTimestamp();
        await interaction.editReply({ embeds: [lyricsEmbed] });
      } else if (interaction.commandName === "247") {
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member?.permissions.has("ManageGuild")) {
          return interaction.reply({ content: lang.noAdminPermission, ephemeral: true });
        }
        const currentStatus = is247Enabled(interaction.guildId);
        const newStatus = !currentStatus;
        guild247Modes.set(interaction.guildId, newStatus);
        saveGuild247();

        if (newStatus && member.voice?.channelId) {
          const p = getPlayer(interaction.guildId, member.voice.channelId, interaction.channelId);
          await p.connect();
        }

        await interaction.reply({
          content: newStatus ? lang.mode247Enabled : lang.mode247Disabled,
          ephemeral: true,
        });
      } else if (interaction.commandName === "autoplay") {
        if (!isPremium(interaction.user.id)) return interaction.reply({ content: lang.premiumOnly, ephemeral: true });
        const player = lavalink.getPlayer(interaction.guildId);
        if (!player) return interaction.reply({ content: "No active player found.", ephemeral: true });

        const currentAutoplay = Boolean(player.get("autoplay"));
        const newAutoplay = !currentAutoplay;

        player.set("autoplay", newAutoplay);

        await interaction.reply({
          content: newAutoplay ? lang.autoplayEnabled : lang.autoplayDisabled,
        });
      } else if (interaction.commandName === "role") {
        const subcommand = interaction.options.getSubcommand();
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

        if (subcommand === "add" || subcommand === "remove") {
          if (!member?.permissions.has("ManageRoles")) {
            return interaction.reply({ content: lang.noAdminPermission, ephemeral: true });
          }
          const targetUser = interaction.options.getUser("user");
          const targetRole = interaction.options.getRole("role");
          const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

          if (!targetMember) return interaction.reply({ content: "User not found in this server.", ephemeral: true });

          if (subcommand === "add") {
            await targetMember.roles.add(targetRole);
            return interaction.reply({ content: `Successfully **added** role ${targetRole.name} to${targetUser.tag}`, ephemeral: true });
          } else {
            await targetMember.roles.remove(targetRole);
            return interaction.reply({ content: `Successfully **removed** role ${targetRole.name} from${targetUser.tag}`, ephemeral: true });
          }
        }

        const isOwner = interaction.guild.ownerId === interaction.user.id;
        if (!isOwner) {
          return interaction.reply({ content: lang.ownerOnly, ephemeral: true });
        }

        if (subcommand === "create") {
          const name = interaction.options.getString("name");
          const color = interaction.options.getString("color") || undefined;
          const newRole = await interaction.guild.roles.create({ name, color, reason: `Created by owner ${interaction.user.tag}` });
          return interaction.reply({ content: `Successfully created role: **${newRole.name}**`, ephemeral: true });
        } else if (subcommand === "delete") {
          const role = interaction.options.getRole("role");
          const roleName = role.name;
          await role.delete(`Deleted by owner ${interaction.user.tag}`);
          return interaction.reply({ content: `Successfully deleted role: **${roleName}**`, ephemeral: true });
        } else if (subcommand === "edit") {
          const role = interaction.options.getRole("role");
          const newName = interaction.options.getString("name");
          const newColor = interaction.options.getString("color");
          
          await role.edit({
            name: newName || role.name,
            color: newColor || role.color,
            reason: `Edited by owner ${interaction.user.tag}`
          });
          return interaction.reply({ content: `Successfully updated role: **${role.name}**`, ephemeral: true });
        } else if (subcommand === "icon") {
          const role = interaction.options.getRole("role");
          const icon = interaction.options.getString("icon");
          
          await role.edit({
            icon: icon,
            reason: `Icon updated by owner ${interaction.user.tag}`
          }).catch(async () => {
            return interaction.reply({ content: "Failed to set role icon. Ensure the server has enough boost level or valid format.", ephemeral: true });
          });
          return interaction.reply({ content: `Successfully updated icon for role: **${role.name}**`, ephemeral: true });
        }
      } else if (interaction.commandName === "roles") {
        const rolesList = interaction.guild.roles.cache
          .sort((a, b) => b.position - a.position)
          .map((r) => r.toString())
          .join(", ");
        
        const embed = new EmbedBuilder()
          .setColor(0x8B0000)
          .setTitle(`Roles in ${interaction.guild.name}`)
          .setDescription(rolesList.length > 4000 ? rolesList.slice(0, 3999) + "..." : rolesList)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (interaction.commandName === "language") {
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member?.permissions.has("ManageGuild")) {
          return interaction.reply({ content: lang.noAdminPermission, ephemeral: true });
        }
        const selectedLang = interaction.options.getString("lang");
        guildLanguages.set(interaction.guildId, selectedLang);
        saveGuildLanguages();
        const updatedLang = getLang(interaction.guildId);
        await interaction.reply({ content: updatedLang.langUpdated, ephemeral: true });
      } else if (interaction.commandName === "avatar") {
        const targetUser = interaction.options.getUser("user") || interaction.user;
        const embed = await getAvatarEmbed(targetUser, interaction.guild);
        await interaction.reply({ embeds: [embed] });
      } else if (interaction.commandName === "banner") {
        const targetUser = interaction.options.getUser("user") || interaction.user;
        const embed = await getBannerEmbed(targetUser);
        await interaction.reply({ embeds: [embed] });
      } else if (interaction.commandName === "serverinfo") {
        const embed = await getServerInfoEmbed(interaction.guild);
        await interaction.reply({ embeds: [embed] });
      } else if (interaction.commandName === "play" || interaction.commandName === "p") {
        if (!isPremium(interaction.user.id)) return interaction.reply({ content: lang.premiumOnly, ephemeral: true });
        await interaction.deferReply();
        const query = interaction.options.getString("query");
        const vc = await getMemberVoiceChannel(interaction.guild, interaction.user.id);
        const p = getPlayer(interaction.guildId, vc.id, interaction.channelId);
        await p.connect();
        const res = await p.search({ query, source: "ytsearch" }, interaction.user, true);
        if (!res.tracks.length) throw new Error(lang.noTracks);
        p.queue.add(res.tracks[0]);
        if (!p.playing) await p.play();
        
        const addedEmbed = createTrackAddedEmbed(res.tracks[0], interaction.guildId, p, interaction.user);
        const addedRow = createTrackAddedRow();
        await interaction.editReply({ embeds: [addedEmbed], components: [addedRow] });
      } else if (interaction.commandName === "skip" || interaction.commandName === "s") {
        if (!isPremium(interaction.user.id)) return interaction.reply({ content: lang.premiumOnly, ephemeral: true });
        const player = lavalink.getPlayer(interaction.guildId);
        await player?.skip();
        await interaction.reply(lang.skipped);
      } else if (interaction.commandName === "stop") {
        if (!isPremium(interaction.user.id)) return interaction.reply({ content: lang.premiumOnly, ephemeral: true });
        const player = lavalink.getPlayer(interaction.guildId);
        if (player) await clearPlayerUI(player);
        await player?.destroy();
        await interaction.reply(lang.stopped);
      }
    } catch (e) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(`Error: ${e.message}`).catch(() => {});
      } else {
        await interaction.reply({ content: `Error: ${e.message}`, ephemeral: true }).catch(() => {});
      }
    }
  }
});

client.on("messageCreate", async (message) => {
  const cmd = parseCommand(message);
  if (!cmd) return;
  const lang = getLang(message.guildId);
  const player = lavalink.getPlayer(message.guildId);

  try {
    if (cmd.name === "help" || cmd.name === "h") {
      const category = cmd.args[0]?.toLowerCase() === "favourite" || cmd.args[0]?.toLowerCase() === "favorite" ? "favourite" : "overview";
      const helpData = getHelpMenuData(category);
      message.reply(helpData);
    } else if (cmd.name === "ping") {
      const wsPing = client.ws.ping;
      const node = lavalink.nodeManager.nodes.first();
      const nodePing = node ? await node.ping() : "N/A";
      const embed = new EmbedBuilder()
        .setColor(0x8B0000)
        .setTitle(`${EMOJIS.bot} Friday Pro Ping Status`)
        .addFields(
          { name: "WebSocket Ping", value: `${wsPing}ms`, inline: true },
          { name: "Lavalink Node Ping", value: `${nodePing}ms`, inline: true }
        )
        .setTimestamp();
      message.reply({ embeds: [embed] });
    } else if (cmd.name === "premium") {
      const sub = cmd.args[0]?.toLowerCase();
      if (sub === "status" || !sub) {
        const memberList = Array.from(premiumUsers);
        let usernames = [];
        for (const uId of memberList) {
          const fetched = await client.users.fetch(uId).catch(() => null);
          if (fetched) usernames.push(`• **${fetched.username}** (\`${uId}\`)`);
          else usernames.push(`• \`${uId}\``);
        }

        const isUserPrem = isPremium(message.author.id);
        const embed = new EmbedBuilder()
          .setColor(0x8B0000)
          .setTitle(`${EMOJIS.crown} Friday Pro Premium Status`)
          .setDescription(
            `**Your Status:** ${isUserPrem ? "✅ Premium Active" : "❌ Non-Premium User"}\n` +
            `**Total Premium Members:** ${premiumUsers.size}\n\n` +
            `**Premium Members List:**\n` + (usernames.join("\n") || "No premium users registered yet.")
          )
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      if (!DEVELOPER_IDS.includes(message.author.id)) {
        return message.reply("❌ Only Friday Pro Bot Developers can manage premium users!");
      }

      const targetUser = message.mentions.users.first() || (cmd.args[1] ? await client.users.fetch(cmd.args[1]).catch(() => null) : null);
      if (!targetUser) return message.reply("Please specify or mention a valid user.");

      if (sub === "add") {
        premiumUsers.add(targetUser.id);
        savePremiumUsers();
        return message.reply(`✅ Added **${targetUser.tag}** to Friday Pro Premium members!`);
      } else if (sub === "remove") {
        premiumUsers.delete(targetUser.id);
        savePremiumUsers();
        return message.reply(`🗑️ Removed **${targetUser.tag}** from Friday Pro Premium members.`);
      }
    } else if (cmd.name === "like") {
      if (!player || !player.queue.current) return message.reply("No song is currently playing.");
      const added = addTrackToFavs(message.author.id, player.queue.current);
      message.reply(added ? `${EMOJIS.crown} Added current song to your favorites!` : "This song is already in your favorites!");
    } else if (cmd.name === "likeall") {
      if (!player || (!player.queue.current && player.queue.tracks.length === 0)) return message.reply("No songs in queue to add.");
      let count = 0;
      if (player.queue.current) if (addTrackToFavs(message.author.id, player.queue.current)) count++;
      for (const tr of player.queue.tracks) {
        if (addTrackToFavs(message.author.id, tr)) count++;
      }
      message.reply(`${EMOJIS.crown} Added **${count}** songs from current queue to your favorites!`);
    } else if (cmd.name === "showliked") {
      const favs = getUserFavs(message.author.id);
      if (!favs.length) return message.reply("You have no favorite songs saved.");
      const desc = favs.slice(0, 15).map((t, i) => `${i + 1}. [${t.title}](${t.uri})`).join("\n");
      const embed = new EmbedBuilder().setColor(0x2B2D31).setTitle(`${EMOJIS.crown} Your Favorite Songs`).setDescription(desc);
      message.reply({ embeds: [embed] });
    } else if (cmd.name === "playliked") {
      if (!isPremium(message.author.id)) return message.reply(lang.premiumOnly);
      const favs = getUserFavs(message.author.id);
      if (!favs.length) return message.reply("You have no favorite songs saved.");
      const vc = await getMemberVoiceChannel(message.guild, message.author.id);
      const p = getPlayer(message.guildId, vc.id, message.channelId);
      await p.connect();
      let addedCount = 0;
      for (const item of favs) {
        const res = await p.search({ query: item.uri, source: "ytsearch" }, message.author, true);
        if (res.tracks.length) {
          p.queue.add(res.tracks[0]);
          addedCount++;
        }
      }
      if (!p.playing && p.queue.tracks.length > 0) await p.play();
      message.reply(`▶️ Queueing **${addedCount}** songs from your favorites!`);
    } else if (cmd.name === "unlike") {
      userFavorites.delete(message.author.id);
      saveUserFavorites();
      message.reply("🗑️ Cleared all songs from your favorites!");
    } else if (cmd.name === "play" || cmd.name === "p") {
      if (!isPremium(message.author.id)) return message.reply(lang.premiumOnly);
      if (!cmd.args.length) return message.reply("Please provide a song name or URL!");
      const vc = await getMemberVoiceChannel(message.guild, message.author.id);
      const p = getPlayer(message.guildId, vc.id, message.channelId);
      await p.connect();
      const res = await p.search({ query: cmd.args.join(" "), source: "ytsearch" }, message.author, true);
      if (!res.tracks.length) throw new Error(lang.noTracks);
      p.queue.add(res.tracks[0]);
      if (!p.playing) await p.play();
      
      const addedEmbed = createTrackAddedEmbed(res.tracks[0], message.guildId, p, message.author);
      const addedRow = createTrackAddedRow();
      message.reply({ embeds: [addedEmbed], components: [addedRow] });
    } else if (cmd.name === "skip" || cmd.name === "s") {
      if (!isPremium(message.author.id)) return message.reply(lang.premiumOnly);
      await player?.skip();
      message.reply(lang.skipped);
    } else if (cmd.name === "pause") {
      if (!isPremium(message.author.id)) return message.reply(lang.premiumOnly);
      if (!player) return message.reply("No active player found.");
      await player.pause(true);
      message.reply(lang.paused);
    } else if (cmd.name === "resume") {
      if (!isPremium(message.author.id)) return message.reply(lang.premiumOnly);
      if (!player) return message.reply("No active player found.");
      await player.pause(false);
      message.reply(lang.resumed);
    } else if (cmd.name === "queue" || cmd.name === "q") {
      if (!player) return message.reply("No active player found.");
      const queueTracks = player.queue.tracks;
      if (!queueTracks.length) return message.reply(lang.queueEmpty);
      const desc = queueTracks.slice(0, 10).map((t, i) => `${i + 1}. [${t.info.title}](${t.info.uri})`).join("\n");
      const queueEmbed = new EmbedBuilder().setColor(0x8B0000).setTitle(lang.queueTitle).setDescription(desc);
      message.reply({ embeds: [queueEmbed] });
    } else if (cmd.name === "nowplaying" || cmd.name === "np") {
      if (!player || !player.queue.current) return message.reply(lang.noUpcoming);
      const { mainEmbed, cardAttachment } = await createTrackEmbeds(player.queue.current, message.guildId, message.guildId ? message.author : null);
      const replyPayload = { embeds: [mainEmbed] };
      if (cardAttachment) replyPayload.files = [cardAttachment];
      message.reply(replyPayload);
    } else if (cmd.name === "stop") {
      if (!isPremium(message.author.id)) return message.reply(lang.premiumOnly);
      if (player) await clearPlayerUI(player);
      await player?.destroy();
      message.reply(lang.stopped);
    } else if (cmd.name === "stats") {
      message.reply({ embeds: [getStatsEmbed()] });
    } else if (cmd.name === "lyrics") {
      if (!player || !player.queue.current) {
        return message.reply(lang.noUpcoming);
      }
      const lyricsText = await fetchLyrics(player.queue.current);
      const lyricsEmbed = new EmbedBuilder()
        .setColor(0x8B0000)
        .setTitle(lang.lyricsTitle)
        .setDescription(lyricsText || lang.lyricsNotFound)
        .setTimestamp();
      message.reply({ embeds: [lyricsEmbed] });
    } else if (cmd.name === "247" || cmd.name === "24/7") {
      if (!message.member?.permissions.has("ManageGuild")) {
        return message.reply(lang.noAdminPermission);
      }
      const currentStatus = is247Enabled(message.guildId);
      const newStatus = !currentStatus;
      guild247Modes.set(message.guildId, newStatus);
      saveGuild247();

      if (newStatus && message.member.voice?.channelId) {
        const p = getPlayer(message.guildId, message.member.voice.channelId, message.channelId);
        await p.connect();
      }

      message.reply(newStatus ? lang.mode247Enabled : lang.mode247Disabled);
    } else if (cmd.name === "autoplay" || cmd.name === "ap") {
      if (!isPremium(message.author.id)) return message.reply(lang.premiumOnly);
      if (!player) return message.reply("No active player found.");

      const currentAutoplay = Boolean(player.get("autoplay"));
      const newAutoplay = !currentAutoplay;

      player.set("autoplay", newAutoplay);

      message.reply(newAutoplay ? lang.autoplayEnabled : lang.autoplayDisabled);
    } else if (
      cmd.name === "role" ||
      cmd.name === "roleadd" ||
      cmd.name === "roleassign" ||
      cmd.name === "roleremove" ||
      cmd.name === "rolecreate" ||
      cmd.name === "roledelete" ||
      cmd.name === "roleedit"
    ) {
      let sub = cmd.args[0]?.toLowerCase();
      
      if (cmd.name === "roleedit") sub = "edit";
      else if (cmd.name === "roledelete") sub = "delete";
      else if (cmd.name === "rolecreate") sub = "create";
      else if (cmd.name === "roleassign" || cmd.name === "roleadd") sub = "add";
      else if (cmd.name === "roleremove") sub = "remove";

      if (!sub) {
        return message.reply(
          "**Usage:**\n" +
          "`?role add @user @role` / `?role assign @user @role`\n" +
          "`?role remove @user @role`\n" +
          "`?role create <name>` *(Owner Only)*\n" +
          "`?role delete @role` *(Owner Only)*\n" +
          "`?role edit @role <new_name>` *(Owner Only)*\n" +
          "`?role icon @role <emoji/url>` *(Owner Only)*"
        );
      }

      if (sub === "add" || sub === "assign" || sub === "remove") {
        if (!message.member?.permissions.has("ManageRoles")) {
          return message.reply(lang.noAdminPermission);
        }
        const targetMember = message.mentions.members.first();
        const targetRole = message.mentions.roles.first();

        if (!targetMember || !targetRole) {
          return message.reply(`Please mention a user and a role. Example: \`?role ${sub} @User @Role\``);
        }

        if (sub === "add" || sub === "assign") {
          await targetMember.roles.add(targetRole);
          return message.reply(`Successfully **added** role ${targetRole.name} to **${targetMember.user.tag}**`);
        } else {
          await targetMember.roles.remove(targetRole);
          return message.reply(`Successfully **removed** role ${targetRole.name} from **${targetMember.user.tag}**`);
        }
      }

      const isOwner = message.guild.ownerId === message.author.id;
      if (!isOwner) {
        return message.reply(lang.ownerOnly);
      }

      if (sub === "create") {
        const roleName = (cmd.name === "rolecreate") ? cmd.args.join(" ") : cmd.args.slice(1).join(" ");
        if (!roleName) return message.reply("Please specify a role name. Usage: `?role create <name>`");
        const newRole = await message.guild.roles.create({ name: roleName, reason: `Created by owner ${message.author.tag}` });
        return message.reply(`Successfully created role: **${newRole.name}**`);
      } else if (sub === "delete") {
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(cmd.args[1]);
        if (!role) return message.reply("Please mention a role to delete. Usage: `?role delete @role`");
        const roleName = role.name;
        await role.delete(`Deleted by owner ${message.author.tag}`);
        return message.reply(`Successfully deleted role: **${roleName}**`);
      } else if (sub === "edit") {
        const role = message.mentions.roles.first();
        const newName = (cmd.name === "roleedit") ? cmd.args.slice(1).join(" ") : cmd.args.slice(2).join(" ");
        if (!role || !newName) return message.reply("Usage: `?role edit @role <new_name>` or `?roleedit @role <new_name>`");
        await role.edit({ name: newName, reason: `Edited by owner ${message.author.tag}` });
        return message.reply(`Successfully renamed role to: **${newName}**`);
      } else if (sub === "icon") {
        const role = message.mentions.roles.first();
        const icon = cmd.args[2];
        if (!role || !icon) return message.reply("Usage: `?role icon @role <emoji/url>`");
        await role.edit({ icon, reason: `Icon updated by owner ${message.author.tag}` }).catch(() => {
          return message.reply("Failed to set role icon. Ensure the server has enough boost level.");
        });
        return message.reply(`Successfully updated icon for role: **${role.name}**`);
      } else {
        return message.reply("Unknown subcommand! Options: `add`, `remove`, `create`, `delete`, `edit`, `icon`");
      }
    } else if (cmd.name === "roles") {
      const rolesList = message.guild.roles.cache
        .sort((a, b) => b.position - a.position)
        .map((r) => r.toString())
        .join(", ");
      
      const embed = new EmbedBuilder()
        .setColor(0x8B0000)
        .setTitle(`Roles in ${message.guild.name}`)
        .setDescription(rolesList.length > 4000 ? rolesList.slice(0, 3999) + "..." : rolesList)
        .setTimestamp();
      
      message.reply({ embeds: [embed] });
    } else if (cmd.name === "avatar") {
      const targetUser = message.mentions.users.first() || message.author;
      const embed = await getAvatarEmbed(targetUser, message.guild);
      message.reply({ embeds: [embed] });
    } else if (cmd.name === "banner") {
      const targetUser = message.mentions.users.first() || message.author;
      const embed = await getBannerEmbed(targetUser);
      message.reply({ embeds: [embed] });
    } else if (cmd.name === "serverinfo" || cmd.name === "server") {
      const embed = await getServerInfoEmbed(message.guild);
      message.reply({ embeds: [embed] });
    } else if (cmd.name === "language") {
      if (!message.member?.permissions.has("ManageGuild")) {
        return message.reply(lang.noAdminPermission);
      }
      const langChoice = cmd.args[0]?.toLowerCase();
      if (!["en", "hi"].includes(langChoice)) {
        return message.reply("Please specify a valid language code: `en` (English) or `hi` (Hindi). Usage: `?language hi`");
      }
      guildLanguages.set(message.guildId, langChoice);
      saveGuildLanguages();
      const updatedLang = getLang(message.guildId);
      message.reply(updatedLang.langUpdated);
    }
  } catch (e) {
    message.reply(`Error: ${e.message}`);
  }
});

client.login(token);
