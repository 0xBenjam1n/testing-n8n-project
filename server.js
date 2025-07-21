const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Data storage
let profileData = [];
let postsData = [];
let highlightsData = [];

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Home route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Instagram Analyzer API',
        endpoints: [
            'GET /',
            'POST /receive-data',
            'GET /api/received-data',
            'POST /receive-posts',
            'GET /api/posts-data',
            'POST /receive-highlights',
            'GET /api/highlights-data',
            'GET /health',
            'DELETE /api/clear-data',
            'DELETE /api/clear-all-data'
        ]
    });
});

// Profile data endpoints (existing)
app.post('/receive-data', (req, res) => {
    try {
        profileData = req.body;
        console.log('Profile data received:', JSON.stringify(profileData).substring(0, 200) + '...');
        res.json({ success: true, message: 'Profile data received' });
    } catch (error) {
        console.error('Error receiving profile data:', error);
        res.status(500).json({ error: 'Failed to receive profile data' });
    }
});

app.get('/api/received-data', (req, res) => {
    try {
        res.json(profileData || []);
    } catch (error) {
        console.error('Error sending profile data:', error);
        res.status(500).json({ error: 'Failed to send profile data' });
    }
});

// Posts data endpoints (new)
app.post('/receive-posts', (req, res) => {
    try {
        postsData = req.body;
        console.log('Posts data received:', JSON.stringify(postsData).substring(0, 200) + '...');
        res.json({ success: true, message: 'Posts data received' });
    } catch (error) {
        console.error('Error receiving posts data:', error);
        res.status(500).json({ error: 'Failed to receive posts data' });
    }
});

app.get('/api/posts-data', (req, res) => {
    try {
        res.json(postsData || []);
    } catch (error) {
        console.error('Error sending posts data:', error);
        res.status(500).json({ error: 'Failed to send posts data' });
    }
});

// Highlights data endpoints (future ready)
app.post('/receive-highlights', (req, res) => {
    try {
        highlightsData = req.body;
        console.log('Highlights data received:', JSON.stringify(highlightsData).substring(0, 200) + '...');
        res.json({ success: true, message: 'Highlights data received' });
    } catch (error) {
        console.error('Error receiving highlights data:', error);
        res.status(500).json({ error: 'Failed to receive highlights data' });
    }
});

app.get('/api/highlights-data', (req, res) => {
    try {
        res.json(highlightsData || []);
    } catch (error) {
        console.error('Error sending highlights data:', error);
        res.status(500).json({ error: 'Failed to send highlights data' });
    }
});

// Clear data endpoints
app.delete('/api/clear-data', (req, res) => {
    try {
        profileData = [];
        console.log('Profile data cleared');
        res.json({ success: true, message: 'Profile data cleared' });
    } catch (error) {
        console.error('Error clearing profile data:', error);
        res.status(500).json({ error: 'Failed to clear profile data' });
    }
});

app.delete('/api/clear-all-data', (req, res) => {
    try {
        profileData = [];
        postsData = [];
        highlightsData = [];
        console.log('All data cleared');
        res.json({ success: true, message: 'All data cleared' });
    } catch (error) {
        console.error('Error clearing all data:', error);
        res.status(500).json({ error: 'Failed to clear all data' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Handle 404
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
            'DELETE /api/clear-data',
            'DELETE /api/clear-all-data'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Available endpoints:`);
    console.log(`   GET  / - API info`);
    console.log(`   POST /receive-data - Receive profile data`);
    console.log(`   GET  /api/received-data - Get profile data`);
    console.log(`   POST /receive-posts - Receive posts data`);
    console.log(`   GET  /api/posts-data - Get posts data`);
    console.log(`   POST /receive-highlights - Receive highlights data`);
    console.log(`   GET  /api/highlights-data - Get highlights data`);
    console.log(`   GET  /health - Health check`);
    console.log(`   DELETE /api/clear-data - Clear profile data`);
    console.log(`   DELETE /api/clear-all-data - Clear all data`);
});
