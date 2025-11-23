const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

// Enable CORS for Roblox
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Get thumbnail URL from Roblox (THIS WORKS from external servers!)
async function getThumbnailUrl(assetId) {
  try {
    const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&size=150x150&format=Png&returnPolicy=PlaceHolder`;
    const response = await axios.get(url);
    
    if (response.data && response.data.data && response.data.data[0]) {
      const imageUrl = response.data.data[0].imageUrl;
      if (imageUrl) {
        console.log(`✓ Got thumbnail for ${assetId}:`, imageUrl.substring(0, 50));
        return imageUrl;
      }
    }
  } catch (error) {
    console.error(`✗ Thumbnail failed for ${assetId}:`, error.message);
  }
  return null;
}

// Get texture ID from decal XML
async function getTextureFromDecal(decalId) {
  try {
    const response = await axios.get(`https://assetdelivery.roblox.com/v1/asset/?id=${decalId}`);
    const xml = response.data;
    
    const match = xml.match(/<url>.*?(\d+)<\/url>/);
    if (match && match[1]) {
      const textureId = parseInt(match[1]);
      console.log(`✓ Extracted texture ${textureId} from decal ${decalId}`);
      return textureId;
    }
  } catch (error) {
    console.error(`✗ Texture extraction failed for ${decalId}:`, error.message);
  }
  
  // Fallback
  return decalId - 1;
}

// Main search endpoint
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const cursor = req.query.cursor || '';
    
    let catalogUrl = `https://catalog.roblox.com/v1/search/items?category=Decals&keyword=${encodeURIComponent(query)}&limit=30&salesTypeFilter=1`;
    
    if (cursor) {
      catalogUrl += `&cursor=${encodeURIComponent(cursor)}`;
    }
    
    console.log('\n=== NEW SEARCH ===');
    console.log('Query:', query);
    console.log('URL:', catalogUrl);
    
    const response = await axios.get(catalogUrl);
    const data = response.data;
    
    if (data.data && data.data.length > 0) {
      console.log(`Found ${data.data.length} decals, processing...`);
      
      // Process items in batches to avoid overwhelming APIs
      const batchSize = 5;
      const processedData = [];
      
      for (let i = 0; i < data.data.length; i += batchSize) {
        const batch = data.data.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (item) => {
          if (item.id && typeof item.id === 'number') {
            const decalId = item.id;
            
            // Get BOTH thumbnail URL and texture ID
            const [thumbnailUrl, textureId] = await Promise.all([
              getThumbnailUrl(decalId),
              getTextureFromDecal(decalId)
            ]);
            
            return {
              ...item,
              id: textureId,              // Converted texture ID
              originalId: decalId,        // Original decal ID
              thumbnailUrl: thumbnailUrl  // Direct image URL!
            };
          }
          return item;
        });
        
        const batchResults = await Promise.all(batchPromises);
        processedData.push(...batchResults);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      data.data = processedData;
      console.log(`✓ Processed ${processedData.length} items`);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'Roblox Decal Proxy Server',
    endpoints: {
      search: '/search?q=QUERY&cursor=CURSOR'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
  console.log(`📡 Ready to fetch decals and thumbnails!`);
});
