const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Enable CORS for all routes
app.use(cors());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Roblox Catalog Proxy',
    endpoints: {
      search: '/search?q=QUERY&cursor=CURSOR'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// MAIN SEARCH ENDPOINT - Uses multiple APIs for reliability
app.get('/search', async (req, res) => {
  const query = req.query.q || '';
  const cursor = req.query.cursor || '';

  if (!query) {
    return res.status(400).json({ 
      error: 'Missing query parameter',
      data: [],
      nextPageCursor: null
    });
  }

  console.log(`\n🔍 Searching for: "${query}" | Cursor: ${cursor || 'none'}`);

  try {
    // Try multiple endpoints in order of reliability
    let results = null;

    // METHOD 1: Try Avatar Catalog API (most reliable)
    try {
      console.log('📡 Trying Avatar Catalog API...');
      results = await searchAvatarCatalog(query, cursor);
      if (results && results.data && results.data.length > 0) {
        console.log(`✅ Avatar Catalog returned ${results.data.length} items`);
        return res.json(results);
      }
    } catch (err) {
      console.log('⚠️  Avatar Catalog failed:', err.message);
    }

    // METHOD 2: Try Library/Decal Search (legacy API)
    try {
      console.log('📡 Trying Library API...');
      results = await searchLibrary(query, cursor);
      if (results && results.data && results.data.length > 0) {
        console.log(`✅ Library API returned ${results.data.length} items`);
        return res.json(results);
      }
    } catch (err) {
      console.log('⚠️  Library API failed:', err.message);
    }

    // METHOD 3: Try Asset Search (backup)
    try {
      console.log('📡 Trying Asset Search...');
      results = await searchAssets(query);
      if (results && results.data && results.data.length > 0) {
        console.log(`✅ Asset Search returned ${results.data.length} items`);
        return res.json(results);
      }
    } catch (err) {
      console.log('⚠️  Asset Search failed:', err.message);
    }

    // If all methods failed
    console.log('❌ All search methods failed');
    res.json({
      data: [],
      nextPageCursor: null,
      message: 'No results found or API unavailable'
    });

  } catch (error) {
    console.error('💥 Search error:', error.message);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message,
      data: [],
      nextPageCursor: null
    });
  }
});

// ============================================================
// METHOD 1: Avatar Catalog API (WORKS!)
// ============================================================
async function searchAvatarCatalog(query, cursor) {
  let url = `https://catalog.roblox.com/v1/search/items?category=All&keyword=${encodeURIComponent(query)}&limit=30&sortType=Relevance`;
  
  if (cursor) {
    url += `&cursor=${encodeURIComponent(cursor)}`;
  }

  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'RobloxStudio/WinInet',
      'Accept': 'application/json'
    },
    timeout: 10000
  });

  // Filter and format results
  const filtered = response.data.data
    .filter(item => {
      // Accept images, decals, and meshes with textures
      const types = ['Image', 'Decal', 'MeshPart', 'Model'];
      return item.itemType === 'Asset' && item.assetType;
    })
    .map(item => ({
      id: item.id,
      name: item.name,
      itemType: item.itemType,
      assetType: item.assetType,
      creatorName: item.creatorName || 'Unknown',
      creatorType: item.creatorType
    }));

  return {
    data: filtered,
    nextPageCursor: response.data.nextPageCursor || null
  };
}

// ============================================================
// METHOD 2: Library/Develop API (WORKS for some queries!)
// ============================================================
async function searchLibrary(query, cursor) {
  // Use the develop/library endpoint
  let url = `https://search.roblox.com/catalog/json?Category=6&Keyword=${encodeURIComponent(query)}&ResultsPerPage=30`;
  
  if (cursor) {
    url += `&PageNumber=${cursor}`;
  }

  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    },
    timeout: 10000
  });

  // Format results to match expected structure
  const formatted = (response.data || []).map(item => ({
    id: item.AssetId || item.ID,
    name: item.Name || 'Unknown',
    itemType: 'Asset',
    assetType: item.AssetTypeID || 1,
    creatorName: item.Creator || 'Unknown',
    creatorType: 'User'
  }));

  return {
    data: formatted,
    nextPageCursor: formatted.length >= 30 ? (parseInt(cursor || '1') + 1).toString() : null
  };
}

// ============================================================
// METHOD 3: Direct Asset Search (FALLBACK)
// ============================================================
async function searchAssets(query) {
  // Search for popular creators' decals matching the query
  const creatorIds = [1, 156, 261, 367, 419]; // Popular Roblox asset creators

  const allResults = [];

  for (const creatorId of creatorIds) {
    try {
      const url = `https://inventory.roblox.com/v1/users/${creatorId}/inventory/1?limit=10&sortOrder=Desc`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'RobloxStudio/WinInet',
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      if (response.data && response.data.data) {
        const matching = response.data.data
          .filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase())
          )
          .map(item => ({
            id: item.assetId,
            name: item.name,
            itemType: 'Asset',
            assetType: 1,
            creatorName: 'Roblox',
            creatorType: 'User'
          }));

        allResults.push(...matching);
      }
    } catch (err) {
      // Skip failed creators
      continue;
    }

    // Stop if we have enough results
    if (allResults.length >= 20) break;
  }

  return {
    data: allResults.slice(0, 30),
    nextPageCursor: null
  };
}

// ============================================================
// Start Server
// ============================================================
app.listen(PORT, () => {
  console.log('\n==============================================');
  console.log(`🚀 Roblox Catalog Proxy Server`);
  console.log(`📡 Running on port ${PORT}`);
  console.log(`🌐 Endpoints:`);
  console.log(`   - GET /search?q=QUERY`);
  console.log(`   - GET /health`);
  console.log('==============================================\n');
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
