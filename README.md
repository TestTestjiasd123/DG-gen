# DG Gen — Game Code Delivery Bot

A Discord bot that delivers game codes to free and paid members, with a professional admin website to manage stock.

---

## Project Structure

```
dg-gen/
├── bot/
│   ├── index.js              # Main bot
│   ├── deploy-commands.js    # Register slash commands (run once)
│   └── stockManager.js       # Stock read/write logic
├── website/
│   ├── server.js             # Express API + static server
│   └── public/
│       └── index.html        # Admin panel UI
├── data/
│   └── stock.json            # Stock database (auto-managed)
├── .env.example
├── package.json
├── railway.json
└── Procfile
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create your `.env` file
```bash
cp .env.example .env
```

Fill in:
| Variable | Where to find it |
|---|---|
| `DISCORD_TOKEN` | Discord Developer Portal → Your App → Bot → Token |
| `CLIENT_ID` | Discord Developer Portal → Your App → General → Application ID |
| `GUILD_ID` | Right-click your server in Discord → Copy Server ID |
| `FREE_CHANNEL_ID` | Right-click the free gen channel → Copy Channel ID |
| `PAID_CHANNEL_ID` | Right-click the paid gen channel → Copy Channel ID |
| `PAID_ROLE_ID` | Server Settings → Roles → right-click your paid role → Copy Role ID |
| `ADMIN_PASSWORD` | Choose any strong password for the website |

> **Enable Developer Mode**: Discord Settings → Advanced → Developer Mode → ON

### 3. Register slash commands (run once)
```bash
node bot/deploy-commands.js
```

### 4. Start the bot + website
```bash
# Start admin website
npm run website

# Start bot (in separate terminal)
npm start
```

---

## Discord Bot Commands

| Command | Channel | Role Required | Description |
|---|---|---|---|
| `/gen <category>` | Free channel | None | Get a free code |
| `/gen <category>` | Paid channel | Paid role | Get a paid code |
| `/stock` | Anywhere | None | View current stock levels |

### Cooldowns
- **Free tier**: 24 hours per category
- **Paid tier**: 1 hour per category

---

## Admin Website

Visit `http://localhost:3000` (or your Railway URL) and log in with your `ADMIN_PASSWORD`.

### Features
- **Add categories** with a display name, slug key, and tier (free/paid)
- **Add stock** — paste codes one per line
- **Switch tiers** — move a category between free and paid instantly
- **Delete categories** — removes category and all its stock
- **Live stock counts** — see how many codes remain per category

---

## Deploying to Railway

### Option A: Two services (recommended)
Create two Railway services from the same repo:
1. **Website service** — start command: `node website/server.js`
2. **Bot service** — start command: `node bot/index.js`

Add your `.env` variables to both services in Railway's Variables tab.

### Option B: Single service (website only, bot runs locally)
Use `railway.json` as-is — deploys the website. Run the bot locally or on a VPS.

### Important for Railway
- Set all environment variables in Railway's dashboard under **Variables**
- The `data/stock.json` file will reset on each deploy — use Railway's **persistent volumes** or migrate to MongoDB if you want stock to survive redeploys

---

## Persistent Stock (Optional Upgrade)

By default stock is stored in `data/stock.json`. On Railway, this resets on redeploy.

To persist stock, either:
- Add a **Railway Volume** mounted at `/app/data`
- Or swap `stockManager.js` to use MongoDB (ask for the MongoDB version)

---

## Bot Permissions Required
When inviting the bot, ensure these permissions:
- `Send Messages`
- `Embed Links`
- `Use Slash Commands`
- `Read Message History`
- `Send Messages in Threads`
