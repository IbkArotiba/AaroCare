const cognitoAuth = require('../services/cognitoAuth');
require('dotenv').config();

async function testCognitoIntegration() {
    console.log('🔄 Testing Cognito integration...');

    try {
        console.log('📋 Step 1: Testing user creation...');
        
        const testUser = {
          email: process.env.TEST_USER_EMAIL || 'user@example.com',
          firstName: process.env.TEST_USER_FIRSTNAME || 'Test',
          lastName: process.env.TEST_USER_LASTNAME || 'User',
          role: process.env.TEST_USER_ROLE || 'doctor',
          employeeId: process.env.TEST_USER_ID || 'TEST001',
          department: process.env.TEST_USER_DEPT || 'Testing',
          tempPassword: process.env.TEST_USER_PASSWORD || 'ChangeMe123!'
        };
        
        console.log('Using test email:', testUser.email);
        const createResult = await cognitoAuth.adminCreateUser(testUser);
        console.log('✅ User created successfully in Cognito');
        console.log('📋 Step 2: Testing user login...');
    
    const loginResult = await cognitoAuth.signIn(testUser.email, testUser.tempPassword);
    console.log('✅ Login successful');
    
    const idToken = loginResult.AuthenticationResult.IdToken;
    console.log('🔑 ID Token received (first 50 chars):', idToken.substring(0, 50) + '...');
    console.log('📋 Step 3: Testing token verification...');
    
    const userInfo = await cognitoAuth.verifyToken(idToken);
    console.log('✅ Token verified successfully');
    console.log('👤 User info:', {
      email: userInfo.email,
      name: `${userInfo.firstName} ${userInfo.lastName}`,
      role: userInfo.role,
      employeeId: userInfo.employeeId
    });
    console.log('\n🎉 All Cognito tests passed!');
    console.log('🔧 Your Cognito integration is working correctly.');
    
  } catch (error) {
    console.error('❌ Cognito test failed:', error.message);
    console.log('\n🔍 Check your .env file contains:');
    console.log('AWS_REGION');
    console.log('COGNITO_USER_POOL_ID'); 
    console.log('COGNITO_CLIENT_ID');
    console.log('AWS_ACCESS_KEY_ID');
    console.log('AWS_SECRET_ACCESS_KEY');
  }
}
testCognitoIntegration();