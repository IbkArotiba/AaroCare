const { createClient } = require('@supabase/supabase-js');

// Use the environment variables we actually have available in .env
// Try non-prefixed variables first, then fall back to VITE_ prefixed ones
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

// Log environment variable status for debugging
console.log('[PatientAccess] SUPABASE_URL defined:', !!SUPABASE_URL);
console.log('[PatientAccess] SUPABASE_KEY defined:', !!SUPABASE_KEY);

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/**
 * Middleware to check if a user has access to a patient's data
 * Admins and doctors have access to all patients
 * Nurses only have access to patients in their care team
 */
const checkPatientAccess = async (req, res, next) => {
    const patientId = req.params.id;
    const user = req.user;

    try {
        // Admins and doctors have access to all patients
        if (['admin', 'doctor'].includes(user.role)) {
            return next();
        }

        // For nurses, check if they're in the patient's care team
        if (user.role === 'nurse') {
            const { data: careTeam, error } = await supabase
                .from('care_teams')
                .select('*')
                .eq('patient_id', patientId)
                .eq('user_id', user.id)
                .single();

            if (error || !careTeam) {
                return res.status(403).json({
                    status: 'error',
                    message: 'You do not have access to this patient\'s data'
                });
            }
        }

        next();
    } catch (error) {
        console.error('Error checking patient access:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error checking patient access'
        });
    }
};

module.exports = checkPatientAccess;
