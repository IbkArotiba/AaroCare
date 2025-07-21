// Global error handling middleware
const errorHandler = (err, req, res, next) => {
    // Log error for debugging (consider using a proper logging service in production)
    console.error(err);

    // HIPAA compliant error response - never expose sensitive data
    const error = {
        status: err.status || 500,
        message: err.message || 'Internal Server Error',
        code: err.code || 'INTERNAL_ERROR'
    };

    // Remove stack trace in production
    if (process.env.NODE_ENV === 'development') {
        error.stack = err.stack;
    }

    // Log to audit trail if it's a data access error
    if (err.auditLog) {
        const auditLogger = require('./auditLogger');
        auditLogger.log({
            userId: req.user?.id,
            action: req.method,
            resource: req.originalUrl,
            outcome: 'ERROR',
            details: err.message,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
    }

    res.status(error.status).json(error);
};

module.exports = errorHandler;
