const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {cognitoAuth} = require('../services/cognitoAuth');
const db = require('../config/database');
const { authLimiter } = require('../middleware/rateLimiter');
const { authMiddleware } = require('../middleware/auth');
const { refreshToken, updateProfile } = require('../controllers/authController');

// Login route
router.post('/login',
    authLimiter,
    [
        body('email').isEmail().normalizeEmail(),
        body('password').trim().isLength({min: 6}),
        body('newPassword').optional().trim().isLength({min: 8}) // For password change
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }
        const {email, password} = req.body;
        try {
            const cognitoResult = await cognitoAuth.signIn(email, password);
            // Check if password change is required
            if (cognitoResult.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                if (!newPassword) {
                    return res.status(200).json({
                        message: 'Password change required',
                        challengeName: 'NEW_PASSWORD_REQUIRED',
                        session: cognitoResult.Session,
                        requirePasswordChange: true
                    });
                }
                
                // Handle password change
                const newPasswordResult = await cognitoAuth.respondToNewPasswordChallenge(
                    email, 
                    newPassword, 
                    cognitoResult.Session
                );
                
                if (!newPasswordResult.AuthenticationResult) {
                    return res.status(401).json({message: 'Password change failed'});
                }
                
                const accessToken = newPasswordResult.AuthenticationResult.AccessToken;
                const idToken = newPasswordResult.AuthenticationResult.IdToken;
                const userInfo = await cognitoAuth.verifyToken(idToken);
                
                await db.query(
                    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = $1',
                    [userInfo.email]
                );
                
                const userData = await db.query(
                    `SELECT id, email, first_name, last_name, role, employee_id, department, 
                     password_change_required, password_changed_at, phone, is_active, created_at
                     FROM users WHERE email = $1`,
                    [userInfo.email]
                );
                
                const dbUser = userData.rows[0];
                
                return res.json({
                    message: 'Password changed and login successful',
                    accessToken,
                    idToken,
                    user: {
                        email: userInfo.email,
                        given_name: userInfo.firstName,
                        family_name: userInfo.lastName,
                        employee_Id: userInfo.employeeId,
                        role: userInfo.role,
                        department: userInfo.department,
                        password_change_required: dbUser.password_change_required,
                        password_changed_at: dbUser.password_changed_at,
                        phone: dbUser.phone,
                        is_active: dbUser.is_active,
                    }
                });
            }
            if (!cognitoResult.AuthenticationResult) {
                return res.status(401).json({message: 'Authentication Failed'});
            }
            const accessToken = cognitoResult.AuthenticationResult.AccessToken;
            const idToken = cognitoResult.AuthenticationResult.IdToken;
            const userInfo = await cognitoAuth.verifyToken(idToken);
            
            await db.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = $1',
                [userInfo.email]
            );
            const userData = await db.query(
                `SELECT id, email, first_name, last_name, role, employee_id, department, 
                 password_change_required, password_changed_at, phone, is_active, created_at
                 FROM users WHERE email = $1`,
                [userInfo.email]
            );
            
            const dbUser = userData.rows[0];
            
            res.json({
                message: 'Login successful',
                accessToken,
                idToken,
                user: {
                    email: userInfo.email,
                    given_name: userInfo.firstName,
                    family_name: userInfo.lastName,
                    employee_Id: userInfo.employeeId,
                    role: userInfo.role,
                    department: userInfo.department,
                    password_change_required: dbUser.password_change_required,
                    password_changed_at: dbUser.password_changed_at,
                    phone: dbUser.phone,
                    is_active: dbUser.is_active,
                }
            });
        } catch(error) {
            console.error('Error logging in:', error);
            res.status(401).json({message: 'Failed to log in'});
        }
    }
);

// Register route
router.post('/register',
    [
        body('email').isEmail().normalizeEmail(),
        body('firstName').isLength({ min: 2 }).trim(),
        body('lastName').isLength({ min: 2 }).trim(),
        body('role').isIn(['doctor', 'nurse', 'admin']),
        body('employeeId').isLength({ min: 3 }).trim(),
        body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }
        
        const {email, firstName, lastName, role, employeeId, password, department} = req.body;
        
        try {
            const cognitoResult = await cognitoAuth.adminCreateUser({
                email, 
                firstName, 
                lastName, 
                employeeId, 
                role, 
                department, 
                tempPassword: password,
                passwordChangeRequired: true
            });
            
            const dbResult = await db.query(
                `INSERT INTO users (
                    email, first_name, last_name, role, 
                    employee_id, department, password_hash, is_active, password_change_required
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, email, first_name, last_name, role, employee_id, created_at`,
                [email, firstName, lastName, role, employeeId, department, 'cognito_user', true, true]
            );
            
            res.status(201).json({
                message: 'Medical staff member created successfully',
                user: dbResult.rows[0]
            });
        } catch(error) {
            console.error('Registration error:', error);
            res.status(500).json({message: 'Failed to create user'});
        }
    }
);

// Get current user
router.get('/me', 
    authMiddleware, 
    (req, res) => {
        res.json({
            user: req.user,
            cognitoInfo: req.cognitoUser
        });
    }
);

// Refresh token
router.post('/refresh-token',
    [
        body('refreshToken').notEmpty().withMessage('Refresh token is required')
    ],
    refreshToken
);

// For backward compatibility, keeping the old endpoint as well
router.post('/refresh',
    [
        body('refreshToken').notEmpty().withMessage('Refresh token is required')
    ],
    refreshToken
);

// Update profile
router.put('/profile',
    authMiddleware,
    [
        body('first_name').optional().isLength({ min: 2 }).trim(),
        body('last_name').optional().isLength({ min: 2 }).trim(),
        body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).trim(),
        body('department').optional().isIn(['emergency', 'cardiology', 'pediatrics', 'surgery', 'general'])
    ],
    updateProfile
);
router.post('/change-password',
    authMiddleware,
    [
        body('current_password').notEmpty().withMessage('Current password is required'),
        body('new_password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('New password must be at least 8 characters with uppercase, lowercase, and number')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }

        const { current_password, new_password } = req.body;
        const userEmail = req.user.email;
        
        try {
            // First verify current password with Cognito
            const signInResult = await cognitoAuth.signIn(userEmail, current_password);
            
            if (!signInResult.AuthenticationResult) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }

            // Change password in Cognito
            const changePasswordResult = await cognitoAuth.changePassword(
                signInResult.AuthenticationResult.AccessToken,
                current_password,
                new_password
            );

            // Update database to mark password as changed
            await db.query(
                `UPDATE users 
                 SET password_change_required = false, 
                     password_changed_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE email = $1`,
                [userEmail]
            );

            // Get updated user data
            const userData = await db.query(
                `SELECT id, email, first_name, last_name, role, employee_id, department, 
                 password_change_required, password_changed_at, phone, is_active, created_at
                 FROM users WHERE email = $1`,
                [userEmail]
            );

            res.json({
                message: 'Password changed successfully',
                user: userData.rows[0]
            });

        } catch (error) {
            console.error('Password change error:', error);
            res.status(500).json({ message: 'Failed to change password' });
        }
    }
);

module.exports = router;