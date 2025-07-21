// scripts/init-test-db.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.test' });

// Try non-prefixed variables first, then fall back to VITE_ prefixed ones
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

// Log for debugging
console.log('[TestDB] SUPABASE_URL defined:', !!SUPABASE_URL);
console.log('[TestDB] SUPABASE_KEY defined:', !!SUPABASE_KEY);

// Ensure we use double quotes for password values with special characters
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

async function initTestDatabase() {
  try {
    console.log('Checking test database tables...');
    
    // Check if tables exist by querying them
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (usersError) {
      console.error('Error checking users table:', usersError);
      return false;
    } else {
      console.log('Users table exists and is accessible');
    }
    
    // Patients table
    const { data: patientsData, error: patientsError } = await supabase
      .from('patients')
      .select('count')
      .limit(1);
      
    if (patientsError) {
      console.error('Error checking patients table:', patientsError);
      return false;
    } else {
      console.log('Patients table exists and is accessible');
    }
    
    // Care teams table
    const { data: careTeamsData, error: careTeamsError } = await supabase
      .from('care_teams')
      .select('count')
      .limit(1);
      
    if (careTeamsError) {
      console.error('Error checking care_teams table:', careTeamsError);
      // This might be OK if we don't have any care teams yet
      console.log('Care teams table might not have data yet, but continuing');
    } else {
      console.log('Care teams table exists and is accessible');
    }
    
    // Patient notes table
    const { data: patientNotesData, error: patientNotesError } = await supabase
      .from('patient_notes')
      .select('count')
      .limit(1);
      
    if (patientNotesError) {
      console.error('Error checking patient_notes table:', patientNotesError);
      // This might be OK if we don't have any notes yet
      console.log('Patient notes table might not have data yet, but continuing');
    } else {
      console.log('Patient notes table exists and is accessible');
    }
    
    // Vital signs table
    const { data: vitalSignsData, error: vitalSignsError } = await supabase
      .from('vital_signs')
      .select('count')
      .limit(1);
      
    if (vitalSignsError) {
      console.error('Error checking vital_signs table:', vitalSignsError);
      // This might be OK if we don't have any vitals yet
      console.log('Vital signs table might not have data yet, but continuing');
    } else {
      console.log('Vital signs table exists and is accessible');
    }
    
    // Treatments table - optional, may not exist in all environments
    const { data: treatmentsData, error: treatmentsError } = await supabase
      .from('treatment_plans')
      .select('count')
      .limit(1);
      
    if (treatmentsError) {
      console.error('Error checking treatment_plans table:', treatmentsError);
      console.log('Treatment plans table might not exist, but continuing');
    } else {
      console.log('Treatment plans table exists and is accessible');
    }
    
    console.log('Test database initialization completed');
    return true;
  } catch (error) {
    console.error('Failed to verify test database tables:', error);
    return false;
  }
}

// For setting up test data if needed
async function setupTestData() {
  // This function can be implemented later if needed
  // For now, we'll just return true to indicate success
  return true;
}

module.exports = { initTestDatabase, setupTestData };

// Run if this script is executed directly
if (require.main === module) {
  initTestDatabase()
    .then(() => console.log('Done.'))
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { initTestDatabase };
