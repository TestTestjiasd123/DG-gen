const fs = require('fs');
const path = require('path');

const STOCK_FILE = path.join(__dirname, '../data/stock.json');

function readStock() {
  const raw = fs.readFileSync(STOCK_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeStock(data) {
  fs.writeFileSync(STOCK_FILE, JSON.stringify(data, null, 2));
}

function getCategories() {
  return readStock().categories;
}

function getCategoryList(tier = null) {
  const cats = getCategories();
  return Object.entries(cats)
    .filter(([, v]) => !tier || v.tier === tier)
    .map(([key, v]) => ({ key, label: v.label, tier: v.tier, count: v.stock.length }));
}

function getStock(categoryKey) {
  const data = readStock();
  return data.categories[categoryKey] || null;
}

function pullCode(categoryKey) {
  const data = readStock();
  const cat = data.categories[categoryKey];
  if (!cat || cat.stock.length === 0) return null;
  const code = cat.stock.shift();
  writeStock(data);
  return code;
}

function addStock(categoryKey, codes) {
  const data = readStock();
  if (!data.categories[categoryKey]) return false;
  data.categories[categoryKey].stock.push(...codes);
  writeStock(data);
  return true;
}

function addCategory(key, label, tier) {
  const data = readStock();
  if (data.categories[key]) return false;
  data.categories[key] = { label, tier, stock: [] };
  writeStock(data);
  return true;
}

function deleteCategory(key) {
  const data = readStock();
  if (!data.categories[key]) return false;
  delete data.categories[key];
  writeStock(data);
  return true;
}

function updateCategoryTier(key, tier) {
  const data = readStock();
  if (!data.categories[key]) return false;
  data.categories[key].tier = tier;
  writeStock(data);
  return true;
}

function clearStock(key) {
  const data = readStock();
  if (!data.categories[key]) return false;
  data.categories[key].stock = [];
  writeStock(data);
  return true;
}

module.exports = {
  getCategories, getCategoryList, getStock,
  pullCode, addStock, addCategory, deleteCategory,
  updateCategoryTier, clearStock
};
