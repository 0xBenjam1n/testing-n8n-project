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
    if (!/^\d{13}-[a-zA-Z0-9]{5const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Store responses by request ID with TTL
const responses = new Map();
const RESPONSE_TTL = 30 * 60 * 1000; // 30 minutes

// Middleware for parsing JSON
app.use(express.json({ limit: '1mb' }));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Rate limiting for receive-data endpoint
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 20; // max 20 requests per minute per IP

function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, []);
    }
    
    const requests = rateLimitMap.get(ip);
    // Remove old requests
    const validRequests = requests.filter(time => time > windowStart);
    rateLimitMap.set(ip, validRequests);
    
    return validRequests.length < RATE_LIMIT_MAX;
}

// Clean up old responses and rate limit data
setInterval(() => {
    const now = Date.now();
    
    // Clean up old responses
    for (const [key, value] of responses.entries()) {
        if (now - value.timestamp > RESPONSE_TTL) {
            responses.delete(key);
        }
    }
    
    // Clean up old rate limit data
    const windowStart = now - RATE_LIMIT_WINDOW;
    for (const [ip, requests] of rateLimitMap.entries()) {
        const validRequests = requests.filter(time => time > windowStart);
        if (validRequests.length === 0) {
            rateLimitMap.delete(ip);
        } else {
            rateLimitMap.set(ip, validRequests);
        }
    }
}, 5 * 60 * 1000);

// Serve static files from root directory
app.use(express.static(__dirname));

// Simple validation function with enhanced requestId security
function validateAndSanitizeResponse(data) {
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Invalid data format' };
    }
    
    // Handle different wrapper types: "check", "posts", "highlights", "both"
    let actualData = data;
    if (data.check && typeof data.check === 'object') {
        actualData = data.check;
    } else if (data.posts && typeof data.posts === 'object') {
        actualData = data.posts;
    } else if (data.highlights && typeof data.highlights === 'object') {
        actualData = data.highlights;
    } else if (data.both && typeof data.both === 'object') {
        actualData = data.both;
    }
    
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
app.post('/receive-data', (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded'
        });
    }
    
    rateLimitMap.get(clientIP).push(Date.now());
    
    try {
        const validation = validateAndSanitizeResponse(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Bad Request',
                message: validation.message
            });
        }
        
        const sanitizedData = validation.data;
        responses.set(sanitizedData.requestId, sanitizedData);
        
        console.log(`Stored response for requestId: ${sanitizedData.requestId}`);
        
        res.status(200).json({
            success: true,
            message: 'Data received successfully',
            requestId: sanitizedData.requestId
        });
        
    } catch (error) {
        console.error('Error processing received data:', error.message);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to process data'
        });
    }
});

// Alternative endpoint for n8n (if configured to send to poll-result)
app.post('/poll-result/:requestId', (req, res) => {
    const { requestId } = req.params;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded'
        });
    }
    
    rateLimitMap.get(clientIP).push(Date.now());
    
    try {
        const bodyWithRequestId = {
            ...req.body,
            requestId: requestId
        };
        
        const validation = validateAndSanitizeResponse(bodyWithRequestId);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Bad Request',
                message: validation.message
            });
        }
        
        const sanitizedData = validation.data;
        responses.set(sanitizedData.requestId, sanitizedData);
        
        console.log(`Stored response for requestId: ${sanitizedData.requestId}`);
        
        res.status(200).json({
            success: true,
            message: 'Data received successfully',
            requestId: sanitizedData.requestId
        });
        
    } catch (error) {
        console.error('Error processing received data:', error.message);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to process data'
        });
    }
});

// Endpoint to poll for results by requestId (with security validation)
app.get('/poll-result/:requestId', (req, res) => {
    const { requestId } = req.params;
    
    // Security: Validate requestId format from URL parameter
    if (!requestId || typeof requestId !== 'string') {
        return res.status(400).json({
            error: 'Invalid requestId parameter'
        });
    }
    
    const trimmedRequestId = requestId.trim();
    
    // Security checks for URL parameter
    if (trimmedRequestId.length === 0 || trimmedRequestId.length > 50) {
        return res.status(400).json({
            error: 'Invalid requestId length'
        });
    }
    
    // Check for malicious patterns in URL requestId
    const maliciousPatterns = [
        /[<>]/g,                    // HTML tags
        /javascript:/i,             // JavaScript protocol
        /data:/i,                   // Data protocol
        /vbscript:/i,              // VBScript protocol
        /on\w+\s*=/i,              // Event handlers
        /\.\./,                     // Directory traversal
        /[\/\\]/,                   // Path separators (except the one in URL)
        /[\x00-\x1F\x7F]/,         // Control characters
        /[^\w\-]/                   // Only allow alphanumeric, underscore, hyphen
    ];
    
    for (const pattern of maliciousPatterns) {
        if (pattern.test(trimmedRequestId)) {
            return res.status(400).json({
                error: 'Invalid requestId format'
            });
        }
    }
    
    // Ensure requestId follows expected format
    if (!/^\d{13}-[a-zA-Z0-9]{5,20}$/.test(trimmedRequestId)) {
        return res.status(400).json({
            error: 'RequestId does not match expected format'
        });
    }
    
    console.log(`Polling for requestId: ${trimmedRequestId}`);
    
    const response = responses.get(trimmedRequestId);
    
    if (response) {
        console.log(`Found response for ${trimmedRequestId}`);
        
        res.status(200).json({
            success: true,
            data: {
                result: response.result,
                status: response.status,
                message: response.message,
                timestamp: response.timestamp
            }
        });
    } else {
        res.status(202).json({
            success: false,
            message: 'Result not ready yet'
        });
    }
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        activeResponses: responses.size
    });
});

// Debug route
app.get('/debug', (req, res) => {
    const fs = require('fs');
    const rootPath = __dirname;
    
    try {
        const files = fs.readdirSync(rootPath);
        res.json({
            rootPath,
            files,
            indexExists: fs.existsSync(path.join(rootPath, 'index.html')),
            activeResponses: responses.size,
            storedKeys: Array.from(responses.keys())
        });
    } catch (error) {
        res.json({ error: error.message, rootPath });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    
    if (require('fs').existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.send('<h1>File not found</h1><p>Please make sure index.html exists in the root directory.</p>');
    }
});

// Handle 404s
app.use((req, res) => {
    res.status(404).send('<h1>404 - Page Not Found</h1>');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
