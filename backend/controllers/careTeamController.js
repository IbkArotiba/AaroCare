const db = require('../config/database');

const getAllPatientCareTeam = async (req, res) => {
    try {
      const patientId = parseInt(req.params.id, 10);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ message: 'Invalid patient ID' });
      }
      
      // Get care team assignments
      const careTeamAssignments = await db.query(
        `SELECT * FROM care_teams 
         WHERE patient_id = $1 AND is_active = true
         ORDER BY assigned_at DESC`,
        [patientId]
      );
      
      if (careTeamAssignments.rows.length === 0) {
        return res.status(200).json([]); // Return empty array instead of 404
      }
      
      // Get user and patient details for each assignment
      const careTeamWithDetails = [];
      
      for (const assignment of careTeamAssignments.rows) {
        try {
          // Get user details
          const user = await db.query(
            `SELECT first_name as staff_first_name, last_name as staff_last_name, 
                    email as staff_email, role as staff_role
             FROM users WHERE id = $1`,
            [assignment.user_id]
          );
          
          // Get patient details
          const patient = await db.query(
            `SELECT first_name as patient_first_name, last_name as patient_last_name, 
                    medical_record_number
             FROM patients WHERE id = $1`,
            [assignment.patient_id]
          );
          
          if (user.rows.length > 0 && patient.rows.length > 0) {
            careTeamWithDetails.push({
              ...assignment,
              ...user.rows[0],
              ...patient.rows[0]
            });
          }
        } catch (detailError) {
          console.error(`Error fetching details for assignment ${assignment.id}:`, detailError);
        }
      }
      
      return res.status(200).json(careTeamWithDetails);
      
    } catch (error) {
      console.error('Error fetching care team by ID:', error);
      return res.status(500).json({ message: 'Failed to fetch care team' });
    }
};
const assignCareTeam = async (req, res) => {
    try{
        const patientId = parseInt(req.params.id, 10);
        const assigned_at = new Date().toISOString();
        const is_active = true;
        const user_id = req.body.user_id;
        const role_in_care = req.body.role_in_care;
        const assigned_by = req.user.id;
        
        const newCareTeam = await db.query(
        `INSERT INTO care_teams (patient_id, assigned_at, user_id, is_active, role_in_care, assigned_by) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [patientId, assigned_at, user_id, is_active, role_in_care, assigned_by]
    );
    const auditLog = await db.query(
        `INSERT INTO audit_logs (user_id, patient_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, session_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [req.user?.id || null, patientId, 'ASSIGN_CARE_TEAM', 'care_team', patientId, null, JSON.stringify(newCareTeam.rows[0]), req.ip, req.get('User-Agent'), req.session_id || null, new Date()]
    );
    return res.status(201).json({message: 'Care team assigned successfully', careTeam: newCareTeam.rows[0]});
    }catch(error){
        console.error('Error assigning care team:', error);
        return res.status(500).json({message: 'Failed to assign care team'});
    }
};

const getCareTeam = async (req, res) => {
    try {
      const patientId = parseInt(req.params.id, 10);
      
      // Validate patient ID
      if (isNaN(patientId)) {
        return res.status(400).json({ message: 'Invalid patient ID' });
      }
      
      console.log('Fetching care team for patient ID:', patientId);
      
      // First get care team assignments
      const careTeamAssignments = await db.query(
        `SELECT 
          id as care_team_id,
          patient_id,
          user_id,
          role_in_care,
          assigned_at,
          assigned_by,
          is_active,
          created_at,
          updated_at
        FROM care_teams 
        WHERE patient_id = $1 AND is_active = true
        ORDER BY assigned_at DESC`,
        [patientId]
      );
      
      console.log('Found care team assignments:', careTeamAssignments.rows.length);
      
      if (careTeamAssignments.rows.length === 0) {
        return res.status(404).json({message: 'Care team not found'});
      }
      
      // Then get user details for each assignment
      const careTeamWithUsers = [];
      
      for (const assignment of careTeamAssignments.rows) {
        try {
          const user = await db.query(
            `SELECT 
              id as user_id,
              first_name,
              last_name,
              email,
              phone,
              gender,
              employee_id,
              department,
              role,
              created_at as user_created_at,
              updated_at as user_updated_at,
              is_active as user_is_active,
              last_login
            FROM users 
            WHERE id = $1`,
            [assignment.user_id]
          );
          
          if (user.rows.length > 0) {
            // Combine assignment and user data
            careTeamWithUsers.push({
              // Care team assignment data
              care_team_id: assignment.care_team_id,
              patient_id: assignment.patient_id,
              role_in_care: assignment.role_in_care,
              assigned_at: assignment.assigned_at,
              assigned_by: assignment.assigned_by,
              is_active: assignment.is_active,
              care_created_at: assignment.created_at,
              care_updated_at: assignment.updated_at,
              
              // User data
              user_id: user.rows[0].user_id,
              first_name: user.rows[0].first_name,
              last_name: user.rows[0].last_name,
              email: user.rows[0].email,
              phone: user.rows[0].phone,
              gender: user.rows[0].gender,
              employee_id: user.rows[0].employee_id,
              department: user.rows[0].department,
              role: user.rows[0].role,
              user_created_at: user.rows[0].user_created_at,
              user_updated_at: user.rows[0].user_updated_at,
              user_is_active: user.rows[0].user_is_active,
              last_login: user.rows[0].last_login
            });
          } else {
            console.warn(`User with ID ${assignment.user_id} not found for care team assignment`);
          }
        } catch (userError) {
          console.error(`Error fetching user ${assignment.user_id}:`, userError);
          // Continue with other assignments even if one user fetch fails
        }
      }
      
      console.log('Final care team with users:', careTeamWithUsers.length);
      
      return res.status(200).json(careTeamWithUsers);
      
    } catch (error) {
      console.error('Error fetching care team by ID:', error);
      return res.status(500).json({ 
        message: 'Failed to fetch care team',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
};

const updateCareTeamRole = async (req, res) => {
    try {
        // Use ISO string format for dates to ensure consistent handling
        const updatedAt = new Date().toISOString();
        const careTeamId = parseInt(req.params.memberId, 10);
        const currentCareTeam = await db.query(
            `SELECT * FROM care_teams WHERE id = $1`,
            [careTeamId]
        );
        
        if (currentCareTeam.rows.length === 0) {
            return res.status(404).json({message: 'Care team not found'});
        }
        
        const oldValues = currentCareTeam.rows[0];
        
        const updatedCareTeam = await db.query(
            `UPDATE care_teams
                SET 
                role_in_care = $1,
                updated_at = $2,
                is_active = $3
                WHERE id = $4
                RETURNING *`,
            [req.body.role_in_care, updatedAt, true, careTeamId]
        );
        
        const auditLog = await db.query(
            `INSERT INTO audit_logs (user_id, patient_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, session_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [req.user?.id || null, oldValues.patient_id, 'UPDATE_CARE_TEAM_ROLE', 'care_team', careTeamId, JSON.stringify(oldValues), JSON.stringify(updatedCareTeam.rows[0]), req.ip, req.get('User-Agent'), req.session_id || null, new Date()]
        );
        
        return res.status(200).json({message: 'Care team updated successfully', careTeam: updatedCareTeam.rows[0]});
    }catch(error){
        console.error('Error updating care team:', error);
        return res.status(500).json({message: 'Failed to update care team'});
    }
};

const removeCareTeamMember = async (req, res) => {
    try {
        // Use ISO string format for dates to ensure consistent handling
        const updatedAt = new Date().toISOString();
        const memberId = parseInt(req.params.memberId, 10);
        const currentCareTeam = await db.query(
            `SELECT * FROM care_teams WHERE id = $1`,
            [memberId]
        );

        if (currentCareTeam.rows.length === 0) {
            return res.status(404).json({message: 'Care team member not found'});
        }
        
        if (currentCareTeam.rows[0].is_active === false) {
            return res.status(400).json({message: 'Care team member is already inactive'});
        }

        const removedCareTeamMember = await db.query(
            `UPDATE care_teams 
             SET is_active = $1, updated_at = $2 
             WHERE id = $3
             RETURNING *`,
            [false, updatedAt, memberId]
        );

        const auditLog = await db.query(
            `INSERT INTO audit_logs (user_id, patient_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, session_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [req.user?.id || null, currentCareTeam.rows[0].patient_id, 'REMOVE_CARE_TEAM_MEMBER', 'care_team', req.params.memberId, JSON.stringify(currentCareTeam.rows[0]), JSON.stringify(removedCareTeamMember.rows[0]), req.ip, req.get('User-Agent'), req.session_id || null, new Date()]
        );
        
        return res.status(200).json({message: 'Care team member removed successfully', careTeamMember: removedCareTeamMember.rows[0]});
    }catch(error){
        console.error('Error removing care team member:', error);
        return res.status(500).json({message: 'Failed to remove care team member'});
    }
};
// Add this new function to your controller
const getAllCareTeams = async (req, res) => {
  try {
    console.log('Getting all care teams...');
    
    // Get all active care team assignments - be more explicit about the boolean
    const allCareTeams = await db.query(
      `SELECT 
        id as care_team_id,
        patient_id,
        user_id,
        role_in_care,
        assigned_at,
        assigned_by,
        is_active,
        created_at,
        updated_at
      FROM care_teams 
      WHERE is_active = true
      ORDER BY assigned_at DESC`
    );
    
    console.log('Found care teams (before filtering):', allCareTeams.rows.length);
    
    // Add extra filtering just to be sure
    const activeCareTeams = allCareTeams.rows.filter(team => team.is_active === true);
    console.log('Found care teams (after filtering):', activeCareTeams.length);
      
      if (allCareTeams.rows.length === 0) {
        return res.status(200).json([]);
      }
      
      // Get user and patient details for each assignment
      const careTeamsWithDetails = [];
      
      for (const assignment of allCareTeams.rows) {
        try {
          // Get user details
          const user = await db.query(
            `SELECT first_name, last_name, email, role, department 
             FROM users WHERE id = $1`,
            [assignment.user_id]
          );
          
          // Get patient details
          const patient = await db.query(
            `SELECT first_name, last_name, medical_record_number 
             FROM patients WHERE id = $1`,
            [assignment.patient_id]
          );
          
          if (user.rows.length > 0 && patient.rows.length > 0) {
            careTeamsWithDetails.push({
              ...assignment,
              staff_first_name: user.rows[0].first_name,
              staff_last_name: user.rows[0].last_name,
              staff_email: user.rows[0].email,
              staff_role: user.rows[0].role,
              staff_department: user.rows[0].department,
              patient_first_name: patient.rows[0].first_name,
              patient_last_name: patient.rows[0].last_name,
              patient_medical_record_number: patient.rows[0].medical_record_number,
              is_active: assignment.is_active
            });
          }
        } catch (detailError) {
          console.error(`Error fetching details for assignment ${assignment.care_team_id}:`, detailError);
        }
      }
      
      return res.status(200).json(careTeamsWithDetails);
    } catch (error) {
      console.error('Error fetching all care teams:', error);
      return res.status(500).json({ message: 'Failed to fetch care teams' });
    }
};
  
module.exports = {
    assignCareTeam,
    getCareTeam,
    updateCareTeamRole,
    removeCareTeamMember,
    getAllPatientCareTeam,
    getAllCareTeams
};