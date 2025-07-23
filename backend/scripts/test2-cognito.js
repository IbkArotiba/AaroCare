const {cognitoAuth} = require('../services/cognitoAuth');
const db = require('../config/database'); // Add this line
require('dotenv').config();

async function testCognitoIntegration() {
  console.log('🔄 Testing Cognito integration...');
  try { 
    console.log('📋 Step 1: Testing user creation...');
    const testUser = {
      email: 'maxdon.admin@aarocare.com',
      firstName: 'Max',
      lastName: 'Don',
      role: 'admin',
      employeeId: 'Admin002',
      department: 'Admin',
      tempPassword: 'TempPassword123!!!',
      passwordChangeRequired: true,
      isActive: true
    };

    const createResult = await cognitoAuth.adminCreateUser(testUser);
    console.log('✅ User created successfully in Cognito');

    // ADD THIS NEW STEP - Create user in database
    console.log('📋 Step 1.5: Creating user in database...');
    const dbResult = await db.query(
      `INSERT INTO users (
        email, first_name, last_name, role, 
        employee_id, department, password_hash, is_active, password_change_required
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'cognito_user', true, false)
      RETURNING id, email, first_name, last_name, role, employee_id`,
      [testUser.email, testUser.firstName, testUser.lastName, testUser.role, testUser.employeeId, testUser.department, 'cognito_user', true, false]
    );
    console.log('✅ User created in database:', dbResult.rows[0]);

    console.log('📋 Step 2: Testing user login...');
    const loginResult = await cognitoAuth.signIn(testUser.email, 'TempPassword123!!!');
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
    console.log('🔑 Admin Login Details:');
    console.log('   Email: maxdon.admin@aarocare.com');
    console.log('   Password: TempPassword123!!!');
    console.log('   Role: admin');

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