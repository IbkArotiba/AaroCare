const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Try non-prefixed variables first, then fall back to VITE_ prefixed ones
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

// Log for debugging
console.log('[TestHelpers] SUPABASE_URL defined:', !!SUPABASE_URL);
console.log('[TestHelpers] SUPABASE_KEY defined:', !!SUPABASE_KEY);

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Create a test user
async function createTestUser(role = 'doctor') {
    const userData = {
        email: `test.${Date.now()}@example.com`,
        first_name: 'Test',
        last_name: 'User',
        role: role,
        employee_id: `EMP${Date.now()}`,
        department: 'cardiology',
        password_hash: 'test_hash',
        is_active: true
    };

    const { data: user, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

    if (error) throw error;
    return user;
}

// Create a test patient
async function createTestPatient() {
    const patientData = {
        first_name: 'Test',
        last_name: 'Patient',
        date_of_birth: '1990-01-01',
        gender: 'M',
        room_number: '101',
        admission_date: new Date().toISOString(),
        primary_diagnosis: 'Test Condition',
        status: 'admitted'
    };

    const { data: patient, error } = await supabase
        .from('patients')
        .insert(patientData)
        .select()
        .single();

    if (error) throw error;
    return patient;
}

// Generate a JWT token for testing
function generateTestToken(user, role = 'doctor') {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: role,
            employee_id: user.employee_id
        },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
    );
}

// Assign a care team member
async function assignCareTeam(patientId, userId, role = 'primary') {
    const { data, error } = await supabase
        .from('care_team')
        .insert({
            patient_id: patientId,
            user_id: userId,
            role: role
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Record test vitals
async function recordTestVitals(patientId, userId) {
    const vitalsData = {
        patient_id: patientId,
        recorded_by: userId,
        temperature: 98.6,
        heart_rate: 75,
        blood_pressure: '120/80',
        respiratory_rate: 16,
        oxygen_saturation: 98
    };

    const { data, error } = await supabase
        .from('vitals')
        .insert(vitalsData)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Create a test note
async function createTestNote(patientId, userId) {
    const noteData = {
        patient_id: patientId,
        created_by: userId,
        content: 'Test note content',
        note_type: 'progress'
    };

    const { data, error } = await supabase
        .from('notes')
        .insert(noteData)
        .select()
        .single();

    if (error) throw error;
    return data;
}

module.exports = {
    createTestUser,
    createTestPatient,
    createTestToken: generateTestToken, // Alias for tests that use createTestToken
    generateTestToken,
    assignCareTeam,
    recordTestVitals,
    createTestNote
};
