// tests/middleware/auth.test.js
const { authMiddleware, roleAuth } = require('../../middleware/auth');
const jwt = require('jsonwebtoken');

// Mock JWT
jest.mock('jsonwebtoken');

describe('Authentication Middleware Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should authenticate valid JWT token', () => {
      const mockUser = {
        id: 1,
        email: 'doctor@medsync.com',
        role: 'doctor'
      };

      req.headers.authorization = 'Bearer valid-jwt-token';
      jwt.verify.mockReturnValue(mockUser);

      authMiddleware(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-jwt-token', process.env.JWT_SECRET);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should reject request without authorization header', () => {
      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', () => {
      req.headers.authorization = 'InvalidFormat token';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token format' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired or invalid JWT token', () => {
      req.headers.authorization = 'Bearer expired-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing Bearer prefix', () => {
      req.headers.authorization = 'just-a-token';

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token format' });
    });
  });

  describe('roleAuth middleware', () => {
    beforeEach(() => {
      req.user = {
        id: 1,
        email: 'user@medsync.com',
        role: 'nurse'
      };
    });

    it('should allow access for authorized role', () => {
      const roleAuthMiddleware = roleAuth(['nurse', 'doctor']);

      roleAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      req.user.role = 'nurse';
      const roleAuthMiddleware = roleAuth(['doctor', 'admin']);

      roleAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing user in request', () => {
      req.user = null;
      const roleAuthMiddleware = roleAuth(['doctor']);

      roleAuthMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });

    it('should allow admin access to all endpoints', () => {
      req.user.role = 'admin';
      const roleAuthMiddleware = roleAuth(['doctor']); // Admin not in list

      roleAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled(); // Admin should still have access
    });

    it('should handle case-insensitive role comparison', () => {
      req.user.role = 'DOCTOR';
      const roleAuthMiddleware = roleAuth(['doctor']);

      roleAuthMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should handle auth middleware followed by role middleware', () => {
      const mockUser = {
        id: 1,
        email: 'doctor@medsync.com',
        role: 'doctor'
      };

      // Test auth middleware first
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue(mockUser);
      
      authMiddleware(req, res, next);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledTimes(1);

      // Reset next mock for role middleware test
      next.mockClear();

      // Test role middleware second
      const roleAuthMiddleware = roleAuth(['doctor', 'nurse']);
      roleAuthMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});