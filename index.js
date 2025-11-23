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
  
  // Use the Creator Marketplace search instead
  const url = `https://apis.roblox.com/toolbox-service/v1/marketplace/search?category=Decals&keyword=${encodeURIComponent(query)}&pageSize=30${cursor ? '&cursor=' + cursor : ''}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Convert to expected format
    const converted = {
      data: data.results ? data.results.map(item => ({
        id: item.assetId || item.id,
        name: item.name,
        description: item.description || '',
        creatorName: item.creatorName || 'Unknown'
      })) : [],
      nextPageCursor: data.nextCursor || null
    };
    
    console.log(`Found ${converted.data.length} results for "${query}"`);
    res.json(converted);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed', data: [] });
  }
});

app.get('/', (req, res) => {
  res.send('Roblox Toolbox Search Proxy!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Running on ' + PORT));
