const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 10000;

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// NEW: Use the Creator Marketplace API (works!)
app.get('/search', async (req, res) => {
  const query = req.query.q || '';
  const cursor = req.query.cursor || '';

  // Use the Avatar Catalog API (still works for UGC)
  let url = `https://catalog.roblox.com/v1/search/items?category=All&keyword=${encodeURIComponent(query)}&limit=30`;
  
  if (cursor) {
    url += `&cursor=${encodeURIComponent(cursor)}`;
  }

  console.log('Searching:', url);

  try {
    const response = await axios.get(url);
    
    // Filter for only Images and Decals
    const filteredData = {
      ...response.data,
      data: response.data.data.filter(item => {
        const typeId = item.itemType || item.assetType;
        return typeId === 'Asset' || typeId === 1 || typeId === 13;
      })
    };
    
    res.json(filteredData);
    console.log('✅ Sent', filteredData.data.length, 'results');
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message,
      data: [],
      nextPageCursor: null
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy running on port ${PORT}`);
});
