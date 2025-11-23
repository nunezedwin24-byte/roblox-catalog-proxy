const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Helper function to get thumbnail
async function getThumbnailUrl(assetId) {
  try {
    const response = await axios.get(
      `https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&size=150x150&format=Png&returnPolicy=PlaceHolder`,
      { timeout: 5000 }
    );
    
    if (response.data?.data?.[0]?.imageUrl) {
      return response.data.data[0].imageUrl;
    }
  } catch (error) {
    console.log(`Thumbnail error for ${assetId}: ${error.message}`);
  }
  return null;
}

// Search endpoint
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const cursor = req.query.cursor || '';
    
    let url = `https://catalog.roblox.com/v1/search/items?category=Decals&keyword=${encodeURIComponent(query)}&limit=30&salesTypeFilter=1`;
    
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    }
    
    console.log('Searching:', query);
    
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;
    
    // Process each item to add thumbnail
    if (data.data && Array.isArray(data.data)) {
      for (let item of data.data) {
        if (item.id) {
          // Try to get thumbnail
          const thumbnail = await getThumbnailUrl(item.id);
          if (thumbnail) {
            item.thumbnailUrl = thumbnail;
          }
          
          // Simple texture ID conversion
          item.textureId = item.id - 1;
        }
      }
    }
    
    res.json(data);
    
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'Roblox Proxy Server Running'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
