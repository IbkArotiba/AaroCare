const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const { initTestDatabase } = require('../scripts/init-test-db');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Try non-prefixed variables first, then fall back to VITE_ prefixed ones
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

// Log for debugging
console.log('[TestDB] SUPABASE_URL defined:', !!SUPABASE_URL);
console.log('[TestDB] SUPABASE_KEY defined:', !!SUPABASE_KEY);

// Setup Supabase client
const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Setup test database connection and initialize tables
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  
  try {
    // Initialize the test database schema
    await initTestDatabase();
    console.log('Test database initialized successfully');
  } catch (error) {
    console.error('Test database initialization failed:', error);
  }
});

// Clear test data before each test
beforeEach(async () => {
  // Delete data in reverse order of dependencies
  await supabase.from('audit_logs').delete().neq('id', 0);
  await supabase.from('vital_signs').delete().neq('id', 0);
  await supabase.from('patient_notes').delete().neq('id', 0);
  await supabase.from('care_teams').delete().neq('id', 0);
  await supabase.from('treatments').delete().neq('id', 0);
  await supabase.from('patients').delete().neq('id', 0);
  await supabase.from('users').delete().neq('id', 0);
});

// Clean up after all tests
afterAll(async () => {
  await supabase.from('audit_logs').delete().neq('id', 0);
  await supabase.from('vital_signs').delete().neq('id', 0);
  await supabase.from('patient_notes').delete().neq('id', 0);
  await supabase.from('care_teams').delete().neq('id', 0);
  await supabase.from('treatment_plans').delete().neq('id', 0);
  await supabase.from('patients').delete().neq('id', 0);
  await supabase.from('users').delete().neq('id', 0);
});

// Extend Jest matchers
expect.extend({
  toBeAfter(received, expected) {
    const pass = new Date(received) > new Date(expected);
    return {
      message: () => `expected ${received} to be after ${expected}`,
      pass
    };
  }
});
