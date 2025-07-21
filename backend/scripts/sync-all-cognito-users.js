// Script to sync all Cognito users to Supabase
require('dotenv').config();
const { 
  CognitoIdentityProviderClient, 
  ListUsersCommand,
  AdminGetUserCommand 
} = require('@aws-sdk/client-cognito-identity-provider');
const db = require('../config/database');

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION, // Use the same AWS_REGION var as in cognitoAuth.js
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Map Cognito attributes to our user model
function mapCognitoUser(cognitoUser) {
  const attributes = cognitoUser.Attributes || [];
  const getAttr = (name) => {
    const attr = attributes.find(a => a.Name === name);
    return attr ? attr.Value : null;
  };
  
  return {
    email: getAttr('email'),
    firstName: getAttr('given_name') || getAttr('name')?.split(' ')[0] || '',
    lastName: getAttr('family_name') || getAttr('name')?.split(' ').slice(1).join(' ') || '',
    role: getAttr('custom:role') || 'user',
    employeeId: getAttr('custom:employeeId') || getAttr('sub').substring(0, 8),
    department: getAttr('custom:department') || 'general'
  };
}

// Sync a single user from Cognito to Supabase
async function syncUserToSupabase(userData) {
  try {
    console.log('Adding Cognito user to Supabase database:', userData.email);
    
    if (!userData.email) {
      console.log('Skipping user without email');
      return null;
    }
    
    // Check if user already exists in database
    const checkResult = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [userData.email]
    );
    
    if (checkResult.rows && checkResult.rows.length > 0) {
      console.log('User already exists in database, skipping creation');
      return checkResult.rows[0];
    }
    
    // Insert user into database
    const dbResult = await db.query(
      `INSERT INTO users (
        email, 
        first_name, 
        last_name, 
        role, 
        employee_id, 
        department,
        password_hash,
        is_active
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING id, email, first_name, last_name, role, employee_id, created_at`,
      [
        userData.email, 
        userData.firstName, 
        userData.lastName, 
        userData.role, 
        userData.employeeId, 
        userData.department,
        'COGNITO_AUTH_USER' // Placeholder password_hash for Cognito users
      ]
    );
    
    console.log('User added successfully to Supabase database');
    return dbResult.rows[0];
  } catch (error) {
    console.error('Failed to add user to database:', error);
    return null;
  }
}

// Get all users from Cognito and sync them to Supabase
async function syncAllUsers() {
  console.log('Starting sync of all Cognito users to Supabase...');
  try {
    let paginationToken = undefined;
    let totalSynced = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    
    // Loop to handle pagination - get all users
    do {
      const command = new ListUsersCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Limit: 60,
        PaginationToken: paginationToken
      });
      
      const response = await cognitoClient.send(command);
      paginationToken = response.PaginationToken;
      
      console.log(`Processing batch of ${response.Users.length} users...`);
      
      // Process each user in this batch
      for (const cognitoUser of response.Users) {
        try {
          // Map Cognito user to our format
          const userData = mapCognitoUser(cognitoUser);
          
          if (!userData.email) {
            console.log(`Skipping user with no email: ${cognitoUser.Username}`);
            totalSkipped++;
            continue;
          }
          
          // Sync this user to Supabase
          const result = await syncUserToSupabase(userData);
          if (result) {
            console.log(`Synced: ${userData.email}`);
            totalSynced++;
          } else {
            totalSkipped++;
          }
        } catch (userError) {
          console.error(`Failed to sync user ${cognitoUser.Username}:`, userError);
          totalFailed++;
        }
      }
      
      console.log(`Batch complete. Running totals: Synced=${totalSynced}, Skipped=${totalSkipped}, Failed=${totalFailed}`);
      
    } while (paginationToken);
    
    console.log('Sync complete!');
    console.log(`Final results: Synced=${totalSynced}, Skipped=${totalSkipped}, Failed=${totalFailed}`);
    
    return { totalSynced, totalSkipped, totalFailed };
  } catch (error) {
    console.error('Failed to sync users:', error);
    throw error;
  }
}

// Run the sync
async function main() {
  try {
    const result = await syncAllUsers();
    console.log('Sync complete:', result);
    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
