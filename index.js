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
  
  // Use Creator Store API (what create.roblox.com uses)
  const url = `https://apis.roblox.com/toolbox-service/v1/items/search?category=Decals&searchKeyword=${encodeURIComponent(query)}&limit=30${cursor ? '&cursor=' + cursor : ''}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Convert format
    const converted = {
      data: data.items ? data.items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        creatorName: item.creator?.name || 'Unknown'
      })) : [],
      nextPageCursor: data.nextPageCursor || null
    };
    
    console.log(`Creator Store: Found ${converted.data.length} results for "${query}"`);
    res.json(converted);
  } catch (error) {
    console.error('Creator Store search error:', error);
    res.status(500).json({ error: 'Failed', data: [] });
  }
});

app.get('/', (req, res) => {
  res.send('Roblox Creator Store Proxy!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Running on ' + PORT));
