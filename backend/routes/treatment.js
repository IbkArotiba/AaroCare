const express = require('express');
const router = express.Router();

const { createTreatmentPlan } = require('../controllers/treatmentController');
const { getTreatmentPlan } = require('../controllers/treatmentController');
const { updateTreatmentPlan } = require('../controllers/treatmentController');
const { getAllTreatmentPlans } = require('../controllers/treatmentController');
const { deleteTreatmentPlan } = require('../controllers/treatmentController');
const checkPatientAccess = require('../middleware/checkPatientAccess');
const { authMiddleware, roleAuth } = require('../middleware/auth');

// Original routes
router.post('/patients/:id/treatment', authMiddleware, roleAuth(['doctor']), checkPatientAccess, createTreatmentPlan);
router.get('/patients/:id/treatment', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), checkPatientAccess, getTreatmentPlan);
router.put('/patients/:id/treatment', authMiddleware, roleAuth(['doctor']), checkPatientAccess, updateTreatmentPlan);
router.delete('/patients/:id/treatment/:planId', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), checkPatientAccess, deleteTreatmentPlan);
router.get('/', 
    authMiddleware,
    roleAuth(['doctor', 'nurse', 'admin']), 
    getAllTreatmentPlans
);
// Routes expected by tests
router.post('/patients/:id', authMiddleware, roleAuth(['doctor']), checkPatientAccess, createTreatmentPlan);
router.get('/patients/:id', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), checkPatientAccess, getTreatmentPlan);
router.put('/patients/:id', authMiddleware, roleAuth(['doctor']), checkPatientAccess, updateTreatmentPlan);
router.delete('/patients/:id/treatment/:planId', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), checkPatientAccess, deleteTreatmentPlan);

module.exports = router;
