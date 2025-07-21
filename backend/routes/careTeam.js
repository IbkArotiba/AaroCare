const express = require('express');
const router = express.Router();
const {
assignCareTeam,
removeCareTeamMember,
updateCareTeamRole,
getCareTeam,
getAllPatientCareTeam,
getAllCareTeams
} = require('../controllers/careTeamController');
const checkPatientAccess = require('../middleware/checkPatientAccess');
const { authMiddleware, roleAuth } = require('../middleware/auth');

// Patient-specific routes FIRST
router.post('/patients/:id/care-team', authMiddleware, roleAuth(['doctor','nurse']), checkPatientAccess, assignCareTeam);
router.get('/patients/:id/care-team', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), checkPatientAccess, getAllPatientCareTeam);
router.put('/patients/:id/care-team/:memberId', authMiddleware, roleAuth(['doctor','nurse']), checkPatientAccess, updateCareTeamRole);
router.delete('/patients/:id/care-team/:memberId', authMiddleware, roleAuth(['doctor','nurse']), checkPatientAccess, removeCareTeamMember);

// Add the missing route that your frontend is trying to call
router.delete('/patients/:patientId/care-team/:memberId', authMiddleware, roleAuth(['doctor','nurse']), removeCareTeamMember);

// Care team member management routes - REMOVE checkPatientAccess
router.put('/members/:memberId', authMiddleware, roleAuth(['doctor','nurse']), updateCareTeamRole);
router.delete('/members/:memberId', authMiddleware, roleAuth(['doctor','nurse']), removeCareTeamMember);

// Root route LAST - NO checkPatientAccess needed
router.get('/', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), getAllCareTeams);

module.exports = router;