const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const axios = require('axios');

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
// Channel where HUMI answers every customer message. Elsewhere HUMI only answers when mentioned.
const HUMI_CHANNEL_NAME = process.env.HUMI_CHANNEL_NAME || 'tanya-humi';
// Admin channel: only messages starting with "!" (commands) are forwarded.
const ADMIN_CHANNEL_NAME = process.env.ADMIN_CHANNEL_NAME || 'admin-hmns';
// Welcoming new members needs "Server Members Intent" enabled in the Discord Developer Portal.
const ENABLE_WELCOME = process.env.ENABLE_WELCOME === 'true';
const WELCOME_CHANNEL_NAME = process.env.WELCOME_CHANNEL_NAME || 'welcome';

// Per-user message limit so spam cannot burn the Gemini quota.
const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
// Discord shows "is typing..." for about 10 seconds per call, so it is repeated until HUMI replies.
const TYPING_REFRESH_MS = 8 * 1000;
const TYPING_TIMEOUT_MS = 60 * 1000;

if (!N8N_WEBHOOK_URL || !DISCORD_BOT_TOKEN) {
  console.error('ERROR: N8N_WEBHOOK_URL or DISCORD_BOT_TOKEN is missing in .env');
  process.exit(1);
}

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.DirectMessages,
];
if (ENABLE_WELCOME) intents.push(GatewayIntentBits.GuildMembers);

const client = new Client({ intents, partials: [Partials.Channel] });

const typingByChannel = new Map();
const recentByUser = new Map();
const warnedByUser = new Set();

function startTyping(channel) {
  stopTyping(channel.id);
  channel.sendTyping().catch(() => {});
  const interval = setInterval(() => channel.sendTyping().catch(() => {}), TYPING_REFRESH_MS);
  const timeout = setTimeout(() => stopTyping(channel.id), TYPING_TIMEOUT_MS);
  typingByChannel.set(channel.id, { interval, timeout });
}

function stopTyping(channelId) {
  const typing = typingByChannel.get(channelId);
  if (!typing) return;
  clearInterval(typing.interval);
  clearTimeout(typing.timeout);
  typingByChannel.delete(channelId);
}

function isRateLimited(userId) {
  const now = Date.now();
  const recent = (recentByUser.get(userId) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  recentByUser.set(userId, recent);
  if (recent.length <= RATE_LIMIT_MAX) warnedByUser.delete(userId);
  return recent.length > RATE_LIMIT_MAX;
}

function findTextChannel(guild, name) {
  return guild.channels.cache.find((c) => c.name === name && c.isTextBased());
}

client.once(Events.ClientReady, () => {
  console.log(`✅ HUMI relay bot online as ${client.user.tag}`);
  console.log(`📡 Forwarding messages to webhook: ${N8N_WEBHOOK_URL}`);
  console.log(`💬 Customer channel: #${HUMI_CHANNEL_NAME} (+ DMs + mentions) · admin: #${ADMIN_CHANNEL_NAME}`);
  console.log(`👋 Welcome message: ${ENABLE_WELCOME ? `on in #${WELCOME_CHANNEL_NAME}` : 'off'}`);
});

client.on(Events.MessageCreate, async (message) => {
  // HUMI's reply has been posted: stop the typing indicator in that channel.
  if (message.author.id === client.user.id) {
    stopTyping(message.channelId);
    return;
  }
  // Ignore other bots to avoid reply loops
  if (message.author.bot) return;

  const isDm = !message.guildId;
  const channelName = message.channel.name || 'DM';
  const isMention = message.mentions.users.has(client.user.id);
  const isAdminChannel = channelName === ADMIN_CHANNEL_NAME;
  const content = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();

  if (isAdminChannel) {
    if (!content.startsWith('!')) return;
  } else if (!isDm && channelName !== HUMI_CHANNEL_NAME && !isMention) {
    return;
  } else if (content.startsWith('!')) {
    // Admin commands only work in the admin channel; answer here without spending AI quota.
    message.reply(`Command admin cuma bisa dipakai di #${ADMIN_CHANNEL_NAME} ya kak 🙏`).catch(() => {});
    return;
  }

  if (isRateLimited(message.author.id)) {
    if (!warnedByUser.has(message.author.id)) {
      warnedByUser.add(message.author.id);
      message
        .reply('Pelan-pelan dulu ya kak, HUMI lagi ngejar ketinggalan nih 😅 Coba kirim lagi sebentar lagi 🫶')
        .catch(() => {});
    }
    return;
  }

  const payload = {
    message_id: message.id,
    content,
    author_id: message.author.id,
    author_username: message.author.username,
    author_display_name: message.member?.displayName || message.author.globalName || message.author.username,
    channel_id: message.channelId,
    channel_name: channelName,
    guild_id: message.guildId || null,
    is_dm: isDm,
    is_mention: isMention,
    member_roles: message.member
      ? message.member.roles.cache.map((r) => r.name)
      : [],
    timestamp: message.createdAt,
  };

  startTyping(message.channel);
  try {
    await axios.post(N8N_WEBHOOK_URL, payload);
    console.log(`→ Message from ${message.author.username} (#${channelName}) forwarded to n8n`);
  } catch (err) {
    stopTyping(message.channelId);
    console.error('Failed to reach the n8n webhook:', err.message);
    message
      .reply('Duh, HUMI lagi ada gangguan teknis nih kak 🙏 Coba lagi beberapa menit lagi ya.')
      .catch(() => {});
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  if (!ENABLE_WELCOME || member.user.bot) return;
  const channel = findTextChannel(member.guild, WELCOME_CHANNEL_NAME) || member.guild.systemChannel;
  if (!channel) return;
  const humiChannel = findTextChannel(member.guild, HUMI_CHANNEL_NAME);
  const askHere = humiChannel ? `<#${humiChannel.id}>` : `#${HUMI_CHANNEL_NAME}`;
  const text = [
    `Haii ${member}, welcome to the Humins fam! 👋✨`,
    `Aku **HUMI**, AI concierge-nya HMNS. Bingung pilih wangi? Ngobrol aja sama aku di ${askHere} atau DM aku langsung.`,
    '',
    'Contoh yang bisa kamu tanya:',
    '- "cariin parfum fresh buat ngantor dong"',
    '- "bedanya Alpha sama Farhampton apa?"',
    '- "reed diffuser buat kamar biar cozy"',
  ].join('\n');
  channel.send(text).catch((err) => console.error('Failed to send welcome message:', err.message));
});

client.login(DISCORD_BOT_TOKEN);
