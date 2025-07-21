const express = require('express');
const router = express.Router();

const { 
    getAllUsers 
} = require('../controllers/usersController');
const { authMiddleware, roleAuth } = require('../middleware/auth');

router.get('/', authMiddleware, roleAuth(['doctor', 'nurse', 'admin']), getAllUsers);

module.exports = router;
