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
  
  // Use original working API
  const url = `https://catalog.roblox.com/v1/search/items?category=All&subcategory=Decals&limit=30&keyword=${encodeURIComponent(query)}${cursor ? '&cursor=' + cursor : ''}`;
  
  try {
    const response = await fetch(url);
    const rawData = await response.json();
    
    console.log(`API returned ${rawData.data ? rawData.data.length : 0} results for "${query}"`);
    
    // Just return everything - no filtering
    res.json(rawData);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed', data: [] });
  }
});

app.get('/', (req, res) => {
  res.send('Roblox Catalog Proxy - No Filtering');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
