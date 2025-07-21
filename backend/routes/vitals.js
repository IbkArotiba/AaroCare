const express = require('express');
const router = express.Router();


// Import controllers
const { 
    recordVitals, 
    getPatientVitals, 
    getVitalsHistory,
    getAllVitals
} = require('../controllers/vitalsController');

// Import middleware
const { authMiddleware, roleAuth } = require('../middleware/auth');
const checkPatientAccess = require('../middleware/checkPatientAccess');

// Routes

// Get all vitals (for all patients)
router.get('/', 
    authMiddleware,
    roleAuth(['doctor', 'nurse', 'admin']), 
    getAllVitals
);

router.post('/patients/:id/vitals', 
    authMiddleware, 
    roleAuth(['doctor', 'nurse']), 
    checkPatientAccess, 
    recordVitals
);

router.get('/patients/:id/vitals', 
    authMiddleware, 
    roleAuth(['doctor', 'nurse', 'admin']), 
    checkPatientAccess, 
    getPatientVitals
);

router.get('/patients/:id/vitals/history', 
    authMiddleware, 
    roleAuth(['doctor', 'nurse', 'admin']), 
    checkPatientAccess, 
    getVitalsHistory
);

module.exports = router;