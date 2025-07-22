const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from current directory

// Store received data in memory
let receivedData = [];
let receivedPostsData = []; // New storage for posts data

// Endpoint to receive data from n8n
app.post('/receive-data', (req, res) => {
    console.log('📨 Received from n8n:', req.body);
    
    // Store the data with timestamp
    const dataWithTimestamp = {
        ...req.body,
        receivedAt: new Date().toISOString()
    };
    
    receivedData.unshift(dataWithTimestamp); // Add to beginning of array
    
    // Keep only last 10 entries
    if (receivedData.length > 10) {
        receivedData = receivedData.slice(0, 10);
    }
    
    console.log(`📊 Total stored data entries: ${receivedData.length}`);
    
    // Send success response back to n8n
    res.json({ 
        success: true, 
        message: 'Data received successfully',
        dataCount: receivedData.length,
        timestamp: new Date().toISOString()
    });
});

// New endpoint to receive posts data from n8n
app.post('/receive-posts', (req, res) => {
    console.log('📨 Received posts data from n8n:', req.body);
    
    // Store the data with timestamp
    const dataWithTimestamp = {
        ...req.body,
        receivedAt: new Date().toISOString()
    };
    
    receivedPostsData.unshift(dataWithTimestamp); // Add to beginning of array
    
    // Keep only last 10 entries
    if (receivedPostsData.length > 10) {
        receivedPostsData = receivedPostsData.slice(0, 10);
    }
    
    console.log(`📊 Total stored posts entries: ${receivedPostsData.length}`);
    
    // Send success response back to n8n
    res.json({ 
        success: true, 
        message: 'Posts data received successfully',
        dataCount: receivedPostsData.length,
        timestamp: new Date().toISOString()
    });
});

// API endpoint to get received data
app.get('/api/received-data', (req, res) => {
    console.log(`📤 Sending ${receivedData.length} data entries to client`);
    res.json(receivedData);
});

// API endpoint to get received posts data
app.get('/api/received-posts', (req, res) => {
    console.log(`📤 Sending ${receivedPostsData.length} posts entries to client`);
    res.json(receivedPostsData);
});

// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        receivedDataCount: receivedData.length,
        receivedPostsDataCount: receivedPostsData.length,
        lastDataReceived: receivedData.length > 0 ? receivedData[0].receivedAt : null,
        lastPostsReceived: receivedPostsData.length > 0 ? receivedPostsData[0].receivedAt : null,
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

// Clear data endpoint (for testing and when starting new analysis)
app.delete('/api/clear-data', (req, res) => {
    const previousDataCount = receivedData.length;
    const previousPostsCount = receivedPostsData.length;
    
    receivedData = [];
    receivedPostsData = [];
    
    console.log(`🗑️ Data cleared - Previous: ${previousDataCount} data entries, ${previousPostsCount} posts entries`);
    
    res.json({
        success: true,
        message: 'All data cleared successfully',
        clearedData: {
            dataEntries: previousDataCount,
            postsEntries: previousPostsCount
        },
        timestamp: new Date().toISOString()
    });
});

// Debug endpoint to see raw data (useful for development)
app.get('/api/debug', (req, res) => {
    res.json({
        receivedData: receivedData,
        receivedPostsData: receivedPostsData,
        counts: {
            data: receivedData.length,
            posts: receivedPostsData.length
        },
        timestamp: new Date().toISOString()
    });
});

// CORS middleware for cross-origin requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Handle 404 errors
app.use((req, res) => {
    console.log(`🔍 404 - ${req.method} ${req.url}`);
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.url}`,
        availableEndpoints: [
            'GET /',
            'POST /receive-data',
            'POST /receive-posts',
            'GET /api/received-data',
            'GET /api/received-posts',
            'GET /health',
            'DELETE /api/clear-data',
            'GET /api/debug'
        ],
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 n8n should POST to: /receive-data or /receive-posts`);
    console.log(`🌐 Main page: http://localhost:${PORT}`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Available endpoints:`);
    console.log(`   GET  / - Main webpage`);
    console.log(`   POST /receive-data - Receive Instagram data from n8n`);
    console.log(`   POST /receive-posts - Receive Instagram posts data from n8n`);
    console.log(`   GET  /api/received-data - Get stored data`);
    console.log(`   GET  /api/received-posts - Get stored posts data`);
    console.log(`   GET  /health - Server health and stats`);
    console.log(`   DELETE /api/clear-data - Clear stored data`);
    console.log(`   GET  /api/debug - Debug endpoint to see raw data`);
    console.log(`💾 Data storage initialized - Ready to receive from n8n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Export for deployment compatibility
module.exports = app;
