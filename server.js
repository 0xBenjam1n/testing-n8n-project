// Security: Validate and sanitize incoming data
function validateAndSanitizeResponse(data) {
    console.log('📥 Raw received data:', JSON.stringify(data, null, 2));
    
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Invalid data format' };
    }
    
    // Check if data is wrapped in a "check" field
    let actualData = data;
    if (data.check && typeof data.check === 'object') {
        console.log('🔍 Found data wrapped in "check" field');
        actualData = data.check;
    }
    
    const { requestId, result, status, message } = actualData;
    
    console.log('📋 Extracted fields:');
    console.log('  - requestId:', requestId, typeof requestId);
    console.log('  - result:', result ? 'EXISTS' : 'MISSING', typeof result);
    console.log('  - status:', status, typeof status);
    console.log('  - message:', message, typeof message);
    
    // Validate required fields - convert requestId to string if it's a number
    let stringRequestId;
    if (typeof requestId === 'string') {
        stringRequestId = requestId;
    } else if (typeof requestId === 'number') {
        stringRequestId = requestId.toString();
    } else if (requestId) {
        stringRequestId = String(requestId);
    } else {
        return { valid: false, message: 'Missing or invalid requestId' };
    }
    
    // Validate requestId format after converting to string
    if (stringRequestId.length === 0) {
        return { valid: false, message: 'Empty requestId' };
    }
    
    // Show what we actually received for each field
    console.log('🔍 Field analysis:');
    if (result === undefined) console.log('  ⚠️ result is undefined');
    if (result === null) console.log('  ⚠️ result is null');
    if (result === '') console.log('  ⚠️ result is empty string');
    if (status === undefined) console.log('  ⚠️ status is undefined');
    if (status === null) console.log('  ⚠️ status is null');
    if (message === undefined) console.log('  ⚠️ message is undefined');
    if (message === null) console.log('  ⚠️ message is null');
    
    // Sanitize data with better handling
    const sanitizedData = {
        requestId: stringRequestId.substring(0, 50),
        result: result !== undefined && result !== null ? 
            (typeof result === 'string' ? result.substring(0, 5000) : JSON.stringify(result).substring(0, 5000)) : 
            'No result provided',
        status: status !== undefined && status !== null ? 
            String(status).substring(0, 20) : 
            'unknown',
        message: message !== undefined && message !== null ? 
            String(message).substring(0, 500) : 
            'No message provided',
        timestamp: Date.now()
    };
    
    console.log('✅ Sanitized data summary:');
    console.log('  - requestId:', sanitizedData.requestId);
    console.log('  - result length:', sanitizedData.result.length);
    console.log('  - status:', sanitizedData.status);
    console.log('  - message:', sanitizedData.message);
    
    return { valid: true, data: sanitizedData };
}const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Store responses by request ID with TTL
const responses = new Map();
const RESPONSE_TTL = 30 * 60 * 1000; // 30 minutes (increased from 10)

// Middleware for parsing JSON
app.use(express.json({ limit: '1mb' })); // Limit payload size for security

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
    let cleanedCount = 0;
    
    // Clean up old responses
    for (const [key, value] of responses.entries()) {
        if (now - value.timestamp > RESPONSE_TTL) {
            responses.delete(key);
            cleanedCount++;
            console.log(`🗑️ Cleaned expired response: ${key}`);
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`🧹 Cleaned ${cleanedCount} expired responses. Remaining: ${responses.size}`);
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
}, 5 * 60 * 1000); // Clean every 5 minutes (instead of 1 minute)

// Serve static files from root directory
app.use(express.static(__dirname));

// Security: Validate and sanitize incoming data
function validateAndSanitizeResponse(data) {
    console.log('📥 Raw received data:', JSON.stringify(data, null, 2));
    
    if (!data || typeof data !== 'object') {
        return { valid: false, message: 'Invalid data format' };
    }
    
    const { requestId, result, status, message } = data;
    
    console.log('📋 Extracted fields:');
    console.log('  - requestId:', requestId, typeof requestId);
    console.log('  - result:', result ? 'EXISTS' : 'MISSING', typeof result);
    console.log('  - status:', status, typeof status);
    console.log('  - message:', message, typeof message);
    
    // Validate required fields - convert requestId to string if it's a number
    let stringRequestId;
    if (typeof requestId === 'string') {
        stringRequestId = requestId;
    } else if (typeof requestId === 'number') {
        stringRequestId = requestId.toString();
    } else if (requestId) {
        stringRequestId = String(requestId);
    } else {
        return { valid: false, message: 'Missing or invalid requestId' };
    }
    
    // Validate requestId format after converting to string
    if (stringRequestId.length === 0) {
        return { valid: false, message: 'Empty requestId' };
    }
    
    // Show what we actually received for each field
    console.log('🔍 Field analysis:');
    if (result === undefined) console.log('  ⚠️ result is undefined');
    if (result === null) console.log('  ⚠️ result is null');
    if (result === '') console.log('  ⚠️ result is empty string');
    if (status === undefined) console.log('  ⚠️ status is undefined');
    if (status === null) console.log('  ⚠️ status is null');
    if (message === undefined) console.log('  ⚠️ message is undefined');
    if (message === null) console.log('  ⚠️ message is null');
    
    // Sanitize data with better handling - don't use defaults yet
    const sanitizedData = {
        requestId: stringRequestId.substring(0, 50),
        result: result !== undefined && result !== null ? 
            (typeof result === 'string' ? result.substring(0, 5000) : JSON.stringify(result).substring(0, 5000)) : 
            'No result provided',
        status: status !== undefined && status !== null ? 
            String(status).substring(0, 20) : 
            'unknown',
        message: message !== undefined && message !== null ? 
            String(message).substring(0, 500) : 
            'No message provided',
        timestamp: Date.now()
    };
    
    console.log('✅ Sanitized data summary:');
    console.log('  - requestId:', sanitizedData.requestId);
    console.log('  - result length:', sanitizedData.result.length);
    console.log('  - status:', sanitizedData.status);
    console.log('  - message:', sanitizedData.message);
    
    return { valid: true, data: sanitizedData };
}

// Endpoint to receive data from n8n (primary endpoint)
app.post('/receive-data', (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Security: Rate limiting
    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded'
        });
    }
    
    // Add current request to rate limit tracking
    rateLimitMap.get(clientIP).push(Date.now());
    
    try {
        // Validate and sanitize incoming data
        const validation = validateAndSanitizeResponse(req.body);
        if (!validation.valid) {
            console.log('Invalid data received:', validation.message);
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid data format'
            });
        }
        
        const sanitizedData = validation.data;
        
        // Store response by requestId
        responses.set(sanitizedData.requestId, sanitizedData);
        
        console.log(`Received response for requestId: ${sanitizedData.requestId}`);
        
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

// Alternative endpoint for n8n (if n8n is configured to send to poll-result)
app.post('/poll-result/:requestId', (req, res) => {
    const { requestId } = req.params;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    console.log(`📨 Received POST to /poll-result/${requestId}`);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // Security: Rate limiting
    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded'
        });
    }
    
    // Add current request to rate limit tracking
    rateLimitMap.get(clientIP).push(Date.now());
    
    try {
        // Use requestId from URL, but also check if it's in the body
        const bodyRequestId = req.body.requestId;
        const finalRequestId = bodyRequestId || requestId;
        
        // Add requestId to body if not present
        const bodyWithRequestId = {
            ...req.body,
            requestId: finalRequestId
        };
        
        // Validate and sanitize incoming data
        const validation = validateAndSanitizeResponse(bodyWithRequestId);
        if (!validation.valid) {
            console.log('❌ Validation failed:', validation.message);
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid data format'
            });
        }
        
        const sanitizedData = validation.data;
        
        // Store response by requestId (use the sanitized requestId)
        responses.set(sanitizedData.requestId, sanitizedData);
        
        console.log(`✅ Stored response for requestId: "${sanitizedData.requestId}"`);
        console.log(`📊 Total stored responses: ${responses.size}`);
        console.log(`🔑 Available keys: [${Array.from(responses.keys()).join(', ')}]`);
        
        res.status(200).json({
            success: true,
            message: 'Data received successfully',
            requestId: sanitizedData.requestId
        });
        
    } catch (error) {
        console.error('❌ Error processing received data:', error.message);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to process data'
        });
    }
});

// Endpoint to poll for results by requestId (GET method)
app.get('/poll-result/:requestId', (req, res) => {
    const { requestId } = req.params;
    
    console.log(`🔍 Polling for requestId: ${requestId}`);
    console.log(`📊 Total stored: ${responses.size}`);
    console.log(`🔑 Available keys: [${Array.from(responses.keys()).join(', ')}]`);
    
    // Try exact match first
    let response = responses.get(requestId);
    
    if (!response) {
        // Try to find by string conversion (in case of type mismatch)
        const stringRequestId = String(requestId);
        response = responses.get(stringRequestId);
        
        if (!response) {
            // Try to find by number conversion
            const numberRequestId = Number(requestId);
            if (!isNaN(numberRequestId)) {
                response = responses.get(numberRequestId.toString());
            }
        }
    }
    
    if (response) {
        console.log(`✅ Found response for "${requestId}"`);
        console.log(`⏰ Data age: ${((Date.now() - response.timestamp) / 1000).toFixed(1)} seconds`);
        
        // Return the result but DON'T delete it yet (for debugging)
        // responses.delete(requestId);
        
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
        console.log(`❌ No response found for "${requestId}"`);
        
        res.status(202).json({
            success: false,
            message: 'Result not ready yet',
            debug: {
                requestedId: requestId,
                availableIds: Array.from(responses.keys()),
                totalStored: responses.size
            }
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

// BEFORE the catch-all middleware, add this specific check:
app.post('*', (req, res, next) => {
    console.log('🚨 UNHANDLED POST REQUEST:');
    console.log('Path:', req.path);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', req.headers);
    
    // If it's a poll-result path, try to handle it
    const pollResultMatch = req.path.match(/^\/poll-result\/(.+)$/);
    if (pollResultMatch) {
        const requestId = pollResultMatch[1];
        console.log(`📍 This looks like n8n trying to send to poll-result: ${requestId}`);
        
        // Manually store the data
        const testData = {
            requestId: requestId,
            result: req.body.result || req.body,
            status: req.body.status || 'success',
            message: req.body.message || 'Data received via catch-all',
            timestamp: Date.now()
        };
        
        responses.set(requestId, testData);
        console.log(`✅ Stored via catch-all for: ${requestId}`);
        
        return res.json({
            success: true,
            message: 'Data received via catch-all',
            requestId: requestId
        });
    }
    
    next();
});

// Catch-all debug endpoint to see ALL POST requests
app.use((req, res, next) => {
    if (req.method === 'POST') {
        console.log('=== INCOMING POST REQUEST ===');
        console.log('URL:', req.url);
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('=========================');
    }
    next();
});

// Test endpoint to manually store data
app.post('/test-store/:requestId', (req, res) => {
    const { requestId } = req.params;
    
    const testData = {
        requestId: requestId,
        result: req.body.result || { test: 'This is test data', success: true },
        status: req.body.status || 'success',
        message: req.body.message || 'Test data stored',
        timestamp: Date.now()
    };
    
    console.log(`📝 MANUALLY storing test data for: ${requestId}`);
    responses.set(requestId, testData);
    
    console.log('✅ Stored. Available keys now:', Array.from(responses.keys()));
    
    res.json({
        success: true,
        message: 'Test data stored',
        storedKey: requestId,
        availableKeys: Array.from(responses.keys())
    });
});

// Debug endpoint to see all stored data
app.get('/debug-storage', (req, res) => {
    const allData = {};
    responses.forEach((value, key) => {
        allData[key] = {
            timestamp: value.timestamp,
            status: value.status,
            hasResult: !!value.result
        };
    });
    
    res.json({
        totalStored: responses.size,
        keys: Array.from(responses.keys()),
        data: allData
    });
});
app.post('/test-send', (req, res) => {
    const testData = {
        requestId: req.body.requestId || 'test-123-abc',
        result: req.body.result || { message: 'This is a test result from Instagram API', username: 'testuser', followers: 1000 },
        status: 'success',
        message: 'Test data sent successfully'
    };
    
    console.log('Sending test data:', testData);
    
    // Store the test data
    const validation = validateAndSanitizeResponse(testData);
    if (validation.valid) {
        responses.set(validation.data.requestId, validation.data);
        res.status(200).json({
            success: true,
            message: 'Test data stored',
            data: testData
        });
    } else {
        res.status(400).json({
            success: false,
            message: validation.message
        });
    }
});

// Debug endpoint to see what we're receiving
app.post('/debug-receive', (req, res) => {
    console.log('=== DEBUG RECEIVE ===');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Raw body type:', typeof req.body);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('==================');
    
    res.status(200).json({
        success: true,
        message: 'Debug data logged',
        received: req.body
    });
});
app.get('/debug', (req, res) => {
    const fs = require('fs');
    const rootPath = __dirname;
    
    try {
        const files = fs.readdirSync(rootPath);
        res.json({
            rootPath,
            files,
            indexExists: fs.existsSync(path.join(rootPath, 'index.html')),
            activeResponses: responses.size
        });
    } catch (error) {
        res.json({ error: error.message, rootPath });
    }
});

// Serve the main HTML file with better error handling
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    
    // Check if file exists
    if (require('fs').existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        // If index.html doesn't exist, serve the form directly
        res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple Form</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 class="text-2xl font-bold text-gray-800 mb-6 text-center">Simple Form</h1>
        
        <form id="simpleForm" class="space-y-4">
            <div>
                <label for="userInput" class="block text-sm font-medium text-gray-700 mb-2">
                    Enter your message
                </label>
                <input 
                    type="text" 
                    id="userInput" 
                    name="userInput"
                    placeholder="Type something here..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    required
                >
            </div>
            
            <button 
                type="submit" 
                class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 font-medium"
            >
                Submit
            </button>
        </form>
        
        <div id="result" class="mt-6 p-4 rounded-md hidden">
            <p id="resultMessage"></p>
        </div>
        
        <div id="loading" class="mt-6 text-center hidden">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p class="text-gray-600 mt-2">Sending...</p>
        </div>
    </div>

    <script>
        // Security: Generate unique request ID to prevent race conditions
        function generateRequestId() {
            return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }
        
        // Security: Enhanced HTML escaping to prevent XSS
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Security: Comprehensive input sanitization
        function sanitizeInput(input) {
            // Remove potentially dangerous characters and patterns
            return input
                .trim()
                .replace(/[<>]/g, '') // Remove HTML tags
                .replace(/javascript:/gi, '') // Remove javascript: protocol
                .replace(/data:/gi, '') // Remove data: protocol
                .replace(/vbscript:/gi, '') // Remove vbscript: protocol
                .replace(/on\\w+\\s*=/gi, ''); // Remove event handlers
        }
        
        // Security: Enhanced input validation
        function validateInput(input) {
            if (!input || input.length === 0) {
                return { valid: false, message: 'Input cannot be empty' };
            }
            if (input.length > 500) { // Reduced from 1000 for better security
                return { valid: false, message: 'Input too long (max 500 characters)' };
            }
            
            // Enhanced security patterns check
            const suspiciousPatterns = [
                /<script[^>]*>.*?<\\/script>/gi,
                /javascript:/gi,
                /data:/gi,
                /vbscript:/gi,
                /on\\w+\\s*=/gi,
                /expression\\s*\\(/gi,
                /url\\s*\\(/gi,
                /@import/gi,
                /\\/\\*.*?\\*\\//g
            ];
            
            for (const pattern of suspiciousPatterns) {
                if (pattern.test(input)) {
                    return { valid: false, message: 'Invalid content detected' };
                }
            }
            return { valid: true };
        }
        
        // Rate limiting: Simple client-side rate limiting
        let lastRequestTime = 0;
        const RATE_LIMIT_MS = 2000; // 2 seconds between requests
        
        function checkRateLimit() {
            const now = Date.now();
            if (now - lastRequestTime < RATE_LIMIT_MS) {
                return { allowed: false, message: 'Please wait before sending another message' };
            }
            lastRequestTime = now;
            return { allowed: true };
        }
        
        // Security: Safe DOM manipulation (prevents XSS)
        function showResult(message, isSuccess = true) {
            const result = document.getElementById('result');
            const resultMessage = document.getElementById('resultMessage');
            
            result.className = \`mt-6 p-4 rounded-md \${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}\`;
            
            // Use textContent instead of innerHTML to prevent XSS
            const strongElement = document.createElement('strong');
            strongElement.textContent = isSuccess ? 'Success: ' : 'Error: ';
            
            resultMessage.innerHTML = '';
            resultMessage.appendChild(strongElement);
            resultMessage.appendChild(document.createTextNode(message));
            
            result.classList.remove('hidden');
        }
        
        function showLoading(show) {
            const loading = document.getElementById('loading');
            const submitBtn = document.querySelector('button[type="submit"]');
            
            if (show) {
                loading.classList.remove('hidden');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
                submitBtn.className = submitBtn.className.replace('bg-blue-600 hover:bg-blue-700', 'bg-gray-400 cursor-not-allowed');
            } else {
                loading.classList.add('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
                submitBtn.className = submitBtn.className.replace('bg-gray-400 cursor-not-allowed', 'bg-blue-600 hover:bg-blue-700');
            }
        }
        
        document.getElementById('simpleForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const input = document.getElementById('userInput');
            const rawValue = input.value;
            
            // Hide previous results
            document.getElementById('result').classList.add('hidden');
            
            // Security: Check rate limiting
            const rateLimitCheck = checkRateLimit();
            if (!rateLimitCheck.allowed) {
                showResult(rateLimitCheck.message, false);
                return;
            }
            
            // Validate input
            const validation = validateInput(rawValue);
            if (!validation.valid) {
                showResult(validation.message, false);
                return;
            }
            
            // Sanitize input
            const sanitizedValue = sanitizeInput(rawValue);
            
            // Generate unique request ID
            const requestId = generateRequestId();
            
            // Show loading state
            showLoading(true);
            
            try {
                // Security: Validate webhook URL format
                const webhookUrl = 'https://oxbenjam1n.app.n8n.cloud/webhook-test/ee95c5d8-139e-4d35-8eab-b431b741f563';
                
                // Security: Validate URL is HTTPS and from expected domain
                const url = new URL(webhookUrl);
                if (url.protocol !== 'https:' || !url.hostname.includes('n8n.cloud')) {
                    throw new Error('Invalid webhook URL');
                }
                
                // Prepare secure payload with request ID and minimal data
                const payload = {
                    requestId: requestId,
                    message: sanitizedValue,
                    timestamp: new Date().toISOString(),
                    // Security: Don't send full user agent, just basic info
                    clientInfo: {
                        platform: navigator.platform.substring(0, 20),
                        language: navigator.language
                    }
                };
                
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Security: Add custom header for webhook validation
                        'X-Client-Type': 'form-submission',
                        // Note: In production, add authentication header:
                        // 'X-API-Key': 'your-secret-token'
                    },
                    body: JSON.stringify(payload),
                    // Security: Reduced timeout and credentials policy
                    signal: AbortSignal.timeout(8000), // 8 second timeout
                    credentials: 'omit' // Don't send cookies
                });
                
                // Security: Don't expose detailed server response
                if (response.ok) {
                    showResult('Message sent successfully!', true);
                    input.value = ''; // Clear input on success
                } else if (response.status === 429) {
                    showResult('Too many requests. Please try again later.', false);
                } else if (response.status >= 400 && response.status < 500) {
                    showResult('Request rejected. Please check your input.', false);
                } else {
                    showResult('Server temporarily unavailable. Please try again later.', false);
                }
                
            } catch (error) {
                // Security: Don't expose detailed error information
                console.error('Webhook error:', error.message); // Log for debugging only
                
                if (error.name === 'AbortError') {
                    showResult('Request timed out. Please try again.', false);
                } else if (error.name === 'TypeError' || error.message.includes('fetch')) {
                    showResult('Network error. Please check your connection.', false);
                } else {
                    showResult('Unable to send message. Please try again later.', false);
                }
            } finally {
                showLoading(false);
            }
        });
        
        // Security: Clear any sensitive data on page unload
        window.addEventListener('beforeunload', function() {
            const input = document.getElementById('userInput');
            if (input) input.value = '';
        });
    </script>
</body>
</html>`);
    }
});

// Handle 404s
app.use((req, res) => {
    res.status(404).send('<h1>404 - Page Not Found</h1>');
});

// Start server - Railway requires listening on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
