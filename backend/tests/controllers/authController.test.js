const request = require('supertest');
const app = require('../../app');
const db = require('../../config/database');
const AWS = require('aws-sdk');

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mCognitoIdentityServiceProvider = {
    initiateAuth: jest.fn().mockReturnThis(),
    promise: jest.fn()
  };
  return {
    CognitoIdentityServiceProvider: jest.fn(() => mCognitoIdentityServiceProvider)
  };
});

// Mock database
jest.mock('../../config/database', () => ({
  query: jest.fn()
}));

describe('Auth Controller Tests', () => {
  let mockToken;
  let mockCognito;
  
  beforeEach(() => {
    // Mock JWT token for authentication
    mockToken = 'Bearer mock-jwt-token';
    jest.clearAllMocks();
    db.query = jest.fn().mockResolvedValue({ rows: [] });
    
    // Get reference to mocked Cognito
    mockCognito = new AWS.CognitoIdentityServiceProvider();
  });

  afterAll(async () => {
    // Clean up database connections
    if (db.end) await db.end();
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh token successfully', async () => {
      // Mock Cognito response
      mockCognito.promise.mockResolvedValueOnce({
        AuthenticationResult: {
          AccessToken: 'new-access-token',
          RefreshToken: 'new-refresh-token'
        }
      });

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(response.body).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      });
      
      expect(mockCognito.initiateAuth).toHaveBeenCalledWith({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: expect.any(String),
        AuthParameters: {
          REFRESH_TOKEN: 'valid-refresh-token'
        }
      });
    });

    it('should return 400 when refresh token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body.message).toBe('Refresh token required');
      expect(mockCognito.initiateAuth).not.toHaveBeenCalled();
    });

    it('should return 401 when refresh token is invalid', async () => {
      // Mock Cognito error
      const error = new Error('NotAuthorizedException');
      error.code = 'NotAuthorizedException';
      mockCognito.promise.mockRejectedValueOnce(error);

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should return 400 when token format is invalid', async () => {
      // Mock Cognito error
      const error = new Error('InvalidParameterException');
      error.code = 'InvalidParameterException';
      mockCognito.promise.mockRejectedValueOnce(error);

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'malformed-token' })
        .expect(400);

      expect(response.body.message).toBe('Invalid token format');
    });

    it('should return 500 when unknown error occurs', async () => {
      // Mock unknown error
      mockCognito.promise.mockRejectedValueOnce(new Error('Unknown error'));

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(500);

      expect(response.body.message).toBe('Failed to refresh token');
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update profile successfully', async () => {
      // Mock user update response
      const mockUpdatedUser = {
        rows: [{
          id: 'user-1',
          email: 'test@example.com',
          first_name: 'Updated',
          last_name: 'User',
          role: 'doctor',
          employee_id: 'EMP123',
          department: 'cardiology',
          phone: '+1234567890',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-06-15T00:00:00Z'
        }]
      };
      
      db.query.mockResolvedValueOnce(mockUpdatedUser);

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', mockToken)
        .send({
          first_name: 'Updated',
          last_name: 'User',
          phone: '+1234567890',
          department: 'cardiology'
        })
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user).toEqual(mockUpdatedUser.rows[0]);
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['Updated', 'User', '+1234567890', 'cardiology'])
      );
    });

    it('should return 400 when no fields are provided for update', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', mockToken)
        .send({})
        .expect(400);

      expect(response.body.message).toBe('At least one field required for update');
    });

    it('should return 400 when phone number format is invalid', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', mockToken)
        .send({
          phone: 'invalid-phone'
        })
        .expect(400);

      expect(response.body.message).toBe('Invalid phone number format');
    });

    it('should return 400 when department is invalid', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', mockToken)
        .send({
          department: 'invalid-department'
        })
        .expect(400);

      expect(response.body.message).toBe('Invalid department');
    });

    it('should return 404 when user is not found', async () => {
      // Mock empty response (user not found)
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', mockToken)
        .send({
          first_name: 'Updated'
        })
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });

    it('should return 400 when phone number is already in use', async () => {
      // Mock unique constraint violation
      const error = new Error('Duplicate phone');
      error.code = '23505';
      db.query.mockRejectedValueOnce(error);

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', mockToken)
        .send({
          phone: '+1234567890'
        })
        .expect(400);

      expect(response.body.message).toBe('Phone number already in use');
    });

    it('should return 500 when database error occurs', async () => {
      // Mock database error
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', mockToken)
        .send({
          first_name: 'Updated'
        })
        .expect(500);

      expect(response.body.message).toBe('Failed to update profile');
    });
  });
});
