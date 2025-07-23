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

router.post('/patients/:id/care-team', authMiddleware, roleAuth(['doctor','nurse']), checkPatientAccess, assignCareTeam);
router.get('/patients/:id/care-team', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), checkPatientAccess, getAllPatientCareTeam);
router.put('/patients/:id/care-team/:memberId', authMiddleware, roleAuth(['doctor','nurse']), checkPatientAccess, updateCareTeamRole);
router.delete('/patients/:id/care-team/:memberId', authMiddleware, roleAuth(['doctor','nurse']), checkPatientAccess, removeCareTeamMember);


router.put('/members/:memberId', authMiddleware, roleAuth(['doctor','nurse']), updateCareTeamRole);
router.delete('/members/:memberId', authMiddleware, roleAuth(['doctor','nurse']), removeCareTeamMember);

router.get('/', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), getAllCareTeams);

module.exports = router;