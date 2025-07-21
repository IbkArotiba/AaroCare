const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  RespondToAuthChallengeCommand, // Add this import
} = require('@aws-sdk/client-cognito-identity-provider');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); 
require('dotenv').config();

// Initialize the Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

class CognitoAuthService {
  constructor() {
    this.userPoolId = process.env.COGNITO_USER_POOL_ID;
    this.clientId = process.env.COGNITO_CLIENT_ID;
    this.clientSecret = process.env.COGNITO_CLIENT_SECRET;
  }

  // Generate secret hash for client secret
  generateSecretHash(username) {
    if (!this.clientSecret) return undefined;
    const message = username + this.clientId;
    const hash = crypto.createHmac('sha256', this.clientSecret)
      .update(message)
      .digest('base64');
    return hash;
  }

  // Sign in method
  async signIn(email, password) {
    const params = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: this.clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    };

    // Add SECRET_HASH if client secret exists
    if (this.clientSecret && this.clientSecret.trim() !== '') {
      params.AuthParameters.SECRET_HASH = this.generateSecretHash(email);
      console.log('Using secret hash for authentication');
    }
    
    console.log('Attempting Cognito authentication with params:', {
      ...params,
      AuthParameters: {
        ...params.AuthParameters,
        PASSWORD: '[REDACTED]'
      }
    });

    try {
      const command = new InitiateAuthCommand(params);
      const result = await cognitoClient.send(command);
      console.log('Cognito authentication result:', result.ChallengeName || 'SUCCESS');
      return result;
    } catch (error) {
      console.error('Cognito authentication error:', error.name, error.message);
      throw new Error(`Cognito signin failed: ${error.message}`);
    }
  }

  // Handle NEW_PASSWORD_REQUIRED challenge
  async respondToNewPasswordChallenge(username, newPassword, session) {
    const params = {
      ClientId: this.clientId,
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      Session: session,
      ChallengeResponses: {
        USERNAME: username,
        NEW_PASSWORD: newPassword
      }
    };

    // Add SECRET_HASH if client secret exists
    if (this.clientSecret && this.clientSecret.trim() !== '') {
      params.ChallengeResponses.SECRET_HASH = this.generateSecretHash(username);
    }

    try {
      const command = new RespondToAuthChallengeCommand(params);
      const result = await cognitoClient.send(command);
      console.log('Password challenge response successful');
      return result;
    } catch (error) {
      console.error('Password challenge response error:', error);
      throw new Error(`Password challenge failed: ${error.message}`);
    }
  }

  // Updated admin create user method - creates users with permanent passwords
  async adminCreateUser(userData) {
    const { email, firstName, lastName, employeeId, role, department, tempPassword } = userData;

    // Use the provided password or generate a temporary one
    const userPassword = tempPassword || this.generateTempPassword();

    const params = {
      UserPoolId: this.userPoolId,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: firstName },
        { Name: 'family_name', Value: lastName },
        { Name: 'custom:employee_id', Value: employeeId },
        { Name: 'custom:role', Value: role },
        { Name: 'custom:department', Value: department || '' }
      ],
      MessageAction: 'SUPPRESS' // Don't send welcome email
      // Remove TemporaryPassword from here
    };

    try {
      // Create the user first
      const createCommand = new AdminCreateUserCommand(params);
      const result = await cognitoClient.send(createCommand);
      console.log('User created successfully');

      // Always set a permanent password immediately
      const setPasswordParams = {
        UserPoolId: this.userPoolId,
        Username: email,
        Password: userPassword,
        Permanent: true // This is the key - makes it permanent!
      };

      const setPasswordCommand = new AdminSetUserPasswordCommand(setPasswordParams);
      await cognitoClient.send(setPasswordCommand);
      console.log('Permanent password set successfully');

      return result;
    } catch (error) {
      console.error('Admin create user error:', error);
      throw new Error(`Cognito admin create user failed: ${error.message}`);
    }
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.decode(token);
      
      if (!decoded) {
        throw new Error('Invalid token format');
      }

      return {
        userId: decoded.sub,
        email: decoded.email,
        firstName: decoded.given_name,
        lastName: decoded.family_name,
        employeeId: decoded['custom:employee_id'],
        role: decoded['custom:role'],
        department: decoded['custom:department']
      };
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  generateTempPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
  async changePassword(accessToken, oldPassword, newPassword) {
    const params = {
        AccessToken: accessToken,
        PreviousPassword: oldPassword,
        ProposedPassword: newPassword
    };
    
    try {
      const { ChangePasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
      const command = new ChangePasswordCommand(params);
      const result = await cognitoClient.send(command);
      return result;
    } catch (error) {
      console.error('Cognito change password error:', error);
      throw error;
    }
  }
}




module.exports = {
  cognitoAuth: new CognitoAuthService(),
};
