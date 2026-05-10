require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const stock = require('./stockManager');

const commands = [
  {
    name: 'gen',
    description: 'Generate a game code',
    options: [
      {
        name: 'category',
        description: 'Which type of code to generate',
        type: ApplicationCommandOptionType.String,
        required: true,
        autocomplete: true
      }
    ]
  },
  {
    name: 'stock',
    description: 'View current stock levels'
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered.');
  } catch (err) {
    console.error(err);
  }
})();
