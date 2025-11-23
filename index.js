const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Search endpoint
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const cursor = req.query.cursor || '';
    
    // Use the catalog API v2 which returns better data
    let url = `https://catalog.roblox.com/v2/search/items?category=Decals&keyword=${encodeURIComponent(query)}&limit=30`;
    
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }
    
    console.log('Searching:', url);
    
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    const data = response.data;
    
    // Process and clean the data
    if (data && data.data) {
      const cleanedData = data.data.map(item => {
        // Extract the actual asset ID (not the weird huge numbers)
        let assetId = item.id;
        
        // If ID is corrupted (too large), try to extract from item
        if (assetId > 999999999999) {
          // Try to get from itemTargetId or other fields
          assetId = item.itemTargetId || item.targetId || Math.floor(assetId / 10000000);
        }
        
        return {
          id: assetId,
          name: item.name || 'Decal',
          creatorName: item.creatorName || 'Unknown'
        };
      });
      
      res.json({
        data: cleanedData,
        nextPageCursor: data.nextPageCursor
      });
    } else {
      res.json({ data: [], nextPageCursor: null });
    }
    
  } catch (error) {
    console.error('Search error:', error.message);
    
    // Fallback to v1 API if v2 fails
    try {
      const query = req.query.q || '';
      const cursor = req.query.cursor || '';
      
      let url = `https://catalog.roblox.com/v1/search/items?category=FreeDecals&keyword=${encodeURIComponent(query)}&limit=30`;
      
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }
      
      const response = await axios.get(url);
      res.json(response.data);
      
    } catch (fallbackError) {
      res.status(500).json({ error: 'Search failed', message: fallbackError.message });
    }
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'Roblox Decal Proxy'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
