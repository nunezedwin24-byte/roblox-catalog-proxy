const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/search', async (req, res) => {
  const query = req.query.q || 'icon';
  const cursor = req.query.cursor || '';
  const url = `https://catalog.roblox.com/v1/search/items?category=All&subcategory=Decals&limit=30&keyword=${encodeURIComponent(query)}${cursor ? '&cursor=' + cursor : ''}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // FILTER: Only return results where the query appears in the name
    if (data.data) {
      const queryLower = query.toLowerCase();
      data.data = data.data.filter(item => {
        const nameLower = (item.name || '').toLowerCase();
        return nameLower.includes(queryLower);
      });
      
      console.log(`Filtered ${data.data.length} relevant results for "${query}"`);
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/', (req, res) => {
  res.send('Roblox Proxy with Smart Filtering!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Running on ' + PORT));
