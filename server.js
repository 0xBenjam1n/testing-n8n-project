const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from current directory

// Store received data in memory
let receivedData = [];
let receivedPostsData = []; // New storage for posts data

// Helper function to extract username from data
function extractUsername(data) {
    try {
        // Try different possible username fields
        if (data.username) return data.username.toLowerCase();
        if (data.userInformation?.username) return data.userInformation.username.toLowerCase();
        if (data.profile?.username) return data.profile.username.toLowerCase();
        
        // Try to extract from nested objects
        const jsonStr = JSON.stringify(data).toLowerCase();
        const usernameMatch = jsonStr.match(/"username":\s*"([^"]+)"/);
        if (usernameMatch) return usernameMatch[1];
        
        return null;
    } catch (error) {
        console.warn('Error extracting username:', error);
        return null;
    }
}

// Endpoint to receive data from n8n
app.post('/receive-data', (req, res) => {
    console.log('📨 Received from n8n:', req.body);
    
    // Store the data with timestamp
    const dataWithTimestamp = {
        ...req.body,
        receivedAt: new Date().toISOString()
    };
    
    receivedData.unshift(dataWithTimestamp); // Add to beginning of array
    
    // Send success response back to n8n
    res.json({ 
        success: true, 
        message: 'Data received successfully',
        dataCount: receivedData.length
    });
});

// New endpoint to receive posts data from n8n
app.post('/receive-posts', (req, res) => {
    console.log('📨 Received posts data from n8n:', req.body);
    
    // Store the data with timestamp
    const dataWithTimestamp = {
        ...req.body,
        receivedAt: new Date().toISOString()
    };
    
    receivedPostsData.unshift(dataWithTimestamp); // Add to beginning of array
    
    // Send success response back to n8n
    res.json({ 
        success: true, 
        message: 'Posts data received successfully',
        dataCount: receivedPostsData.length
    });
});

// API endpoint to get received data with optional username filtering
app.get('/api/received-data', (req, res) => {
    try {
        const requestedUsername = req.query.username;
        
        if (requestedUsername) {
            console.log(`🔍 Filtering data for username: ${requestedUsername}`);
            
            // Filter for specific username
            const filteredData = receivedData.filter(item => {
                const username = extractUsername(item);
                return username && username === requestedUsername.toLowerCase();
            });
            
            console.log(`Found ${filteredData.length} items for ${requestedUsername}`);
            res.json(filteredData);
        } else {
            res.json(receivedData);
        }
    } catch (error) {
        console.error('Error in /api/received-data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to get received posts data with optional username filtering
app.get('/api/received-posts', (req, res) => {
    try {
        const requestedUsername = req.query.username;
        
        if (requestedUsername) {
            console.log(`🔍 Filtering posts data for username: ${requestedUsername}`);
            
            // Filter for specific username
            const filteredData = receivedPostsData.filter(item => {
                const username = extractUsername(item);
                return username && username === requestedUsername.toLowerCase();
            });
            
            console.log(`Found ${filteredData.length} posts items for ${requestedUsername}`);
            res.json(filteredData);
        } else {
            res.json(receivedPostsData);
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
    try {
        receivedData = [];
        receivedPostsData = [];
        console.log('🗑️ All data cleared');
        
        res.json({
            success: true,
            message: 'All data cleared successfully'
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
