// tests/integration/database.test.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.test' });

// Try non-prefixed variables first, then fall back to VITE_ prefixed ones
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

// Log for debugging
console.log('[TestDB] SUPABASE_URL defined:', !!SUPABASE_URL);
console.log('[TestDB] SUPABASE_KEY defined:', !!SUPABASE_KEY);

// Create Supabase test client
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

describe('Database Integration Tests', () => {
  let testUserId;
  let testPatientId;

  beforeAll(async () => {
    try {
      // Test database connection first
      const { data, error } = await supabase.from('users').select('count');
      if (error) throw error;
      console.log('Supabase connection successful');
      
      // Set up test data
      await setupTestData();
    } catch (error) {
      console.error('Database setup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Clean up test data
      await cleanupTestData();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  async function setupTestData() {
    try {
      // Create test user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: 'test.doctor@medsync.com',
          password_hash: 'hashed_password',
          first_name: 'Test',
          last_name: 'Doctor',
          role: 'doctor',
          employee_id: 'TEST001'
        })
        .select()
        .single();
      
      if (userError) throw userError;
      testUserId = userData.id;

      // Create test patient
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert({
          medical_record_number: 'TEST_MRN_001',
          first_name: 'Test',
          last_name: 'Patient',
          date_of_birth: '1990-01-01',
          status: 'active'
        })
        .select()
        .single();
      
      if (patientError) throw patientError;
      testPatientId = patientData.id;
      
      console.log(`Created test user ID: ${testUserId}, test patient ID: ${testPatientId}`);
    } catch (error) {
      console.error('Error in setupTestData:', error);
      throw error;
    }
  }

  async function cleanupTestData() {
    if (!testUserId || !testPatientId) {
      console.log('No test data to clean up');
      return;
    }

    try {
      // Delete in reverse order due to foreign key constraints
      await supabase.from('audit_logs').delete().eq('user_id', testUserId);
      await supabase.from('care_teams').delete().or(`user_id.eq.${testUserId},patient_id.eq.${testPatientId}`);
      await supabase.from('patient_notes').delete().eq('patient_id', testPatientId);
      await supabase.from('vital_signs').delete().eq('patient_id', testPatientId);
      await supabase.from('treatment_plans').delete().eq('patient_id', testPatientId);
      await supabase.from('patients').delete().eq('id', testPatientId);
      await supabase.from('users').delete().eq('id', testUserId);
      
      console.log('Test data cleaned up successfully');
    } catch (error) {
      console.error('Error in cleanupTestData:', error);
    }
  }

  describe('Database Connection', () => {
    it('should connect to Supabase', async () => {
      const { data, error } = await supabase.from('users').select('count');
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Users Table Operations', () => {
    it('should create user with proper constraints', async () => {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: 'nurse.test@medsync.com',
          password_hash: 'hashed_pass',
          first_name: 'Test',
          last_name: 'Nurse',
          role: 'nurse',
          employee_id: 'TEST002'
        })
        .select();

      expect(error).toBeNull();
      expect(data[0]).toMatchObject({
        email: 'nurse.test@medsync.com',
        role: 'nurse'
      });
      expect(data[0].created_at).toBeDefined();
    });
  });

  // Add more tests as needed...
});