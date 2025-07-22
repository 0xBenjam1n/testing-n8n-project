const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from current directory

// No storage - just temporary holding for real-time waiting
let currentIncomingData = null;
let currentIncomingPostsData = null;

// Endpoint to receive data from n8n
app.post('/receive-data', (req, res) => {
    console.log('📨 Received from n8n:', JSON.stringify(req.body, null, 2));
    
    // Store temporarily for real-time waiting (no permanent storage)
    currentIncomingData = {
        ...req.body,
        receivedAt: new Date().toISOString()
    };
    
    console.log(`📦 New data received and ready for pickup`);
    
    // Send success response back to n8n
    res.json({ 
        success: true, 
        message: 'Data received successfully'
    });
});

// New endpoint to receive posts data from n8n
app.post('/receive-posts', (req, res) => {
    console.log('📨 Received posts data from n8n:', JSON.stringify(req.body, null, 2));
    
    // Store temporarily for real-time waiting
    currentIncomingPostsData = {
        ...req.body,
        receivedAt: new Date().toISOString()
    };
    
    console.log(`📦 New posts data received and ready for pickup`);
    
    // Send success response back to n8n
    res.json({ 
        success: true, 
        message: 'Posts data received successfully'
    });
});

// API endpoint to get current incoming data (no storage, just current)
app.get('/api/received-data', (req, res) => {
    try {
        console.log(`📊 API request for current data`);
        
        if (currentIncomingData) {
            console.log(`📤 Sending current data to frontend`);
            res.json([currentIncomingData]); // Send as array to match original format
        } else {
            console.log(`📭 No current data available`);
            res.json([]);
        }
    } catch (error) {
        console.error('Error in /api/received-data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to get current incoming posts data
app.get('/api/received-posts', (req, res) => {
    try {
        console.log(`📊 API request for current posts data`);
        
        if (currentIncomingPostsData) {
            console.log(`📤 Sending current posts data to frontend`);
            res.json([currentIncomingPostsData]); // Send as array to match original format
        } else {
            console.log(`📭 No current posts data available`);
            res.json([]);
        }
    } catch (error) {
        console.error('Error in /api/received-posts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
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
        hasCurrentData: !!currentIncomingData,
        hasCurrentPostsData: !!currentIncomingPostsData,
        currentDataUsername: currentIncomingData?.userInformation?.username || 'none',
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

// Clear data endpoint (for testing)
app.delete('/api/clear-data', (req, res) => {
    try {
        currentIncomingData = null;
        currentIncomingPostsData = null;
        console.log('🗑️ Current data cleared');
        
        res.json({
            success: true,
            message: 'Current data cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing data:', error);
        res.status(500).json({ error: 'Error clearing data' });
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
            'DELETE /api/clear-data'
        ]
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
