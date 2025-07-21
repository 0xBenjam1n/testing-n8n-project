const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Data storage variables
let receivedData = []; // Your existing profile data storage
let postsData = []; // New posts data storage

// Your existing endpoints (keep these exactly as they were)
app.get('/', (req, res) => {
    // Your existing home route code
    res.json({ message: 'API is running' });
});

app.post('/receive-data', (req, res) => {
    // Your existing receive-data code
    receivedData = req.body;
    res.json({ success: true });
});

app.get('/api/received-data', (req, res) => {
    // Your existing received-data code
    res.json(receivedData || []);
});

app.get('/health', (req, res) => {
    // Your existing health check code
    res.json({ status: 'OK' });
});

app.delete('/api/clear-data', (req, res) => {
    // Your existing clear-data code
    receivedData = [];
    res.json({ success: true });
});

// NEW POSTS ENDPOINTS - Add these to your existing server
app.post('/receive-posts', (req, res) => {
    postsData = req.body;
    console.log('Posts data received');
    res.json({ success: true, message: 'Posts data received' });
});

app.get('/api/posts-data', (req, res) => {
    res.json(postsData || []);
});

// Your existing 404 handler (update the available endpoints list)
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        availableEndpoints: [
            'GET /',
            'POST /receive-data',
            'GET /api/received-data',
            'POST /receive-posts', // Add this line
            'GET /api/posts-data',  // Add this line
            'GET /health',
            'DELETE /api/clear-data'
        ]
    });
});

// Your existing server start code
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
