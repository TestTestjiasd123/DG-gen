require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const stock = require('./stockManager');
const settings = require('./settingsManager');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function auth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Auth ─────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) return res.json({ success: true });
  res.status(401).json({ error: 'Invalid password' });
});

// ── Settings ─────────────────────────────────────────
app.get('/api/settings', auth, (req, res) => {
  res.json(settings.getAll());
});

app.patch('/api/settings', auth, (req, res) => {
  const updated = settings.set(req.body);
  res.json(updated);
});

app.post('/api/settings/reset', auth, (req, res) => {
  res.json(settings.reset());
});

// ── Categories ────────────────────────────────────────
app.get('/api/categories', auth, (req, res) => {
  res.json(stock.getCategoryList());
});

app.get('/api/stock/:key', auth, (req, res) => {
  const cat = stock.getStock(req.params.key);
  if (!cat) return res.status(404).json({ error: 'Not found' });
  res.json(cat);
});

app.post('/api/stock/:key', auth, (req, res) => {
  const { codes } = req.body;
  if (!Array.isArray(codes) || !codes.length) return res.status(400).json({ error: 'Provide a non-empty array of codes' });
  const cleaned = codes.map(c => c.trim()).filter(Boolean);
  const ok = stock.addStock(req.params.key, cleaned);
  if (!ok) return res.status(404).json({ error: 'Category not found' });
  res.json({ added: cleaned.length });
});

app.post('/api/categories', auth, (req, res) => {
  const { key, label, tier } = req.body;
  if (!key || !label || !['free', 'paid'].includes(tier)) return res.status(400).json({ error: 'key, label, tier required' });
  const slug = key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const ok = stock.addCategory(slug, label, tier);
  if (!ok) return res.status(409).json({ error: 'Category already exists' });
  res.json({ success: true, key: slug });
});

app.patch('/api/categories/:key', auth, (req, res) => {
  const { tier } = req.body;
  if (!['free', 'paid'].includes(tier)) return res.status(400).json({ error: 'tier must be free or paid' });
  const ok = stock.updateCategoryTier(req.params.key, tier);
  if (!ok) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true });
});

app.delete('/api/stock/:key', auth, (req, res) => {
  const ok = stock.clearStock(req.params.key);
  if (!ok) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true });
});

app.delete('/api/categories/:key', auth, (req, res) => {
  const ok = stock.deleteCategory(req.params.key);
  if (!ok) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`✅ DG Gen Admin on port ${PORT}`));
