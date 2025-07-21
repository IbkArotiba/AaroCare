const express = require('express');
const router = express.Router();


// Import middleware
const { authMiddleware } = require('../middleware/auth');

// Import controllers
const {
  totalPatients,
  totalPatientsAdmitted,
  totalPatientsDischarged
} = require('../controllers/patientController');

const {
  gettotalCriticalPatients
} = require('../controllers/notesController');

// Patient statistics routes
router.get('/patients/total', authMiddleware, totalPatients);
router.get('/patients/admissions', authMiddleware, totalPatientsAdmitted);
router.get('/patients/discharged', authMiddleware, totalPatientsDischarged);
router.get('/patients/critical', authMiddleware, gettotalCriticalPatients);

module.exports = router;