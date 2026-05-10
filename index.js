require('dotenv').config();
const {
  Client, GatewayIntentBits, EmbedBuilder, Events, ActivityType
} = require('discord.js');
const stock = require('./stockManager');
const settings = require('./settingsManager');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const cooldowns = new Map();

function getCooldownMs(categoryKey, isFree) {
  const s = settings.getAll();
  const overrides = s.categoryOverrides || {};
  if (overrides[categoryKey] !== undefined) return overrides[categoryKey] * 60 * 1000;
  return isFree ? s.freeCooldownMinutes * 60 * 1000 : s.paidCooldownMinutes * 60 * 1000;
}

function getCooldownRemaining(userId, category, ms) {
  const last = (cooldowns.get(userId) || {})[category] || 0;
  const diff = Date.now() - last;
  return diff < ms ? ms - diff : 0;
}

function setCooldown(userId, category) {
  if (!cooldowns.has(userId)) cooldowns.set(userId, {});
  cooldowns.get(userId)[category] = Date.now();
}

function formatMs(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fill(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function hexColor(str) {
  const n = parseInt((str || '').replace('#', ''), 16);
  return isNaN(n) ? 0x2b2d31 : n;
}

function applyStatus() {
  const s = settings.getAll();
  const typeMap = { PLAYING: ActivityType.Playing, WATCHING: ActivityType.Watching, LISTENING: ActivityType.Listening, COMPETING: ActivityType.Competing };
  client.user.setPresence({
    status: s.botStatus || 'online',
    activities: s.botActivity ? [{ name: s.botActivity, type: typeMap[s.botActivityType] || ActivityType.Playing }] : []
  });
}

client.once(Events.ClientReady, () => {
  console.log(`✅ ${client.user.tag} online`);
  applyStatus();
  setInterval(applyStatus, 5 * 60 * 1000);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isAutocomplete() || interaction.commandName !== 'gen') return;
  const s = settings.getAll();
  const freeChannel = s.freeChannelId || process.env.FREE_CHANNEL_ID;
  const paidChannel = s.paidChannelId || process.env.PAID_CHANNEL_ID;
  const isPaid = interaction.channelId === paidChannel;
  const isFree = interaction.channelId === freeChannel;
  const tier = isPaid ? 'paid' : isFree ? 'free' : null;
  const focused = interaction.options.getFocused().toLowerCase();
  const cats = stock.getCategoryList(tier)
    .filter(c => c.label.toLowerCase().includes(focused) || c.key.includes(focused))
    .slice(0, 25)
    .map(c => ({ name: `${c.label} (${c.count} in stock)`, value: c.key }));
  await interaction.respond(cats);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const s = settings.getAll();
  const freeChannel = s.freeChannelId || process.env.FREE_CHANNEL_ID;
  const paidChannel = s.paidChannelId || process.env.PAID_CHANNEL_ID;
  const paidRole    = s.paidRoleId    || process.env.PAID_ROLE_ID;

  if (interaction.commandName === 'stock') {
    const cats = stock.getCategoryList();
    if (!cats.length) return interaction.reply({ content: '❌ No categories configured yet.', ephemeral: true });
    const embed = new EmbedBuilder()
      .setTitle(fill(s.stockEmbedTitle, { botName: s.botName }))
      .setColor(hexColor(s.stockEmbedColor))
      .setTimestamp()
      .setFooter({ text: s.botName });
    const freeList = cats.filter(c => c.tier === 'free');
    const paidList = cats.filter(c => c.tier === 'paid');
    if (freeList.length) embed.addFields({ name: '🆓 Free Tier', value: freeList.map(c => `\`${c.label}\` — **${c.count}** codes`).join('\n') });
    if (paidList.length) embed.addFields({ name: '💎 Paid Tier', value: paidList.map(c => `\`${c.label}\` — **${c.count}** codes`).join('\n') });
    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === 'gen') {
    const isFree = interaction.channelId === freeChannel;
    const isPaid = interaction.channelId === paidChannel;
    if (!isFree && !isPaid) return interaction.reply({ content: s.wrongChannelMessage, ephemeral: true });

    if (isPaid && !interaction.member.roles.cache.has(paidRole)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(hexColor(s.noAccessColor)).setTitle(s.noAccessTitle).setDescription(s.noAccessMessage)], ephemeral: true });
    }

    const categoryKey = interaction.options.getString('category');
    const cat = stock.getStock(categoryKey);
    if (!cat) return interaction.reply({ content: '❌ Invalid category.', ephemeral: true });

    if (isFree && cat.tier !== 'free') return interaction.reply({ content: `❌ \`${cat.label}\` is paid-tier. Use the paid channel.`, ephemeral: true });
    if (isPaid && cat.tier !== 'paid') return interaction.reply({ content: `❌ \`${cat.label}\` is free-tier. Use the free channel.`, ephemeral: true });

    const cdMs = getCooldownMs(categoryKey, isFree);
    const remaining = getCooldownRemaining(interaction.user.id, categoryKey, cdMs);
    if (remaining > 0) return interaction.reply({ content: fill(s.cooldownMessage, { category: cat.label, time: formatMs(remaining) }), ephemeral: true });

    const code = stock.pullCode(categoryKey);
    if (!code) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(hexColor(s.outOfStockColor)).setTitle(s.outOfStockTitle).setDescription(fill(s.outOfStockMessage, { category: cat.label }))], ephemeral: true });
    }
    setCooldown(interaction.user.id, categoryKey);

    const color  = hexColor(isFree ? s.freeEmbedColor : s.paidEmbedColor);
    const title  = fill(isFree ? s.freeEmbedTitle : s.paidEmbedTitle, { category: cat.label });
    const footer = isFree ? s.freeEmbedFooter : s.paidEmbedFooter;

    try {
      const dmEmbed = new EmbedBuilder().setColor(color).setTitle(title)
        .setDescription(`\`\`\`\n${code}\n\`\`\``)
        .addFields({ name: 'Category', value: cat.label, inline: true }, { name: 'Tier', value: isFree ? 'Free' : 'Paid', inline: true })
        .setTimestamp().setFooter({ text: footer });
      await interaction.user.send({ embeds: [dmEmbed] });
      const confirmEmbed = new EmbedBuilder().setColor(color).setTitle(s.confirmEmbedTitle)
        .setDescription(fill(s.confirmEmbedMessage, { category: cat.label })).setTimestamp();
      return interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    } catch {
      const fallback = new EmbedBuilder().setColor(color).setTitle(title)
        .setDescription(`> ${s.dmFallbackMessage}\n\`\`\`\n${code}\n\`\`\``)
        .setFooter({ text: 'Enable DMs from server members to receive codes privately.' });
      return interaction.reply({ embeds: [fallback], ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
