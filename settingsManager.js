const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, 'settings.json');

const DEFAULTS = {
  // Bot identity
  botName: 'DG Gen',
  botStatus: 'online', // online, idle, dnd, invisible
  botActivity: 'Delivering game codes 🎮',
  botActivityType: 'PLAYING', // PLAYING, WATCHING, LISTENING, COMPETING

  // Channels & roles (can also be set via .env as fallback)
  freeChannelId: '',
  paidChannelId: '',
  paidRoleId: '',

  // Cooldowns (in minutes)
  freeCooldownMinutes: 1440,  // 24h
  paidCooldownMinutes: 60,    // 1h

  // Embeds - Gen success (free)
  freeEmbedColor: '57f287',
  freeEmbedTitle: '🆓 Your {category} Code',
  freeEmbedFooter: 'DG Gen — Do not share this code',

  // Embeds - Gen success (paid)
  paidEmbedColor: 'f1c40f',
  paidEmbedTitle: '💎 Your {category} Code',
  paidEmbedFooter: 'DG Gen — Do not share this code',

  // Embeds - Out of stock
  outOfStockColor: 'e74c3c',
  outOfStockTitle: '😔 Out of Stock',
  outOfStockMessage: '**{category}** is currently out of stock.\nCheck back later or contact an admin.',

  // Embeds - No access
  noAccessColor: 'e74c3c',
  noAccessTitle: '🔒 Paid Members Only',
  noAccessMessage: 'You need the **Paid** role to use this channel.\nPurchase access to unlock premium codes.',

  // Embeds - Cooldown message
  cooldownMessage: '⏳ You\'re on cooldown for **{category}**. Try again in **{time}**.',

  // Embeds - Stock command
  stockEmbedColor: '2b2d31',
  stockEmbedTitle: '📦 {botName} — Stock Levels',

  // Embeds - Confirm (public reply after gen)
  confirmEmbedTitle: '✅ Code Sent!',
  confirmEmbedMessage: 'Your **{category}** code has been sent to your DMs!\n> 📬 Check your direct messages.',

  // DM fallback message (shown if DMs are closed)
  dmFallbackMessage: '⚠️ Couldn\'t DM you — here\'s your code:',

  // Wrong channel message
  wrongChannelMessage: '❌ You can only use this command in the designated gen channels.',

  // Per-category cooldown overrides: { "categoryKey": minutes }
  categoryOverrides: {}
};

function readSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

function get(key) {
  return readSettings()[key];
}

function getAll() {
  return readSettings();
}

function set(updates) {
  const current = readSettings();
  const merged = { ...current, ...updates };
  writeSettings(merged);
  return merged;
}

function reset() {
  writeSettings(DEFAULTS);
  return DEFAULTS;
}

module.exports = { get, getAll, set, reset, DEFAULTS };
