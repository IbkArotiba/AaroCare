/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 * @returns {Function} Express middleware function
 */
const roleAuth = (allowedRoles) => {
    if (!Array.isArray(allowedRoles)) {
        throw new Error('allowedRoles must be an array');
    }

    return (req, res, next) => {
        const userRole = req.user?.role;

        if (!userRole) {
            return res.status(401).json({
                status: 'error',
                message: 'No role found for user'
            });
        }

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                status: 'error',
                message: 'You do not have permission to perform this action'
            });
        }

        next();
    };
};

module.exports = roleAuth;
