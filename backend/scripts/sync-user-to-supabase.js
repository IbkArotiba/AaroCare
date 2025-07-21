// Script to add an existing Cognito user to Supabase
require('dotenv').config();
const db = require('../config/database');

async function syncUserToSupabase(userData) {
  try {
    console.log('Adding Cognito user to Supabase database:', userData.email);
    
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
      RETURNING id, email, first_name, last_name, role, employee_id, created_at, password_hash`,
      [
        userData.email, 
        userData.firstName, 
        userData.lastName, 
        userData.role, 
        userData.employeeId, 
        userData.department || 'general',
        'COGNITO_AUTH_USER' // Placeholder password_hash for Cognito users
      ]
    );
    
    console.log('User added successfully to Supabase database');
    return dbResult.rows[0];
  } catch (error) {
    console.error('Failed to add user to database:', error);
    throw error;
  }
}

// Example usage with test.doctor@aarocare.com
async function main() {
  const testUser = {
    email: 'test.doctor@aarocare.com',
    firstName: 'Test',
    lastName: 'Doctor',
    role: 'doctor',
    employeeId: 'DOC001',
    department: 'general'
  };
  
  try {
    const result = await syncUserToSupabase(testUser);
    console.log('Sync complete:', result);
    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
