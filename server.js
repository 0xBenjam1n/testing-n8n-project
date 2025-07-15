const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from current directory

// Store received data in memory (for demo purposes)
let receivedData = [];
let confirmationStatus = {}; // Store confirmation status by session/username

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

// API endpoint to get received data (for real-time updates)
app.get('/api/received-data', (req, res) => {
    res.json(receivedData);
});

// API endpoint for confirmation status (for n8n to check via polling - backup method)
app.get('/api/confirmation', (req, res) => {
    const username = req.query.username;
    const sessionId = req.query.session_id;
    
    // Check if confirmation exists
    const key = username || sessionId || 'latest';
    const isConfirmed = confirmationStatus[key] || false;
    
    res.json({
        confirmed: isConfirmed,
        username: username,
        session_id: sessionId,
        timestamp: new Date().toISOString()
    });
    
    // Optional: Clear confirmation after reading
    if (isConfirmed) {
        delete confirmationStatus[key];
    }
});

// API endpoint to set confirmation (backup method - not used with direct webhook)
app.post('/api/set-confirmation', (req, res) => {
    const { username, session_id, confirmed } = req.body;
    const key = username || session_id || 'latest';
    
    confirmationStatus[key] = confirmed;
    
    console.log(`📝 Confirmation set for ${key}:`, confirmed);
    
    res.json({
        success: true,
        message: 'Confirmation status updated',
        key: key,
        confirmed: confirmed
    });
});

// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index3.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        receivedDataCount: receivedData.length,
        confirmationCount: Object.keys(confirmationStatus).length,
        endpoints: {
            main: '/',
            receiveData: '/receive-data',
            apiData: '/api/received-data',
            confirmation: '/api/confirmation',
            setConfirmation: '/api/set-confirmation',
            health: '/health'
        }
    });
});

// Endpoint to clear all data (for testing/debugging)
app.delete('/api/clear-data', (req, res) => {
    receivedData = [];
    confirmationStatus = {};
    
    console.log('🗑️ All data cleared');
    
    res.json({
        success: true,
        message: 'All data cleared successfully',
        clearedItems: {
            receivedData: 'cleared',
            confirmationStatus: 'cleared'
        }
    });
});

// Error handling middleware
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
            'GET /api/confirmation',
            'POST /api/set-confirmation',
            'GET /health',
            'DELETE /api/clear-data'
        ],
        timestamp: new Date().toISOString()
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
    console.log(`   GET  /api/confirmation - Check confirmation status`);
    console.log(`   POST /api/set-confirmation - Set confirmation status`);
    console.log(`   GET  /health - Server health and stats`);
    console.log(`   DELETE /api/clear-data - Clear all stored data`);
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

// Export for Vercel/Railway compatibility
module.exports = app;
