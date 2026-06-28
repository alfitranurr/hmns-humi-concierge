const { Client, GatewayIntentBits, Partials } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!N8N_WEBHOOK_URL || !DISCORD_BOT_TOKEN) {
  console.error('ERROR: N8N_WEBHOOK_URL atau DISCORD_BOT_TOKEN belum diisi di .env');
  process.exit(1);
}

client.once('ready', () => {
  console.log(`✅ HUMI relay bot online sebagai ${client.user.tag}`);
  console.log(`📡 Mengirim pesan ke webhook: ${N8N_WEBHOOK_URL}`);
});

client.on('messageCreate', async (message) => {
  // Jangan proses pesan dari bot lain (termasuk diri sendiri) — mencegah loop
  if (message.author.bot) return;

  const payload = {
    message_id: message.id,
    content: message.content,
    author_id: message.author.id,
    author_username: message.author.username,
    channel_id: message.channelId,
    channel_name: message.channel.name || 'DM',
    guild_id: message.guildId || null,
    is_dm: !message.guildId,
    member_roles: message.member
      ? message.member.roles.cache.map((r) => r.name)
      : [],
    timestamp: message.createdAt,
  };

  try {
    await axios.post(N8N_WEBHOOK_URL, payload);
    console.log(`→ Pesan dari ${message.author.username} diteruskan ke n8n`);
  } catch (err) {
    console.error('Gagal mengirim ke n8n webhook:', err.message);
  }
});

client.login(DISCORD_BOT_TOKEN);
