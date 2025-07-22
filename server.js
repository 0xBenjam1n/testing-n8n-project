const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from current directory

// Endpoint to receive data from n8n
app.post('/receive-data', (req, res) => {
    console.log('📨 Received from n8n:', req.body);
    
    // Send success response back to n8n
    res.json({ 
        success: true, 
        message: 'Data received successfully',
        timestamp: new Date().toISOString()
    });
});

// New endpoint to receive posts data from n8n
app.post('/receive-posts', (req, res) => {
    console.log('📨 Received posts data from n8n:', req.body);
    
    // Send success response back to n8n
    res.json({ 
        success: true, 
        message: 'Posts data received successfully',
        timestamp: new Date().toISOString()
    });
});

// API endpoint to get received data (returns empty for now)
app.get('/api/received-data', (req, res) => {
    res.json([]);
});

// API endpoint to get received posts data (returns empty for now)
app.get('/api/received-posts', (req, res) => {
    res.json([]);
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
        endpoints: {
            main: '/',
            receiveData: '/receive-data',
            receivePosts: '/receive-posts',
            apiData: '/api/received-data',
            apiPosts: '/api/received-posts',
            health: '/health'
        }
    });
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
            'GET /health'
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
