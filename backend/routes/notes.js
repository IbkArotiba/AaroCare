const express = require('express');
const router = express.Router();

const { 
    createPatientNote,
    getPatientsNotes,
    getSingleNote,
    updatePatientNote,
    deleteNote,
    lockNote,
    unlockNote,
    getAllNotes,
    gettotalCriticalPatients 
} = require('../controllers/notesController');
const checkPatientAccess = require('../middleware/checkPatientAccess');
const { authMiddleware, roleAuth } = require('../middleware/auth');

router.get('/', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), getAllNotes);
router.post('/patients/:id/notes', authMiddleware, roleAuth(['doctor','nurse']), checkPatientAccess, createPatientNote);

router.get('/patients/:id/notes', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), checkPatientAccess, getPatientsNotes);

router.get('/patients/:id/notes/:noteId', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), checkPatientAccess, getSingleNote);

router.put('/patients/:id/notes/:noteId', authMiddleware, roleAuth(['doctor','nurse']), checkPatientAccess, updatePatientNote);

router.delete('/patients/:id/notes/:noteId', authMiddleware, roleAuth(['doctor','nurse']), checkPatientAccess, deleteNote);

router.put('/patients/:id/notes/:noteId/lock', authMiddleware, roleAuth(['doctor','nurse']), checkPatientAccess, lockNote);

router.put('/patients/:id/notes/:noteId/unlock', authMiddleware, roleAuth(['doctor','nurse']), checkPatientAccess, unlockNote);

router.get('/total-critical-patients', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), gettotalCriticalPatients);

module.exports = router;
