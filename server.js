const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());

// Data storage
let receivedData = [];
let postsData = [];

// Basic routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'Server is running!',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.post('/receive-data', (req, res) => {
    receivedData.push(req.body);
    res.json({ success: true });
});

app.get('/api/received-data', (req, res) => {
    res.json(receivedData);
});

app.post('/receive-posts', (req, res) => {
    postsData.push(req.body);
    res.json({ success: true });
});

app.get('/api/posts-data', (req, res) => {
    res.json(postsData);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
