const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://oxbenjam1n.app.n8n.cloud"],
            fontSrc: ["'self'", "https:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const resultLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 requests per minute for result polling
    message: { error: 'Too many polling requests, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(generalLimiter);
app.use('/poll-result', resultLimiter);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for results (use Redis in production)
const resultStore = new Map();

// Cleanup old results every hour
setInterval(() => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, value] of resultStore.entries()) {
        if (now - value.timestamp > maxAge) {
            resultStore.delete(key);
        }
    }
}, 60 * 60 * 1000);

// Simple validation function with enhanced requestId security
function validateAndSanitizeResponse(data) {
    console.log('=== VALIDATION DEBUG ===');
    console.log('Raw received data:', JSON.stringify(data, null, 2));
    console.log('Data keys:', Object.keys(data || {}));
    console.log('Has check:', !!data.check);
    console.log('Has posts:', !!data.posts);
    console.log('Has highlights:', !!data.highlights);
    console.log('Has both:', !!data.both);
    
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Invalid data format' };
    }
    
    // Handle different wrapper types: "check", "posts", "highlights", "both"
    let actualData = data;
    let wrapperFound = 'none';
    
    if (data.check && typeof data.check === 'object') {
        actualData = data.check;
        wrapperFound = 'check';
    } else if (data.posts && typeof data.posts === 'object') {
        actualData = data.posts;
        wrapperFound = 'posts';
    } else if (data.highlights && typeof data.highlights === 'object') {
        actualData = data.highlights;
        wrapperFound = 'highlights';
    } else if (data.both && typeof data.both === 'object') {
        actualData = data.both;
        wrapperFound = 'both';
    }
    
    console.log('Wrapper found:', wrapperFound);
    console.log('Actual data:', JSON.stringify(actualData, null, 2));
    console.log('========================');
    
    const { requestId, result, status, message } = actualData;
    
    // Enhanced requestId validation for security
    if (!requestId) {
        return { valid: false, message: 'Missing requestId' };
    }
    
    // Convert to string and validate
    let stringRequestId = String(requestId).trim();
    
    // Security checks for requestId
    if (stringRequestId.length === 0) {
        return { valid: false, message: 'Empty requestId' };
    }
    
    if (stringRequestId.length > 50) {
        return { valid: false, message: 'RequestId too long' };
    }
    
    // Check for malicious patterns in requestId
    const maliciousPatterns = [
        /[<>]/g,                    // HTML tags
        /javascript:/i,             // JavaScript protocol
        /data:/i,                   // Data protocol
        /vbscript:/i,              // VBScript protocol
        /on\w+\s*=/i,              // Event handlers
        /\.\./,                     // Directory traversal
        /[\/\\]/,                   // Path separators
        /[\x00-\x1F\x7F]/,         // Control characters
        /[^\w\-]/                   // Only allow alphanumeric, underscore, hyphen
    ];
    
    for (const pattern of maliciousPatterns) {
        if (pattern.test(stringRequestId)) {
            return { valid: false, message: 'Invalid requestId format' };
        }
    }
    
    // Ensure requestId follows expected format (timestamp-randomstring)
    if (!/^\d{13}-[a-zA-Z0-9]{5,20}$/.test(stringRequestId)) {
        return { valid: false, message: 'RequestId does not match expected format' };
    }
    
    const sanitizedData = {
        requestId: stringRequestId,
        result: result || 'No result provided',
        status: status || 'unknown',
        message: message || 'No message provided',
        timestamp: Date.now()
    };
    
    return { valid: true, data: sanitizedData };
}

// Endpoint to receive data from n8n
app.post('/poll-result/:requestId', (req, res) => {
    try {
        console.log('\n=== N8N DATA RECEIVED ===');
        console.log('Request ID from URL:', req.params.requestId);
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Request headers:', req.headers);
        
        const requestId = req.params.requestId;
        const data = req.body;
        
        // Validate the incoming data
        const validation = validateAndSanitizeResponse(data);
        if (!validation.valid) {
            console.error('Validation failed:', validation.message);
            return res.status(400).json({ 
                success: false, 
                error: validation.message 
            });
        }
        
        console.log('Validation successful, storing data for requestId:', requestId);
        
        // Store the result
        resultStore.set(requestId, validation.data);
        
        console.log('Data stored successfully');
        console.log('Current store size:', resultStore.size);
        console.log('========================\n');
        
        res.json({ 
            success: true, 
            message: 'Data received and stored successfully' 
        });
        
    } catch (error) {
        console.error('Error processing n8n data:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Endpoint for polling results
app.get('/poll-result/:requestId', (req, res) => {
    try {
        const requestId = req.params.requestId;
        console.log('Polling request for ID:', requestId);
        
        // Security validation for requestId in polling
        if (!requestId || typeof requestId !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid requestId' 
            });
        }
        
        const trimmedId = requestId.trim();
        if (trimmedId.length === 0 || trimmedId.length > 50) {
            return res.status(400).json({ 
                success: false, 
                error: 'RequestId length invalid' 
            });
        }
        
        // Check for malicious patterns
        if (!/^\d{13}-[a-zA-Z0-9]{5,20}$/.test(trimmedId)) {
            return res.status(400).json({ 
                success: false, 
                error: 'RequestId format invalid' 
            });
        }
        
        const result = resultStore.get(trimmedId);
        
        if (result) {
            console.log('Result found for ID:', trimmedId);
            console.log('Returning result:', JSON.stringify(result, null, 2));
            
            // Remove the result after sending it (one-time use)
            resultStore.delete(trimmedId);
            
            res.json({
                success: true,
                data: result
            });
        } else {
            console.log('No result found for ID:', trimmedId);
            console.log('Available IDs in store:', Array.from(resultStore.keys()));
            
            // Return 202 to indicate processing is still ongoing
            res.status(202).json({
                success: false,
                message: 'Processing in progress'
            });
        }
        
    } catch (error) {
        console.error('Error polling result:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        activeResults: resultStore.size
    });
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
