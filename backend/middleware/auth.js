// middleware/auth.js - Updated for Cognito JWT Verification
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const cognitoAuth = require('../services/cognitoAuth');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const util = require('util');
const crypto = require('crypto');

// Initialize Cognito JWT verifier
const jwtVerifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID || "us-east-2_v8z1UEuK2",
    tokenUse: "access",
    clientId: process.env.COGNITO_CLIENT_ID || "3qss392inogb773i5103cu4inp",
});

// Function to generate consistent integer ID from UUID
// This creates a 31-bit positive integer (to avoid JS integer precision issues)
// that will be the same for the same UUID each time
function generateIntegerFromUUID(uuid) {
    // Use hash to convert UUID to a consistent number
    const hash = crypto.createHash('md5').update(uuid).digest('hex');
    // Take first 8 chars of hash and convert to integer (first 32 bits)
    const truncatedHash = parseInt(hash.substring(0, 8), 16);
    // Make sure it's positive and avoid very small numbers
    return Math.abs(truncatedHash) % 2147483647; // Max 31-bit positive integer
}

const authMiddleware = async (req, res, next) => {
    console.log('Auth middleware called for endpoint:', req.originalUrl);
    const authHeader = req.headers['authorization'];
    
    console.log('Auth header present:', !!authHeader);
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Access token required' });
    }

    try {
        console.log('Attempting to verify token with Cognito verifier');
        // Verify Cognito JWT token using aws-jwt-verify
        const payload = await jwtVerifier.verify(token);
        
        console.log('Token verified successfully, payload:', JSON.stringify({
            sub: payload.sub,
            username: payload.username || payload.email,
            role: payload['custom:role'] || payload.role || 'doctor'
        }));
        
        // Add user info to request - matching your existing structure
        const integerUserId = generateIntegerFromUUID(payload.sub);
        
        req.user = {
            id: integerUserId,  // Generate integer ID from UUID
            originalId: payload.sub, // Keep original UUID for reference
            email: payload.email ||payload.username,
            username: payload.username,
            role: payload['custom:role'] || payload.role || 'doctor',
            department: payload['custom:department'] || payload.department || 'general',
            employee_id: payload['custom:employee_id'] || payload.employee_id,
            first_name: payload['custom:first_name'] || payload.given_name,
            last_name: payload['custom:last_name'] || payload.family_name,
            cognitoSub: payload.sub  // Keep the original UUID here for reference
        };

        console.log(`API authenticated: User ${req.user.originalId} (${req.user.role}) - Integer ID: ${req.user.id}`);
        next();
    } catch (error) {
        console.error('Token verification error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Role-based authorization middleware
const roleAuth = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
            });
        }
        
        next();
    };
};

// Keep the old function name for backward compatibility
const authenticateToken = authMiddleware;

module.exports = { 
    authMiddleware, 
    authenticateToken, // Export both names for compatibility
    roleAuth // Add role-based auth
};