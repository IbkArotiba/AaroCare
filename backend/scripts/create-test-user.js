// Script to create a test user in Cognito
require('dotenv').config();
const cognitoAuth = require('../services/cognitoAuth');

async function createTestUser() {
  try {
    console.log('Creating test user in Cognito...');
    
    const testUser = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      employeeId: 'TEST001',
      role: 'doctor',
      department: 'Testing',
      tempPassword: 'Test@12345'  // This will be set as a permanent password
    };
    
    console.log(`Creating user with email: ${testUser.email} and password: ${testUser.tempPassword}`);
    
    const result = await cognitoAuth.adminCreateUser(testUser);
    console.log('Test user created successfully:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Failed to create test user:', error.message);
  }
}

createTestUser();
