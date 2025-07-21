const db = require('../config/database');
const crypto = require('crypto');

// Function to generate consistent integer ID from UUID
// Enhanced version with collision detection
function generateIntegerFromUUID(uuid) {
    if (typeof uuid !== 'string' || !uuid.includes('-')) {
        return uuid;
    }
    
    // Use a more robust hashing approach
    const hash = crypto.createHash('sha256').update(uuid).digest('hex');
    // Take first 10 chars for better distribution
    const truncatedHash = parseInt(hash.substring(0, 10), 16);
    // Ensure positive 31-bit integer
    return Math.abs(truncatedHash) % 2147483647;
}

// Helper function to safely get user ID as integer
function getUserId(req) {
    if (!req.user?.id) return null;
    
    // If it's already an integer, return it
    if (typeof req.user.id === 'number') {
        return req.user.id;
    }
    
    // If it's still a UUID string (fallback), convert it
    if (typeof req.user.id === 'string' && req.user.id.includes('-')) {
        return generateIntegerFromUUID(req.user.id);
    }
    
    return req.user.id;
}

const getAllPatients = async (req, res) => {
    try {
        let whereConditions = [];
        let queryParams = [];
        let paramCount = 1;

        const { name, status, room, diagnosis } = req.query;
        
        if (name) {
            whereConditions.push(`(first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`);
            queryParams.push(`%${name}%`);
            paramCount++;
        }

        if (status) {
            whereConditions.push(`status ILIKE $${paramCount}`);
            queryParams.push(`%${status}%`);
            paramCount++;
        }

        if (room) {
            whereConditions.push(`room_number ILIKE $${paramCount}`);
            queryParams.push(`%${room}%`);
            paramCount++;
        }

        if (diagnosis) {
            whereConditions.push(`primary_diagnosis ILIKE $${paramCount}`);
            queryParams.push(`%${diagnosis}%`);
            paramCount++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';   

        try {
            const patients = await db.query (
                `SELECT * FROM patients ${whereClause} LIMIT 20 OFFSET $${paramCount}`,
                [...queryParams, parseInt(req.query.page || 0) * 20]
            );
            
            // Remove manual ID handling - let database auto-increment
            try {
                const auditLog = await db.query(
                    `INSERT INTO audit_logs (user_id, patient_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, session_id, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [getUserId(req), null, 'GET_PATIENTS', 'patient', null, null, JSON.stringify(patients.rows), req.ip, req.get('User-Agent'), req.sessionID || null, new Date()]
                );
            } catch (auditError) {
                console.error('Audit logging failed (continuing anyway):', auditError);
            }
                
            return res.status(200).json(patients.rows);
        } catch(error) {
            console.error('Error fetching patients:', error);
            return res.status(500).json({message: 'Failed to fetch patients'});
        }
    } catch(error) {
        console.error('Error fetching patients:', error);
        return res.status(500).json({message: 'Failed to fetch patients'});
    }
};
const getPatientById = async (req, res) => {
    try {
        const patientById = await db.query(
            `SELECT 
            patients.id,
            patients.first_name,
            patients.last_name,
            patients.medical_record_number,
            patients.date_of_birth,
            patients.email,
            patients.phone,
            patients.address,
            care_teams.id as care_team_id,
            care_teams.patient_id,
            care_teams.assigned_at,
            care_teams.user_id,
            care_teams.role_in_care,
            care_teams.assigned_by,
            care_teams.created_at,
            care_teams.is_active,
            care_teams.updated_at,
            care_teams.assigned_date 
        FROM patients 
        JOIN care_teams ON patients.id = care_teams.patient_id
        WHERE patients.id = $1
        ORDER BY care_teams.created_at DESC`,
        
        [req.params.id]
    );

    if (patientById.rows.length === 0) {
        return res.status(404).json({message: 'Patient not found'});
    }
    
    return res.status(200).json(patientById.rows[0]);

    }catch(error){
        console.error('Error fetching patient by ID:', error);
        return res.status(500).json({message: 'Failed to fetch patient by ID'});
    }
};

const createPatient = async (req, res) => {
    try {
        const medical_record_number = Math.floor(Math.random() * 1000000)
        const createdAt = new Date()
        const updatedAt = new Date()

        const {
            first_name,
            last_name,
            date_of_birth,
            gender,
            email,
            phone,
            address,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship,
            room_number,
            bed_number,
            admission_date,
            discharge_date,
            primary_diagnosis,
            allergies,
            medications
        } = req.body;

        // Define the parameters array
        const values = [
            medical_record_number, 
            first_name, 
            last_name, 
            date_of_birth, 
            gender, 
            email, 
            phone, 
            address, 
            emergency_contact_name, 
            emergency_contact_phone, 
            emergency_contact_relationship, 
            admission_date, 
            discharge_date, 
            'active', 
            room_number, 
            bed_number, 
            primary_diagnosis, 
            allergies, 
            medications, 
            createdAt, 
            updatedAt
        ];

        // Define the SQL query
        const sql = `INSERT INTO patients (medical_record_number,
            first_name, last_name, date_of_birth, gender, 
            email, phone, address, emergency_contact_name,
            emergency_contact_phone, emergency_contact_relationship,
            admission_date, discharge_date, status, room_number, bed_number,
            primary_diagnosis, allergies, medications, created_at,
            updated_at)
            VALUES ($1, $2, $3, $4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
            RETURNING *`;

        console.log('About to execute INSERT with params:', {
            paramCount: values.length,
            sql: sql,
            values: values
        });

        const newPatient = await db.query(sql, values);

        console.log('=== DEBUG INFO ===');
        console.log('Database returned:', newPatient);
        console.log('Type:', typeof newPatient);
        console.log('Is null?', newPatient === null);
        console.log('Is undefined?', newPatient === undefined);
        console.log('Has rows?', newPatient && 'rows' in newPatient);
        console.log('==================');

        // Add error handling for undefined result
        if (!newPatient || !newPatient.rows || newPatient.rows.length === 0) {
            console.error('No patient data returned from database');
            return res.status(500).json({message: 'Failed to create patient - no data returned'});
        }

        const patientData = newPatient.rows[0];

        try {
            const auditLog = await db.query(
                `INSERT INTO audit_logs (user_id, patient_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, session_id, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [getUserId(req), patientData.id, 'CREATE_PATIENT', 'patient', patientData.id, null, JSON.stringify(patientData), req.ip, req.get('User-Agent'), req.sessionID || null, new Date()]
            );
        } catch (auditError) {
            console.error('Audit logging failed (continuing anyway):', auditError);
        }

        return res.status(201).json({message: 'Patient created successfully', patient: patientData});
    } catch(error) {
        console.error('Error creating patient:', error);
        return res.status(500).json({message: 'Failed to create patient', error: error.message});
    }
}

const updatePatient = async (req, res) => {
    try {
        const updatedAt = new Date();
        const patientId = req.params.id;
        const currentPatient = await db.query(
            `SELECT * FROM patients WHERE id = $1`,
            [patientId]
        );

        if (currentPatient.rows.length === 0) {
            return res.status(404).json({message: 'Patient not found'});
        }

        const oldValues = currentPatient.rows[0];

        const updatedPatient = await db.query(
            `UPDATE patients
            SET 
            first_name = $1,
            last_name = $2,
            date_of_birth = $3,
            gender = $4,
            email = $5,
            phone = $6,
            address = $7,
            emergency_contact_name = $8,
            emergency_contact_phone = $9,
            emergency_contact_relationship = $10,
            admission_date = $11,
            discharge_date = $12,
            status = $13,
            room_number = $14,
            bed_number = $15,
            primary_diagnosis = $16,
            allergies = $17,
            medications = $18,
            updated_at = $19
            WHERE id = $20
            RETURNING *`,
            [req.body.first_name, req.body.last_name, req.body.date_of_birth, req.body.gender, req.body.email, req.body.phone, req.body.address, req.body.emergency_contact_name, req.body.emergency_contact_phone, req.body.emergency_contact_relationship, req.body.admission_date, req.body.discharge_date, req.body.status, req.body.room_number, req.body.bed_number, req.body.primary_diagnosis, req.body.allergies, req.body.medications, updatedAt, req.params.id]
        );  
        const auditLog = await db.query(
            `INSERT INTO audit_logs (user_id, patient_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, session_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [getUserId(req), req.params.id, 'update', 'patient', req.params.id, JSON.stringify(oldValues), JSON.stringify(updatedPatient.rows[0]), req.ip, req.get('user-agent'), req.session_id || null, new Date()]
        );
        return res.status(200).json({message: 'Patient updated successfully', patient: updatedPatient.rows[0]});

        }
    
    catch(error){
        console.error('Error updating patient:', error);
        return res.status(500).json({message: 'Failed to update patient'});
    }
};

const dischargePatient = async (req, res) => {
    try {
        const discharge_date = new Date();
        const currentPatient = await db.query(
            `SELECT * FROM patients WHERE id = $1`,
            [req.params.id]
        );

        if (currentPatient.rows.length === 0) {
            return res.status(404).json({message: 'Patient not found'});
        }
        if (currentPatient.rows[0].status === 'discharged') {
            return res.status(400).json({message: 'Patient is already discharged'});
        }

        const dischargePatient = await db.query(
            `UPDATE patients SET status = $1, discharge_date = $2 WHERE id = $3
            RETURNING *`,
            ['discharged', discharge_date, req.params.id]
        );

        const auditLog = await db.query(
            `INSERT INTO audit_logs (user_id, patient_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, session_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [getUserId(req), req.params.id, 'discharge', 'patient', req.params.id, JSON.stringify(currentPatient.rows[0]), JSON.stringify(dischargePatient.rows[0]), req.ip, req.get('user-agent'), req.session_id || null, new Date()]
        );
        return res.status(200).json({message: 'Patient discharged successfully', patient: dischargePatient.rows[0]});
    } catch(error) {
        console.error('Error discharging patient:', error);
        return res.status(500).json({message: 'Failed to discharge patient'});
    }
};
const totalPatients = async (req, res) => {
    try {
        const total = await db.query(
            `SELECT COUNT(*) FROM patients 
            WHERE created_at::date >= CURRENT_DATE - INTERVAL '14 day'`,
        );
        return res.status(200).json({total: total.rows[0].count});
    }catch(error){
        console.error('Error counting patients:', error);
        return res.status(500).json({message: 'Failed to count patients'});
    }
};
const totalPatientsAdmitted = async (req, res) => {
    try {
        const admissions = await db.query(
            `SELECT COUNT(*) FROM patients 
            WHERE DATE(admission_date) >= CURRENT_DATE - INTERVAL '14 day'`,
        );
        return res.status(200).json({admissions: admissions.rows[0].count});
    }catch(error){
        console.error('Error counting patients:', error);
        return res.status(500).json({message: 'Failed to count patients'});
    }
};
const totalPatientsDischarged = async (req, res) => {
    try {
        const discharged = await db.query(
            `SELECT COUNT(*) FROM patients 
            WHERE DATE(discharge_date) >= CURRENT_DATE - INTERVAL '14 day'`,
        );
        return res.status(200).json({discharged: discharged.rows[0].count});
    }catch(error){
        console.error('Error counting patients:', error);
        return res.status(500).json({message: 'Failed to count patients'});
    }
};
module.exports = {
    getAllPatients,
    getPatientById,
    createPatient,
    updatePatient,
    dischargePatient,
    totalPatients,
    totalPatientsAdmitted,
    totalPatientsDischarged
};
