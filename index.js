const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE || "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_CAEaAhACIhwKBGR1aWQSFDEwMDgwNjE3OTg4ODUxMDM3ODEwKAM.1QIe4rJzC6pe2G_3m0gvVZDN-CgxaM8qf6A2ou9Be_Qis8uqN6HdmbnmoGbC4JGmCjTro_f5FiXL512FoYzoghc-43aB0MO4Q48z0LZanI7IEUv9CsSOTkqGBHPAMvDf_DV19QTVlmnqW4cxaSIM7rEIrztfIgOU96xLeDvbm9fmees2jY8hYvM_dXapVrW3jaGBjotR2JYm7Czd-vf6b9WgpdOlczmnwzXA0OrGRettX1amxILICs_q56vuG_4czdNYGbbZVrNDXzt1EoeRi9TmRsZghr5Yh_Db8qscilaQqUuNuUKAkll9mBFt_uzsEJrZzxJVV9aLNQ-ZCLeyjQ-NV_Cyw5V2ro8Cnmog4jz7njfiRxG1nfVDnlMqF3BL1UP_c9rU4NqcymCtSJboKvgmcvKjjxI4MVTccexIeOvpJpaxDZj5CKdCe_I6BjqlQOkbz8l_rnm0atBkzQE4n5LELweXKY2cEyGLaKhyXKslMBH2L25qkqL66zvJ2vCRR1cw1jo3i7ocCXQbUKh9traCJSpAt6l7uHZ_vSLrPnmUeBlQirjBKVlTXXTX_z1XqDRiFOglawuKUwbyAeyE1QQltYvodgvEnfEHtTJ_hYJfOfnGOlYlL4GyLODMdvW_cLye9epZx8DE1xMV6HUgIH0LucoYVtQx3dJhLZavCXLCkYEA9__-DwZg16zPlZptWPy2k79oaiDvjxj3AEDr5PxgxItOskaYN_yUw5WbPmO0S7TyThMWbQ8dt1_oar2Cx7ovq4Em43z7hDpN1EWEm7_THFP8P7U8Ii10Z3FOyUcKvDMAVaRp30HvbI851XuJjpqt9xZZV7cw81W0FFD1KKF3KxPKeG_eD5Sok3UAovpehImMWClxsdi3LTXL5kSmoGPujwhB_cjj3ODLyq5MUzSty0HAs8_EEwYezejvySDrbotKrolMnwhjVJ0wz0h6lvGF7GL7K30meBmrSj8KDoJxHWagoHjtjxQ95fy8sWBlj2Z-jGbkmCHLpDlGACEuZndz0UT6ZjiF6R2bxHDCaZZN2OsJqYHz0d-lEWywPON6hft0NVPy99A66k0PytuKx_NDQlGNsXV6YeDT_I5DeWm1u1gOOOXNARKoUe6AGN7934pdEb5EWULhCKfP9zjL6Wam4w";

app.use(cors());

// Root
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    endpoints: {
      search: '/search?q=QUERY&cursor=CURSOR (Finds decals)',
      convert: '/convert?id=DECAL_ID (Gets the texture ID)'
    }
  });
});

// ============================================================
// 1. CONVERT ENDPOINT (Decal ID -> Image ID)
// ============================================================
app.get('/convert', async (req, res) => {
    const decalId = req.query.id;
    if (!decalId) return res.status(400).json({ error: 'Missing id parameter' });

    try {
        const url = `https://assetdelivery.roblox.com/v1/asset/?id=${decalId}`;
        const response = await axios.get(url);
        
        const match = response.data.match(/id=(\d+)/);
        
        if (match && match[1]) {
            res.json({
                decalId: decalId,
                imageId: match[1],
                imageUrl: `rbxassetid://${match[1]}`,
                success: true
            });
        } else {
            res.json({
                decalId: decalId,
                imageId: decalId,
                message: "Could not extract texture. ID might already be an image.",
                success: false
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Conversion failed', details: error.message });
    }
});

// ============================================================
// 2. SEARCH ENDPOINT (WITH PAGINATION!)
// ============================================================
app.get('/search', async (req, res) => {
  const query = req.query.q || '';
  const cursor = req.query.cursor || ''; // ✅ Get cursor from query
  
  if (!query) return res.status(400).json({ error: 'Missing query' });

  console.log(`🔍 Searching Decals for: "${query}" | Cursor: ${cursor || 'none'}`);

  try {
    let results = [];
    let nextCursor = null;

    // METHOD A: Toolbox API (Requires Cookie) - Supports pagination!
    if (ROBLOX_COOKIE) {
        console.log('📡 Using Toolbox API (Authenticated)...');
        const toolboxResult = await searchToolboxPaginated(query, cursor);
        results = toolboxResult.data;
        nextCursor = toolboxResult.nextCursor;
    }

    // METHOD B: Inventory Scan (No Cookie) - No pagination support
    if (!results || results.length === 0) {
        console.log('📡 Using Inventory Scan (Public - no pagination)...');
        results = await searchInventories(query);
        nextCursor = null; // Inventory scan doesn't support cursors
    }

    res.json({
        count: results.length,
        data: results,
        nextPageCursor: nextCursor // ✅ Return cursor for next page
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// Helper: Search Toolbox with Pagination Support
// ---------------------------------------------------------
async function searchToolboxPaginated(query, cursor = '') {
    try {
        // Category 13 = Decals
        // ✅ pageNumber changes based on cursor
        const pageNumber = cursor ? parseInt(cursor) : 1;
        
        const url = `https://apis.roblox.com/toolbox-service/v1/marketplace/13?limit=30&pageNumber=${pageNumber}&keyword=${encodeURIComponent(query)}`;
        
        console.log(`📄 Requesting page ${pageNumber}...`);
        
        const response = await axios.get(url, {
            headers: {
                'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}`,
                'User-Agent': 'RobloxStudio/WinInet'
            }
        });

        const items = response.data.data || [];
        
        // Calculate next cursor (next page number)
        const hasMore = items.length >= 30;
        const nextCursor = hasMore ? (pageNumber + 1).toString() : null;

        console.log(`✅ Got ${items.length} results, next cursor: ${nextCursor || 'none'}`);

        return {
            data: items.map(item => ({
                id: item.id,
                name: item.name,
                creator: item.creatorName,
                created: item.created,
                assetType: 'Decal'
            })),
            nextCursor: nextCursor
        };
    } catch (e) {
        console.log("⚠️ Toolbox API Failed:", e.message);
        return { data: [], nextCursor: null };
    }
}

// ---------------------------------------------------------
// Helper: Search Public Inventories (No pagination)
// ---------------------------------------------------------
async function searchInventories(query) {
    const publicLibraries = [
        1,          // Roblox
        156,        // builderman
        11613337,   // Google Images (Bot account)
        44349926,   // Textures
    ];

    let allResults = [];
    const lowerQuery = query.toLowerCase();

    const promises = publicLibraries.map(async (userId) => {
        try {
            const url = `https://inventory.roblox.com/v1/users/${userId}/inventory/13?limit=100&sortOrder=Desc`;
            const response = await axios.get(url);
            
            const matches = response.data.data.filter(item => 
                item.name && item.name.toLowerCase().includes(lowerQuery)
            );
            
            return matches;
        } catch (e) {
            return [];
        }
    });

    const results = await Promise.all(promises);
    
    results.forEach(arr => allResults.push(...arr));

    // Limit to 30 results for consistency
    return allResults.slice(0, 30).map(item => ({
        id: item.assetId,
        name: item.name,
        creator: 'Public Library',
        assetType: 'Decal'
    }));
}

app.listen(PORT, () => {
  console.log(`🚀 API Ready on port ${PORT}`);
});
