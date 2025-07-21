const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Data storage
let profileData = [];
let postsData = [];
let highlightsData = [];

// Basic routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'Instagram Analyzer API - Server is running!',
        timestamp: new Date().toISOString(),
        endpoints: [
            'GET /',
            'POST /receive-data',
            'GET /api/received-data',
            'POST /receive-posts',
            'GET /api/posts-data',
            'GET /health'
        ]
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', server: 'running' });
});

// Profile data endpoints
app.post('/receive-data', (req, res) => {
    console.log('Received profile data');
    profileData = req.body;
    res.json({ success: true, message: 'Profile data received' });
});

app.get('/api/received-data', (req, res) => {
    res.json(profileData || []);
});

// Posts data endpoints
app.post('/receive-posts', (req, res) => {
    console.log('Received posts data');
    postsData = req.body;
    res.json({ success: true, message: 'Posts data received' });
});

app.get('/api/posts-data', (req, res) => {
    res.json(postsData || []);
});

// Highlights data endpoints
app.post('/receive-highlights', (req, res) => {
    console.log('Received highlights data');
    highlightsData = req.body;
    res.json({ success: true, message: 'Highlights data received' });
});

app.get('/api/highlights-data', (req, res) => {
    res.json(highlightsData || []);
});

// Clear data endpoints
app.delete('/api/clear-data', (req, res) => {
    profileData = [];
    res.json({ success: true, message: 'Profile data cleared' });
});

// 404 handler
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
            'POST /receive-highlights',
            'GET /api/highlights-data',
            'GET /health',
            'DELETE /api/clear-data'
        ]
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
