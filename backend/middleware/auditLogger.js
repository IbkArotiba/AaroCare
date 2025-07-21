const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Use the environment variables we actually have available in .env
// Try non-prefixed variables first, then fall back to VITE_ prefixed ones
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

// Log environment variable status for debugging
console.log('[AuditLogger] SUPABASE_URL defined:', !!SUPABASE_URL);
console.log('[AuditLogger] SUPABASE_KEY defined:', !!SUPABASE_KEY);

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Function to generate consistent integer ID from UUID
function generateIntegerFromUUID(uuid) {
    // Skip if not a string or not a UUID format
    if (typeof uuid !== 'string' || !uuid.includes('-')) {
        return uuid;
    }
    
    // Use hash to convert UUID to a consistent number
    const hash = crypto.createHash('md5').update(uuid).digest('hex');
    // Take first 8 chars of hash and convert to integer (first 32 bits)
    const truncatedHash = parseInt(hash.substring(0, 8), 16);
    // Make sure it's positive and avoid very small numbers
    return Math.abs(truncatedHash) % 2147483647; // Max 31-bit positive integer
}

const auditLogger = {
    async log({ userId, action, resource, outcome, details, patientId = null, ip = null, userAgent = null }) {
        try {
            // Parse resource path to extract entity type and ID
            const pathParts = resource?.split('/') || [];
            const entityType = pathParts[1] || 'system';
            
            // Make sure entity_id is a valid integer or null
            let entityId = null;
            if (pathParts[2]) {
                const parsedId = parseInt(pathParts[2], 10);
                if (!isNaN(parsedId)) {
                    entityId = parsedId;
                }
            }
            
            // Convert UUID user_id to integer if it looks like a UUID
            let userIdValue = null;
            if (userId) {
                if (typeof userId === 'string' && userId.includes('-')) {
                    // Looks like a UUID, convert to integer using same algorithm as auth.js
                    userIdValue = generateIntegerFromUUID(userId);
                } else {
                    // Already an integer or other format, use as is
                    userIdValue = userId;
                }
            }
            
            // Ensure patient_id is a valid integer or null
            let patientIdInt = null;
            if (process.env.NODE_ENV === 'test') {
                // Skip patientId in tests to avoid foreign key violations
                patientIdInt = null;
            } else if (patientId) {
                const parsedPatientId = parseInt(patientId, 10);
                if (!isNaN(parsedPatientId)) {
                    patientIdInt = parsedPatientId;
                }
            }
            
            const { error } = await supabase
                .from('audit_logs')
                .insert({
                    user_id: userIdValue,
                    patient_id: patientIdInt,
                    action: action,
                    entity_type: entityType,
                    entity_id: entityId,
                    old_values: null,
                    new_values: typeof details === 'object' ? JSON.stringify(details) : details,
                    ip_address: ip,
                    user_agent: userAgent,
                    session_id: null,
                    created_at: new Date()
                });
            if (error) throw error;
        } catch (error) {
            console.error('Audit logging failed:', error);
            // Don't throw - audit logging should never break the main flow
        }
    },
    // Middleware for automatic request logging
    middleware: (req, res, next) => {
        // Capture response data
        const oldSend = res.send;
        res.send = function(data) {
            res.locals.responseBody = data;
            oldSend.apply(res, arguments);
        };

        // Log after response
        res.on('finish', () => {
            const logData = {
                // Convert UUID to integer if needed
                userId: req.user?.id ? generateIntegerFromUUID(req.user.id) : null,
                action: req.method,
                resource: req.originalUrl,
                outcome: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
                details: `${req.method} ${req.originalUrl} - Status: ${res.statusCode}`,
                patientId: (req.params && (req.params.patientId || req.params.id)) || null,
                ip: req.ip || null,
                userAgent: req.headers['user-agent'] || null
            };

            auditLogger.log(logData);
        });

        next();
    }
};

module.exports = auditLogger