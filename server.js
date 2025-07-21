const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Store received data in memory
let receivedData = [];
let postsData = [];

// Endpoint to receive data from n8n
app.post('/receive-data', (req, res) => {
    console.log('📨 Received from n8n:', req.body);
    
    // Store the data with timestamp
    const dataWithTimestamp = {
        ...req.body,
        receivedAt: new Date().toISOString()
    };
    
    receivedData.unshift(dataWithTimestamp);
    
    // Keep only last 10 entries
    if (receivedData.length > 10) {
        receivedData = receivedData.slice(0, 10);
    }
    
    res.json({ 
        success: true, 
        message: 'Data received successfully',
        dataCount: receivedData.length
    });
});

// Endpoint to receive posts data from n8n
app.post('/receive-posts', (req, res) => {
    console.log('📸 Received posts from n8n:', req.body);
    
    // Store the posts data with timestamp
    const dataWithTimestamp = {
        ...req.body,
        receivedAt: new Date().toISOString()
    };
    
    postsData.unshift(dataWithTimestamp);
    
    // Keep only last 10 entries
    if (postsData.length > 10) {
        postsData = postsData.slice(0, 10);
    }
    
    res.json({ 
        success: true, 
        message: 'Posts data received successfully',
        dataCount: postsData.length
    });
});

// API endpoint to get received data
app.get('/api/received-data', (req, res) => {
    res.json(receivedData);
});

// API endpoint to get posts data
app.get('/api/posts-data', (req, res) => {
    res.json(postsData);
});

// Main page
app.get('/', (req, res) => {
    res.json({
        message: 'Instagram Analyzer API',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: [
            'GET /',
            'POST /receive-data',
            'GET /api/received-data',
            'POST /receive-posts',
            'GET /api/posts-data',
            'GET /health',
            'DELETE /api/clear-data',
            'DELETE /api/clear-posts'
        ]
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        receivedDataCount: receivedData.length,
        postsDataCount: postsData.length
    });
});

// Clear data endpoints
app.delete('/api/clear-data', (req, res) => {
    receivedData = [];
    console.log('🗑️ Profile data cleared');
    res.json({ success: true, message: 'Profile data cleared successfully' });
});

app.delete('/api/clear-posts', (req, res) => {
    postsData = [];
    console.log('🗑️ Posts data cleared');
    res.json({ success: true, message: 'Posts data cleared successfully' });
});

// Handle 404 errors
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        availableEndpoints: [
            'GET /',
            'POST /receive-data',
            'GET /api/received-data',
            'POST /receive-posts',
            'GET /api/posts-data',
            'GET /health',
            'DELETE /api/clear-data',
            'DELETE /api/clear-posts'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Ready to receive data from n8n`);
});

module.exports = app;
