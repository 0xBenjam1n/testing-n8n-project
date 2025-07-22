const express = require('express');
const path = require('path');
const cors = require('cors'); // Add CORS support
const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '50mb' })); // Increase JSON payload limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Increase URL-encoded payload limit
app.use(express.static(__dirname)); // Serve static files from current directory

// Store received data in memory
let receivedData = [];
let receivedPostsData = []; // New storage for posts data

// Endpoint to receive data from n8n
app.post('/receive-data', (req, res) => {
    try {
        console.log('📨 Received from n8n:', JSON.stringify(req.body, null, 2));
        
        // Validate that we received some data
        if (!req.body || Object.keys(req.body).length === 0) {
            console.warn('⚠️ Empty request body received');
            return res.status(400).json({
                success: false,
                message: 'Empty request body',
                timestamp: new Date().toISOString()
            });
        }
        
        // Store the data with timestamp
        const dataWithTimestamp = {
            ...req.body,
            receivedAt: new Date().toISOString()
        };
        
        receivedData.unshift(dataWithTimestamp); // Add to beginning of array
        
        console.log(`✅ Data stored successfully. Total entries: ${receivedData.length}`);
        
        // Send success response back to n8n
        res.json({ 
            success: true, 
            message: 'Data received successfully',
            dataCount: receivedData.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error in /receive-data:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// New endpoint to receive posts data from n8n
app.post('/receive-posts', (req, res) => {
    try {
        console.log('📨 Received posts data from n8n:', JSON.stringify(req.body, null, 2));
        
        // Validate that we received some data
        if (!req.body || Object.keys(req.body).length === 0) {
            console.warn('⚠️ Empty request body received for posts');
            return res.status(400).json({
                success: false,
                message: 'Empty request body',
                timestamp: new Date().toISOString()
            });
        }
        
        // Store the data with timestamp
        const dataWithTimestamp = {
            ...req.body,
            receivedAt: new Date().toISOString()
        };
        
        receivedPostsData.unshift(dataWithTimestamp); // Add to beginning of array
        
        console.log(`✅ Posts data stored successfully. Total entries: ${receivedPostsData.length}`);
        
        // Send success response back to n8n
        res.json({ 
            success: true, 
            message: 'Posts data received successfully',
            dataCount: receivedPostsData.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error in /receive-posts:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API endpoint to get received data
app.get('/api/received-data', (req, res) => {
    res.json(receivedData);
});

// API endpoint to get received posts data
app.get('/api/received-posts', (req, res) => {
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
    receivedData = [];
    receivedPostsData = [];
    console.log('🗑️ All data cleared');
    
    res.json({
        success: true,
        message: 'All data cleared successfully'
    });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    
    // Handle different types of errors
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON in request body',
            message: 'The request body contains malformed JSON',
            timestamp: new Date().toISOString()
        });
    }
    
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            error: 'Request body too large',
            message: 'The request body exceeds the maximum allowed size',
            timestamp: new Date().toISOString()
        });
    }
    
    // Generic error response
    res.status(500).json({
        success: false,
        error: 'Something went wrong!',
        message: err.message || 'Internal server error',
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
