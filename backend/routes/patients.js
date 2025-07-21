const express = require('express');
const router = express.Router();

// Import middleware
const { authMiddleware, roleAuth } = require('../middleware/auth');
const checkPatientAccess = require('../middleware/checkPatientAccess');

// Import controllers
const {
    getAllPatients,
    getPatientById,
    createPatient,
    updatePatient,
    dischargePatient
} = require('../controllers/patientController');

router.get('/', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), getAllPatients);

router.get('/:id', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), checkPatientAccess, getPatientById);

router.post('/', authMiddleware, roleAuth(['doctor', 'admin']), createPatient);

router.put('/:id', authMiddleware, roleAuth(['doctor','nurse', 'admin']), checkPatientAccess, updatePatient);

router.put('/:id/discharge', authMiddleware, roleAuth(['doctor','nurse', 'admin']), checkPatientAccess, dischargePatient);

module.exports = router;