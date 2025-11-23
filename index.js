// server.js (or index.js) on your Render.com deployment
const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

// Helper to get texture ID from decal ID
async function getTextureFromDecal(decalId) {
  try {
    // Get decal details from Roblox API
    const response = await axios.get(`https://assetdelivery.roblox.com/v1/asset/?id=${decalId}`);
    const xml = response.data;
    
    // Extract texture ID from the XML response
    const match = xml.match(/<url>.*?(\d+)<\/url>/);
    if (match && match[1]) {
      return parseInt(match[1]);
    }
    
    // Fallback to -1 method
    return decalId - 1;
  } catch (error) {
    console.error('Error getting texture:', error.message);
    return decalId - 1; // Fallback
  }
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
    
    console.log('Searching:', url);
    
    const response = await axios.get(url);
    const data = response.data;
    
    // Convert decal IDs to texture IDs
    if (data.data && data.data.length > 0) {
      const promises = data.data.map(async (item) => {
        if (item.id) {
          const textureId = await getTextureFromDecal(item.id);
          return {
            ...item,
            id: textureId,  // Replace with texture ID
            originalId: item.id  // Keep original for reference
          };
        }
        return item;
      });
      
      data.data = await Promise.all(promises);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
