const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// OPTIONAL: Put your bot account cookie here if you want 100% global search results.
// If left empty, it will use the limited "Inventory Scan" method.
const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE || "_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_CAEaAhACIhwKBGR1aWQSFDEwMDgwNjE3OTg4ODUxMDM3ODEwKAM.1QIe4rJzC6pe2G_3m0gvVZDN-CgxaM8qf6A2ou9Be_Qis8uqN6HdmbnmoGbC4JGmCjTro_f5FiXL512FoYzoghc-43aB0MO4Q48z0LZanI7IEUv9CsSOTkqGBHPAMvDf_DV19QTVlmnqW4cxaSIM7rEIrztfIgOU96xLeDvbm9fmees2jY8hYvM_dXapVrW3jaGBjotR2JYm7Czd-vf6b9WgpdOlczmnwzXA0OrGRettX1amxILICs_q56vuG_4czdNYGbbZVrNDXzt1EoeRi9TmRsZghr5Yh_Db8qscilaQqUuNuUKAkll9mBFt_uzsEJrZzxJVV9aLNQ-ZCLeyjQ-NV_Cyw5V2ro8Cnmog4jz7njfiRxG1nfVDnlMqF3BL1UP_c9rU4NqcymCtSJboKvgmcvKjjxI4MVTccexIeOvpJpaxDZj5CKdCe_I6BjqlQOkbz8l_rnm0atBkzQE4n5LELweXKY2cEyGLaKhyXKslMBH2L25qkqL66zvJ2vCRR1cw1jo3i7ocCXQbUKh9traCJSpAt6l7uHZ_vSLrPnmUeBlQirjBKVlTXXTX_z1XqDRiFOglawuKUwbyAeyE1QQltYvodgvEnfEHtTJ_hYJfOfnGOlYlL4GyLODMdvW_cLye9epZx8DE1xMV6HUgIH0LucoYVtQx3dJhLZavCXLCkYEA9__-DwZg16zPlZptWPy2k79oaiDvjxj3AEDr5PxgxItOskaYN_yUw5WbPmO0S7TyThMWbQ8dt1_oar2Cx7ovq4Em43z7hDpN1EWEm7_THFP8P7U8Ii10Z3FOyUcKvDMAVaRp30HvbI851XuJjpqt9xZZV7cw81W0FFD1KKF3KxPKeG_eD5Sok3UAovpehImMWClxsdi3LTXL5kSmoGPujwhB_cjj3ODLyq5MUzSty0HAs8_EEwYezejvySDrbotKrolMnwhjVJ0wz0h6lvGF7GL7K30meBmrSj8KDoJxHWagoHjtjxQ95fy8sWBlj2Z-jGbkmCHLpDlGACEuZndz0UT6ZjiF6R2bxHDCaZZN2OsJqYHz0d-lEWywPON6hft0NVPy99A66k0PytuKx_NDQlGNsXV6YeDT_I5DeWm1u1gOOOXNARKoUe6AGN7934pdEb5EWULhCKfP9zjL6Wam4w"; 

app.use(cors());

// Root
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    endpoints: {
      search: '/search?q=QUERY (Finds decals)',
      convert: '/convert?id=DECAL_ID (Gets the texture ID)'
    }
  });
});

// ============================================================
// 1. CONVERT ENDPOINT (Decal ID -> Image ID) - 100% RELIABLE
// ============================================================
app.get('/convert', async (req, res) => {
    const decalId = req.query.id;
    if (!decalId) return res.status(400).json({ error: 'Missing id parameter' });

    try {
        // 1. Request the asset info from AssetDelivery
        const url = `https://assetdelivery.roblox.com/v1/asset/?id=${decalId}`;
        const response = await axios.get(url);
        
        // 2. The response is XML. We look for the Texture ID inside <url> tags.
        // Format usually: <url>http://www.roblox.com/asset/?id=123456</url>
        const match = response.data.match(/id=(\d+)/);
        
        if (match && match[1]) {
            // We found the underlying Image ID
            res.json({
                decalId: decalId,
                imageId: match[1],
                imageUrl: `rbxassetid://${match[1]}`,
                success: true
            });
        } else {
            // If no sub-id found, it might already be an image or invalid
            res.json({
                decalId: decalId,
                imageId: decalId, // Fallback
                message: "Could not extract texture. ID might already be an image.",
                success: false
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Conversion failed', details: error.message });
    }
});

// ============================================================
// 2. SEARCH ENDPOINT (Smart Switch)
// ============================================================
app.get('/search', async (req, res) => {
  const query = req.query.q || '';
  if (!query) return res.status(400).json({ error: 'Missing query' });

  console.log(`🔍 Searching Decals for: "${query}"`);

  try {
    let results = [];

    // METHOD A: Toolbox API (Requires Cookie) - The "Official" Way
    if (ROBLOX_COOKIE) {
        console.log('📡 Using Toolbox API (Authenticated)...');
        results = await searchToolbox(query);
    }

    // METHOD B: Inventory Scan (No Cookie) - The "Fallback" Way
    // If Method A didn't run or returned nothing, try this.
    if (!results || results.length === 0) {
        console.log('📡 Using Inventory Scan (Public)...');
        results = await searchInventories(query);
    }

    res.json({
        count: results.length,
        data: results
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------
// Helper: Search Official Toolbox (Needs Cookie)
// ---------------------------------------------------------
async function searchToolbox(query) {
    try {
        // Category 13 = Decals
        const url = `https://apis.roblox.com/toolbox-service/v1/marketplace/13?limit=30&pageNumber=1&keyword=${encodeURIComponent(query)}`;
        
        const response = await axios.get(url, {
            headers: {
                'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}`,
                'User-Agent': 'RobloxStudio/WinInet'
            }
        });

        return response.data.data.map(item => ({
            id: item.id,
            name: item.name,
            creator: item.creatorName,
            created: item.created,
            assetType: 'Decal'
        }));
    } catch (e) {
        console.log("⚠️ Toolbox API Failed (Cookie might be invalid):", e.message);
        return [];
    }
}

// ---------------------------------------------------------
// Helper: Search Public Inventories (No Cookie needed)
// ---------------------------------------------------------
async function searchInventories(query) {
    // List of users known to have massive public decal libraries
    // You can add more IDs here to improve results
    const publicLibraries = [
        1,          // Roblox
        156,        // builderman
        11613337,   // Google Images (Bot account often used)
        44349926,   // Textures
    ];

    let allResults = [];
    const lowerQuery = query.toLowerCase();

    // We use Promise.all to search them all simultaneously for speed
    const promises = publicLibraries.map(async (userId) => {
        try {
            // AssetType 13 = Decal
            const url = `https://inventory.roblox.com/v1/users/${userId}/inventory/13?limit=100&sortOrder=Desc`;
            const response = await axios.get(url);
            
            // Filter locally by name
            const matches = response.data.data.filter(item => 
                item.name && item.name.toLowerCase().includes(lowerQuery)
            );
            
            return matches;
        } catch (e) {
            return [];
        }
    });

    const results = await Promise.all(promises);
    
    // Flatten array
    results.forEach(arr => allResults.push(...arr));

    return allResults.map(item => ({
        id: item.assetId,
        name: item.name,
        creator: 'Public Library',
        assetType: 'Decal'
    }));
}

app.listen(PORT, () => {
  console.log(`🚀 API Ready on port ${PORT}`);
});
