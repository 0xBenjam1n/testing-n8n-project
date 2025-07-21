const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from current directory

// Store received data in memory
let receivedData = [];

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
    
    // Send success response back to n8n
    res.json({ 
        success: true, 
        message: 'Data received successfully',
        dataCount: receivedData.length
    });
});

// API endpoint to get received data
app.get('/api/received-data', (req, res) => {
    res.json(receivedData);
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
        endpoints: {
            main: '/',
            receiveData: '/receive-data',
            apiData: '/api/received-data',
            health: '/health'
        }
    });
});

// Clear data endpoint (for testing)
app.delete('/api/clear-data', (req, res) => {
    receivedData = [];
    console.log('🗑️ Data cleared');
    
    res.json({
        success: true,
        message: 'Data cleared successfully'
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
            'GET /api/received-data',
            'GET /health',
            'DELETE /api/clear-data'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 n8n should POST to: /receive-data`);
    console.log(`🌐 Main page: http://localhost:${PORT}`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Available endpoints:`);
    console.log(`   GET  / - Main webpage`);
    console.log(`   POST /receive-data - Receive Instagram data from n8n`);
    console.log(`   GET  /api/received-data - Get stored data`);
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
