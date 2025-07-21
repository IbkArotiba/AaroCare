const db = require('../config/database');

const getTreatmentPlan = async (req, res) => {
    try{
        const patientId = req.params.id;
        const created_by = req.user?.id || null;
        const updated_at = new Date();
        const createdAt = new Date();
        
        const treatmentPlan = await db.query(
            `SELECT 
            treatment_plans.id,
            treatment_plans.patient_id,
            treatment_plans.created_by,
            treatment_plans.created_at,
            treatment_plans.updated_at,
            treatment_plans.diagnosis,
            treatment_plans.treatment_goals,
            treatment_plans.medications,
            treatment_plans.procedures,
            treatment_plans.dietary_restrictions,
            treatment_plans.activity_level,
            treatment_plans.follow_up_instructions,
            treatment_plans.estimated_discharge_date,
            treatment_plans.status,
            patients.first_name,
            patients.last_name,
            patients.medical_record_number,
            users.first_name as doctor_first_name,
            users.last_name as doctor_last_name,
            users.role as doctor_role
            FROM treatment_plans
            JOIN patients ON treatment_plans.patient_id = patients.id
            JOIN users ON treatment_plans.created_by = users.id
            WHERE treatment_plans.patient_id = $1 
            AND treatment_plans.status = 'active'
            ORDER BY treatment_plans.created_at DESC`,
            [patientId]
        );

        if (treatmentPlan.rows.length === 0) {
            return res.status(404).json({message: 'No active treatment plan found for this patient'});
        }

        return res.status(200).json(treatmentPlan.rows);
    } catch(error) {
        console.error('Error fetching treatment plan:', error);
        return res.status(500).json({message: 'Failed to fetch treatment plan'});
    }
};

const createTreatmentPlan = async (req, res) => {
    try{
        const patientId = req.params.id;
        const created_by = req.user?.id || null;
        const updated_at = new Date();
        const createdAt = new Date();

        const {
        diagnosis, 
        treatment_goals, 
        medications, procedures, 
        dietary_restrictions, 
        activity_level, 
        follow_up_instructions, 
        estimated_discharge_date, 
        status} = req.body;

        const newTreatmentPlan = await db.query(
            `INSERT INTO treatment_plans (patient_id, created_by, updated_at, created_at, diagnosis, treatment_goals, medications, procedures, dietary_restrictions, activity_level, follow_up_instructions, estimated_discharge_date, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [patientId,created_by,updated_at,createdAt,diagnosis,treatment_goals,medications,procedures,dietary_restrictions,activity_level,follow_up_instructions,estimated_discharge_date,status]
        );
        const auditLog = await db.query(
            `INSERT INTO audit_logs (user_id, patient_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, session_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [req.user?.id || null, patientId, 'CREATE_TREATMENT_PLAN', 'treatment_plan', patientId, null, JSON.stringify(newTreatmentPlan.rows[0]), req.ip, req.get('User-Agent'), req.session_id || null, new Date()]
        );
        return res.status(201).json(newTreatmentPlan.rows[0]);
    }catch(error){
        console.error('Error creating treatment plan:', error);
        return res.status(500).json({message: 'Failed to create treatment plan'});
    }
};

const updateTreatmentPlan = async (req, res) => {
    try {
        const patientId = req.params.id;
        const updatedAt = new Date();
        const updatedBy = req.user.id;
        
        // Get current active treatment plan
        const currentTreatmentPlan = await db.query(
            `SELECT * FROM treatment_plans 
             WHERE patient_id = $1 AND status = 'active'`,
            [patientId]
        );

        if (currentTreatmentPlan.rows.length === 0) {
            return res.status(404).json({message: 'Active treatment plan not found'});
        }

        const currentPlan = currentTreatmentPlan.rows[0];
        
        const {
            diagnosis,
            treatment_goals,
            medications,
            procedures,
            dietary_restrictions,
            activity_level,
            follow_up_instructions,
            estimated_discharge_date,
        } = req.body;

        // STEP 1: Archive current plan (set status to 'superseded')
        await db.query(
            `UPDATE treatment_plans 
             SET status = 'superseded', 
                 superseded_at = $1,
                 superseded_by = $2
             WHERE id = $3`,
            [updatedAt, updatedBy, currentPlan.id]
        );

        // STEP 2: Create a new version of the treatment plan
        // Convert dates to proper format to ensure test compatibility
        const createdAt = new Date().toISOString();
        const newVersionNumber = currentPlan.version_number ? parseInt(currentPlan.version_number) + 1 : 1;
        
        const newVersion = await db.query(
            `INSERT INTO treatment_plans (
                patient_id, 
                parent_plan_id,
                version_number, 
                created_by,
                created_at, 
                updated_at, 
                diagnosis, 
                treatment_goals, 
                medications, 
                procedures, 
                dietary_restrictions, 
                activity_level, 
                follow_up_instructions, 
                estimated_discharge_date, 
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                patientId,
                currentPlan.id,
                newVersionNumber,
                updatedBy,
                createdAt,
                updatedAt,
                diagnosis || currentPlan.diagnosis,
                treatment_goals || currentPlan.treatment_goals,
                medications || currentPlan.medications,
                procedures || currentPlan.procedures,
                dietary_restrictions || currentPlan.dietary_restrictions,
                activity_level || currentPlan.activity_level,
                follow_up_instructions || currentPlan.follow_up_instructions,
                estimated_discharge_date || currentPlan.estimated_discharge_date,
                'active'
            ]
        );

        // STEP 3: Log the change in audit trail
        await db.query(
            `INSERT INTO audit_logs (
                user_id,
                patient_id,
                action,
                entity_type,
                entity_id,
                old_values,
                new_values,
                ip_address,
                user_agent,
                session_id,
                created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                updatedBy,
                patientId,
                'UPDATE_TREATMENT_PLAN',
                'treatment_plan',
                newVersion.rows[0].id,
                JSON.stringify(currentPlan),
                JSON.stringify(newVersion.rows[0]),
                req.ip,
                req.get('User-Agent'),
                req.session_id || null,
                updatedAt
            ]
        );

        return res.status(200).json({
            message: 'Treatment plan updated successfully with version history',
            treatmentPlan: newVersion.rows[0],
            previousVersion: currentPlan.id,
        });
    } catch (error) {
        console.error('Error updating treatment plan:', error);
        return res.status(500).json({message: 'Failed to update treatment plan'});
    }
};
const getAllTreatmentPlans = async (req, res) => {
    try {
      console.log('Fetching all vitals...');
      
      const vitals = await db.query(`
        SELECT 
          treatment_plans.id,
          treatment_plans.patient_id,
          treatment_plans.diagnosis,
          treatment_plans.treatment_goals,
          treatment_plans.medications,
          treatment_plans.procedures,
          treatment_plans.dietary_restrictions,
          treatment_plans.activity_level,
          treatment_plans.follow_up_instructions,
          treatment_plans.estimated_discharge_date,
          treatment_plans.status,
          treatment_plans.created_at,
          treatment_plans.created_by,
          treatment_plans.updated_at,
          users.first_name as doctor_first_name,
          users.last_name as doctor_last_name,
          users.role as doctor_role,
          patients.first_name,
          patients.last_name,
          patients.medical_record_number,
          patients.room_number,
          patients.status,
          patients.primary_diagnosis
        FROM treatment_plans
        LEFT JOIN patients ON treatment_plans.patient_id = patients.id
        LEFT JOIN users ON treatment_plans.created_by = users.id
        ORDER BY treatment_plans.created_at DESC
      `);
      
      console.log(`Found ${vitals.rows.length} vital records`);
      res.status(200).json(vitals.rows);
    } catch (error) {
      console.error('Error fetching all vitals:', error);
      res.status(500).json({ 
        message: 'Failed to fetch vitals',
        error: error.message 
      });
    }
};
const deleteTreatmentPlan = async (req, res) => {
    try {
        const planId = req.params.planId;
        const patientId = req.params.id;
        
        console.log(`Attempting to delete plan ${planId} for patient ${patientId}`);

        // First check if the plan exists
        const existingPlan = await db.query(
            `SELECT * FROM treatment_plans WHERE id = $1 AND patient_id = $2`,
            [planId, patientId]
        );

        if (existingPlan.rows.length === 0) {
            console.log(`Plan ${planId} not found for patient ${patientId}`);
            return res.status(404).json({ message: 'Plan not found' });
        }

        const plan = existingPlan.rows[0];
        
        // Delete the plan
        const result = await db.query(
            `DELETE FROM treatment_plans WHERE id = $1 AND patient_id = $2`,
            [planId, patientId]
        );
        
        console.log(`Plan ${planId} deleted successfully`);

        // Log the deletion action
        await db.query(
            `INSERT INTO audit_logs (user_id, patient_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, session_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [req.user?.id || null, patientId, 'DELETE_TREATMENT_PLAN', 'treatment_plan', planId, JSON.stringify(plan), null, req.ip, req.get('User-Agent'), req.session_id || null, new Date()]
        );

        return res.status(200).json({ message: 'Plan deleted successfully' });
    } catch (error) {
        console.error('Error deleting plan:', error);
        return res.status(500).json({ message: 'Failed to delete plan' });
    }
};

module.exports = {
    getTreatmentPlan,
    createTreatmentPlan,
    updateTreatmentPlan,
    deleteTreatmentPlan,
    getAllTreatmentPlans
};
