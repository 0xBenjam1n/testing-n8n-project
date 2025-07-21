const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(express.json({ limit: '50mb' })); // Increased limit for large data
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.static(__dirname)); // Serve static files from current directory

// Enhanced logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`[${timestamp}] Body size:`, JSON.stringify(req.body).length, 'characters');
    }
    next();
});

// Store received data in memory with automatic cleanup
let receivedData = [];
let receivedPostsData = [];

// Data cleanup function - removes data older than 30 minutes
function cleanupOldData() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const oldDataCount = receivedData.length;
    const oldPostsCount = receivedPostsData.length;
    
    receivedData = receivedData.filter(item => 
        new Date(item.receivedAt) > thirtyMinutesAgo
    );
    
    receivedPostsData = receivedPostsData.filter(item => 
        new Date(item.receivedAt) > thirtyMinutesAgo
    );
    
    if (oldDataCount !== receivedData.length || oldPostsCount !== receivedPostsData.length) {
        console.log(`🗑️ Cleaned up old data: ${oldDataCount - receivedData.length} profile records, ${oldPostsCount - receivedPostsData.length} posts records`);
    }
}

// Run cleanup every 10 minutes
setInterval(cleanupOldData, 10 * 60 * 1000);

// Enhanced data storage function
function storeData(data, type = 'profile') {
    const dataWithTimestamp = {
        ...data,
        receivedAt: new Date().toISOString(),
        sessionId: data.sessionId || 'unknown',
        type: type,
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
    
    if (type === 'posts') {
        receivedPostsData.unshift(dataWithTimestamp);
        // Keep only last 50 entries for posts
        if (receivedPostsData.length > 50) {
            receivedPostsData = receivedPostsData.slice(0, 50);
        }
        console.log(`📊 Stored posts data. Total posts records: ${receivedPostsData.length}`);
    } else {
        receivedData.unshift(dataWithTimestamp);
        // Keep only last 20 entries for profile data
        if (receivedData.length > 20) {
            receivedData = receivedData.slice(0, 20);
        }
        console.log(`👤 Stored profile data. Total profile records: ${receivedData.length}`);
    }
    
    return dataWithTimestamp;
}

// Endpoint to receive profile data from n8n
app.post('/receive-data', (req, res) => {
    try {
        console.log('📨 Received profile data from n8n');
        console.log('📊 Data keys:', Object.keys(req.body));
        
        if (req.body.userInformation) {
            console.log('✅ Profile found:', req.body.userInformation.username || 'unknown');
        }
        
        const storedData = storeData(req.body, 'profile');
        
        // Send success response back to n8n
        res.json({ 
            success: true, 
            message: 'Profile data received successfully',
            dataId: storedData.id,
            dataCount: receivedData.length,
            timestamp: storedData.receivedAt
        });
        
    } catch (error) {
        console.error('❌ Error processing profile data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process profile data',
            message: error.message
        });
    }
});

// Endpoint to receive posts data from n8n
app.post('/receive-posts', (req, res) => {
    try {
        console.log('📨 Received posts data from n8n');
        console.log('📊 Data size:', JSON.stringify(req.body).length, 'characters');
        
        // Check if it's an array of posts
        if (Array.isArray(req.body)) {
            console.log('✅ Posts array found with', req.body.length, 'posts');
        } else if (req.body.posts) {
            console.log('✅ Posts object found with', req.body.posts.length || 'unknown', 'posts');
        } else {
            console.log('📋 Posts data structure:', Object.keys(req.body));
        }
        
        const storedData = storeData(req.body, 'posts');
        
        // Send success response back to n8n
        res.json({ 
            success: true, 
            message: 'Posts data received successfully',
            dataId: storedData.id,
            dataCount: receivedPostsData.length,
            timestamp: storedData.receivedAt
        });
        
    } catch (error) {
        console.error('❌ Error processing posts data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process posts data',
            message: error.message
        });
    }
});

// API endpoint to get received profile data
app.get('/api/received-data', (req, res) => {
    try {
        const { recent, sessionId, limit } = req.query;
        let data = [...receivedData];
        
        // Filter by session if provided
        if (sessionId) {
            data = data.filter(item => item.sessionId === sessionId);
        }
        
        // Filter recent data (last 10 minutes) if requested
        if (recent === 'true') {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            data = data.filter(item => new Date(item.receivedAt) > tenMinutesAgo);
        }
        
        // Limit results
        const limitNum = parseInt(limit) || 10;
        data = data.slice(0, limitNum);
        
        console.log(`📤 Sending ${data.length} profile records`);
        res.json(data);
    } catch (error) {
        console.error('❌ Error fetching profile data:', error);
        res.status(500).json({ error: 'Failed to fetch profile data' });
    }
});

// API endpoint to get received posts data
app.get('/api/received-posts', (req, res) => {
    try {
        const { recent, sessionId, limit } = req.query;
        let data = [...receivedPostsData];
        
        // Filter by session if provided
        if (sessionId) {
            data = data.filter(item => item.sessionId === sessionId);
        }
        
        // Filter recent data (last 10 minutes) if requested
        if (recent === 'true') {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            data = data.filter(item => new Date(item.receivedAt) > tenMinutesAgo);
        }
        
        // Limit results
        const limitNum = parseInt(limit) || 10;
        data = data.slice(0, limitNum);
        
        console.log(`📤 Sending ${data.length} posts records`);
        res.json(data);
    } catch (error) {
        console.error('❌ Error fetching posts data:', error);
        res.status(500).json({ error: 'Failed to fetch posts data' });
    }
});

// Serve the main HTML page
app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'index.html'));
    } catch (error) {
        console.error('❌ Error serving index.html:', error);
        res.status(500).send('Error loading page');
    }
});

// Enhanced health check endpoint
app.get('/health', (req, res) => {
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: {
            seconds: Math.floor(uptime),
            formatted: `${uptimeHours}h ${uptimeMinutes}m`
        },
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        },
        data: {
            profileRecords: receivedData.length,
            postsRecords: receivedPostsData.length,
            oldestProfileData: receivedData.length > 0 ? receivedData[receivedData.length - 1].receivedAt : null,
            oldestPostsData: receivedPostsData.length > 0 ? receivedPostsData[receivedPostsData.length - 1].receivedAt : null
        },
        endpoints: {
            main: '/',
            receiveData: '/receive-data',
            receivePosts: '/receive-posts',
            apiData: '/api/received-data',
            apiPosts: '/api/received-posts',
            health: '/health',
            clearData: '/api/clear-data'
        }
    });
});

// Clear data endpoint with enhanced options
app.delete('/api/clear-data', (req, res) => {
    try {
        const { type, sessionId } = req.query;
        let clearedProfile = 0;
        let clearedPosts = 0;
        
        if (sessionId) {
            // Clear data for specific session
            const oldProfileLength = receivedData.length;
            const oldPostsLength = receivedPostsData.length;
            
            receivedData = receivedData.filter(item => item.sessionId !== sessionId);
            receivedPostsData = receivedPostsData.filter(item => item.sessionId !== sessionId);
            
            clearedProfile = oldProfileLength - receivedData.length;
            clearedPosts = oldPostsLength - receivedPostsData.length;
            
            console.log(`🗑️ Cleared session ${sessionId}: ${clearedProfile} profile records, ${clearedPosts} posts records`);
        } else if (type === 'profile') {
            // Clear only profile data
            clearedProfile = receivedData.length;
            receivedData = [];
            console.log(`🗑️ Cleared ${clearedProfile} profile records`);
        } else if (type === 'posts') {
            // Clear only posts data
            clearedPosts = receivedPostsData.length;
            receivedPostsData = [];
            console.log(`🗑️ Cleared ${clearedPosts} posts records`);
        } else {
            // Clear all data
            clearedProfile = receivedData.length;
            clearedPosts = receivedPostsData.length;
            receivedData = [];
            receivedPostsData = [];
            console.log(`🗑️ Cleared all data: ${clearedProfile} profile records, ${clearedPosts} posts records`);
        }
        
        res.json({
            success: true,
            message: 'Data cleared successfully',
            cleared: {
                profileRecords: clearedProfile,
                postsRecords: clearedPosts
            },
            remaining: {
                profileRecords: receivedData.length,
                postsRecords: receivedPostsData.length
            }
        });
    } catch (error) {
        console.error('❌ Error clearing data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear data',
            message: error.message
        });
    }
});

// Get specific data by ID
app.get('/api/data/:id', (req, res) => {
    try {
        const { id } = req.params;
        const allData = [...receivedData, ...receivedPostsData];
        const item = allData.find(data => data.id === id);
        
        if (item) {
            res.json(item);
        } else {
            res.status(404).json({ error: 'Data not found' });
        }
    } catch (error) {
        console.error('❌ Error fetching specific data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Debug endpoint to see all data structure
app.get('/debug/data', (req, res) => {
    res.json({
        timestamp: new Date().toISOString(),
        profileData: {
            count: receivedData.length,
            samples: receivedData.slice(0, 2).map(item => ({
                id: item.id,
                receivedAt: item.receivedAt,
                type: item.type,
                hasUserInfo: !!item.userInformation,
                keys: Object.keys(item)
            }))
        },
        postsData: {
            count: receivedPostsData.length,
            samples: receivedPostsData.slice(0, 2).map(item => ({
                id: item.id,
                receivedAt: item.receivedAt,
                type: item.type,
                dataSize: JSON.stringify(item).length,
                keys: Object.keys(item)
            }))
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// Handle 404 errors
app.use((req, res) => {
    console.log(`⚠️ 404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.url}`,
        availableEndpoints: [
            'GET /',
            'POST /receive-data',
            'POST /receive-posts',
            'GET /api/received-data',
            'GET /api/received-posts',
            'GET /api/data/:id',
            'GET /health',
            'GET /debug/data',
            'DELETE /api/clear-data'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 Instagram Analyzer Server Started');
    console.log('═'.repeat(50));
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌐 Main page: http://localhost:${PORT}`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Debug endpoint: http://localhost:${PORT}/debug/data`);
    console.log('═'.repeat(50));
    console.log('📋 Available endpoints:');
    console.log('   GET  / - Main webpage');
    console.log('   POST /receive-data - Receive Instagram profile data from n8n');
    console.log('   POST /receive-posts - Receive Instagram posts data from n8n');
    console.log('   GET  /api/received-data - Get stored profile data');
    console.log('   GET  /api/received-posts - Get stored posts data');
    console.log('   GET  /api/data/:id - Get specific data by ID');
    console.log('   GET  /health - Server health and stats');
    console.log('   GET  /debug/data - Debug data structure');
    console.log('   DELETE /api/clear-data - Clear stored data');
    console.log('═'.repeat(50));
    console.log('🎯 n8n should POST to:');
    console.log(`   Profile data: http://localhost:${PORT}/receive-data`);
    console.log(`   Posts data: http://localhost:${PORT}/receive-posts`);
    console.log('═'.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    cleanupOldData();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    cleanupOldData();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export for deployment compatibility
module.exports = app;
